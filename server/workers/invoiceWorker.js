// ─── INVOICE WORKER ───
import { v4 as uuidv4 } from 'uuid';
import eventBus from '../eventBus.js';
import eventStore from '../eventStore.js';
import { execute } from '../db.js';
import cache from '../redis.js';

export function initInvoiceWorker() {
  console.log('[Worker] Invoice worker initialized');

  // ─── Handle: Send Invoice ───
  eventBus.on('INVOICE_SEND_REQUESTED', async (event) => {
    const { entity_id, payload } = event;
    const jobId = payload.jobId || uuidv4();

    console.log(`[Worker] Processing invoice send: ${payload.number}`);

    await cache.setProcessingState(jobId, {
      status: 'processing',
      type: 'invoice_send',
      entityId: entity_id,
      startedAt: new Date().toISOString(),
    });

    setTimeout(async () => {
      try {
        await execute('UPDATE invoices SET status = $1 WHERE id = $2', ['sent', entity_id]);

        await eventStore.append({
          eventType: 'INVOICE_SENT',
          userId: event.user_id,
          entityType: 'invoice',
          entityId: entity_id,
          payload: {
            number: payload.number,
            sent_at: new Date().toISOString(),
            method: 'email',
            before: { status: 'draft' },
            after: { status: 'sent' },
          },
        });

        await cache.setProcessingState(jobId, {
          status: 'completed',
          type: 'invoice_send',
          entityId: entity_id,
          completedAt: new Date().toISOString(),
        });

        cache.del('dashboard:cache');
        console.log(`[Worker] Invoice ${payload.number} sent successfully`);
      } catch (err) {
        console.error(`[Worker] Invoice send failed:`, err.message);
        await cache.setProcessingState(jobId, {
          status: 'failed',
          type: 'invoice_send',
          entityId: entity_id,
          error: err.message,
        });
        await addToDeadLetterQueue(event, err);
      }
    }, 2000);
  });

  // ─── Handle: Payment Reminder ───
  eventBus.on('PAYMENT_REMINDER_REQUESTED', async (event) => {
    const { entity_id, payload } = event;
    const jobId = payload.jobId || uuidv4();

    console.log(`[Worker] Processing reminder: ${payload.number}`);

    await cache.setProcessingState(jobId, {
      status: 'processing',
      type: 'reminder',
      entityId: entity_id,
      startedAt: new Date().toISOString(),
    });

    setTimeout(async () => {
      try {
        await eventStore.append({
          eventType: 'REMINDER_SENT',
          userId: event.user_id,
          entityType: 'invoice',
          entityId: entity_id,
          payload: {
            number: payload.number,
            customer: payload.customer,
            sent_at: new Date().toISOString(),
            method: 'email',
          },
        });

        await cache.setProcessingState(jobId, {
          status: 'completed',
          type: 'reminder',
          entityId: entity_id,
          completedAt: new Date().toISOString(),
        });

        console.log(`[Worker] Reminder sent for ${payload.number}`);
      } catch (err) {
        console.error(`[Worker] Reminder failed:`, err.message);
        await addToDeadLetterQueue(event, err);
      }
    }, 1500);
  });

  // ─── Handle: Payment Received ───
  eventBus.on('PAYMENT_RECEIVED', async (event) => {
    const { entity_id } = event;

    try {
      await execute('UPDATE invoices SET status = $1 WHERE id = $2', ['paid', entity_id]);
      cache.del('dashboard:cache');
      console.log(`[Worker] Payment recorded for invoice ${entity_id}`);
    } catch (err) {
      console.error(`[Worker] Payment processing failed:`, err.message);
      await addToDeadLetterQueue(event, err);
    }
  });
}

async function addToDeadLetterQueue(event, error) {
  try {
    await execute(
      `INSERT INTO dead_letter_queue (id, event_id, error, retry_count, next_retry) VALUES ($1, $2, $3, 0, NOW() + INTERVAL '5 minutes')`,
      [uuidv4(), event.event_id, error.message]
    );
  } catch (err) {
    console.error('[Worker] Failed to add to DLQ:', err.message);
  }
}

export default { initInvoiceWorker };
