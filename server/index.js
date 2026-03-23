// ─── AMHA ERP SERVER ───
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import { initSchema, query, queryOne, execute } from './db.js';
import eventBus from './eventBus.js';
import eventStore from './eventStore.js';
import cache from './redis.js';

import { auditMiddleware } from './middleware/audit.js';

import invoiceRoutes from './routes/invoices.js';
import customerRoutes from './routes/customers.js';
import supplierRoutes from './routes/suppliers.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import receiptRoutes from './routes/receipts.js';
import eventRoutes from './routes/events.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import attachmentRoutes from './routes/attachments.js';
import accountingRoutes from './routes/accounting.js';

import { initInvoiceWorker } from './workers/invoiceWorker.js';
import { initReportWorker } from './workers/reportWorker.js';
import { initReceiptWorker } from './workers/receiptWorker.js';

import seedDatabase from './seed.js';

const PORT = process.env.PORT || 3001;

// ─── EXPRESS APP ───
const app = express();
app.use(cors());
app.use(express.json());
app.use(auditMiddleware);

// ─── API ROUTES ───
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/accounting', accountingRoutes);

// ─── ADMIN: Clear accounting + CRM data ───
app.delete('/api/admin/clear-accounting-crm', async (_req, res) => {
  try {
    await execute('DELETE FROM journal_entries');
    await execute('DELETE FROM chart_of_accounts');
    await execute('DELETE FROM leads');
    console.log('[Admin] Cleared accounting and CRM data');
    res.json({ success: true, cleared: ['journal_entries', 'chart_of_accounts', 'leads'] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK ───
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    eventBus: eventBus.getMetrics(),
    cache: cache.getStats(),
    eventCount: await eventStore.getCount(),
  });
});

// ─── ERROR HANDLER ───
app.use((err, req, res, _next) => {
  console.error('[API Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
  });
});

// ─── HTTP + WEBSOCKET SERVER ───
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  ws.send(JSON.stringify({
    type: 'CONNECTED',
    timestamp: new Date().toISOString(),
    message: 'Connected to AMHA ERP real-time feed',
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clients.delete(ws);
  });
});

// ─── BROADCAST: All events → WebSocket clients ───
eventBus.on('*', async (event) => {
  if (event.event_type === 'API_REQUEST') return;

  const message = JSON.stringify({
    type: event.event_type,
    timestamp: event.timestamp || new Date().toISOString(),
    entityType: event.entity_type,
    entityId: event.entity_id,
    payload: event.payload,
  });

  for (const client of clients) {
    try {
      if (client.readyState === 1) {
        client.send(message);
      }
    } catch (err) {
      console.error('[WS] Broadcast error:', err.message);
    }
  }
});

// ─── DEAD LETTER RETRY LOOP ───
setInterval(async () => {
  try {
    const failed = await query(`
      SELECT * FROM dead_letter_queue
      WHERE resolved = 0 AND retry_count < max_retries AND next_retry <= NOW()
      LIMIT 10
    `);

    for (const item of failed) {
      console.log(`[DLQ] Retrying event ${item.event_id} (attempt ${item.retry_count + 1})`);
      const event = await queryOne('SELECT * FROM events WHERE event_id = $1', [item.event_id]);
      if (event) {
        eventBus.emit(event.event_type, { ...event, payload: JSON.parse(event.payload) });
        await execute(
          `UPDATE dead_letter_queue SET retry_count = retry_count + 1, next_retry = NOW() + INTERVAL '10 minutes' WHERE id = $1`,
          [item.id]
        );
      }
    }
  } catch (err) {
    // Silent — retry loop should never crash
  }
}, 60000);

// ─── DEAD LETTER QUEUE: Error handler ───
eventBus.onError(async ({ eventType, event, error }) => {
  console.error(`[DLQ] Event ${eventType} failed:`, error);
  try {
    await execute(
      `INSERT INTO dead_letter_queue (id, event_id, error, retry_count, next_retry) VALUES ($1, $2, $3, 0, NOW() + INTERVAL '5 minutes')`,
      [uuidv4(), event.event_id, error]
    );
  } catch (err) {
    console.error('[DLQ] Failed to record:', err.message);
  }
});

// ─── STARTUP ───
async function start() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   AMHA FOOD & STUFF TRADING L.L.C              ║');
  console.log('║   Enterprise Resource Planning System           ║');
  console.log('║   Event-Driven Architecture v2.0                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('[Boot] Initializing database schema...');
  await initSchema();

  console.log('[Boot] Checking seed data...');
  await seedDatabase();

  console.log('[Boot] Starting background workers...');
  initInvoiceWorker();
  initReportWorker();
  initReceiptWorker();

  server.listen(PORT, () => {
    console.log(`\n[Server] REST API: http://localhost:${PORT}/api`);
    console.log(`[Server] WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`[Server] Health:    http://localhost:${PORT}/api/health`);
    console.log(`\n[Ready] System operational\n`);
  });
}

start().catch(err => {
  console.error('[Fatal]', err);
  process.exit(1);
});
