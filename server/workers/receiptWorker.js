// ─── RECEIPT WORKER ───
import { v4 as uuidv4 } from 'uuid';
import eventBus from '../eventBus.js';
import eventStore from '../eventStore.js';
import { execute } from '../db.js';
import cache from '../redis.js';

export function initReceiptWorker() {
  console.log('[Worker] Receipt worker initialized');

  eventBus.on('RECEIPT_UPLOADED', async (event) => {
    const { entity_id, payload } = event;
    const jobId = payload.jobId || uuidv4();

    console.log(`[Worker] Processing receipt: ${payload.vendor}`);

    await cache.setProcessingState(jobId, {
      status: 'processing',
      type: 'receipt_ocr',
      entityId: entity_id,
      startedAt: new Date().toISOString(),
    });

    setTimeout(async () => {
      try {
        await execute('UPDATE receipts SET processing_status = $1 WHERE id = $2', ['processed', entity_id]);

        await eventStore.append({
          eventType: 'RECEIPT_PROCESSED',
          userId: event.user_id,
          entityType: 'receipt',
          entityId: entity_id,
          payload: {
            vendor: payload.vendor,
            amount: payload.amount,
            processed_at: new Date().toISOString(),
            ocr_confidence: 0.95,
          },
        });

        await cache.setProcessingState(jobId, {
          status: 'completed',
          type: 'receipt_ocr',
          entityId: entity_id,
          completedAt: new Date().toISOString(),
        });

        console.log(`[Worker] Receipt processed: ${payload.vendor}`);
      } catch (err) {
        console.error(`[Worker] Receipt processing failed:`, err.message);
        try {
          await execute(
            `INSERT INTO dead_letter_queue (id, event_id, error, retry_count, next_retry) VALUES ($1, $2, $3, 0, NOW() + INTERVAL '5 minutes')`,
            [uuidv4(), event.event_id, err.message]
          );
        } catch (_) {}
      }
    }, 3000);
  });
}

export default { initReceiptWorker };
