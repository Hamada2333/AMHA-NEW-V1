// ─── REPORT WORKER ───
import { v4 as uuidv4 } from 'uuid';
import eventBus from '../eventBus.js';
import eventStore from '../eventStore.js';
import cache from '../redis.js';

export function initReportWorker() {
  console.log('[Worker] Report worker initialized');

  eventBus.on('REPORT_REQUESTED', async (event) => {
    const { payload } = event;
    const jobId = payload.jobId || uuidv4();

    console.log(`[Worker] Generating report: ${payload.reportType}`);

    await cache.setProcessingState(jobId, {
      status: 'processing',
      type: 'report',
      reportType: payload.reportType,
      startedAt: new Date().toISOString(),
    });

    setTimeout(async () => {
      try {
        await eventStore.append({
          eventType: 'REPORT_GENERATED',
          userId: event.user_id,
          entityType: 'report',
          entityId: jobId,
          payload: {
            reportType: payload.reportType,
            generated_at: new Date().toISOString(),
            status: 'completed',
          },
        });

        await cache.setProcessingState(jobId, {
          status: 'completed',
          type: 'report',
          reportType: payload.reportType,
          completedAt: new Date().toISOString(),
        });

        console.log(`[Worker] Report generated: ${payload.reportType}`);
      } catch (err) {
        console.error(`[Worker] Report generation failed:`, err.message);
      }
    }, 3000);
  });
}

export default { initReportWorker };
