// ─── DASHBOARD API ───
import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';
import eventStore from '../eventStore.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const MONTHLY_REVENUE = [42000, 38500, 51200, 47800, 55600, 62100, 58400, 67200, 71500, 64800, 73200, 81400];
const MONTHLY_EXPENSES = [28000, 25200, 33100, 31400, 35800, 39200, 37600, 42100, 44800, 40200, 45600, 50800];

router.get('/', asyncHandler(async (_req, res) => {
  const cached = await cache.getCachedDashboard();
  if (cached) return res.json({ ...cached, _cached: true });

  const [paid, sent, overdue, draft, recentInvoices, productCountRow, lowStockCountRow, customerCountRow] = await Promise.all([
    queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid'"),
    queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'sent'"),
    queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'overdue'"),
    queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'draft'"),
    query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5'),
    queryOne('SELECT COUNT(*) as count FROM products'),
    queryOne('SELECT COUNT(*) as count FROM products WHERE stock < 300'),
    queryOne('SELECT COUNT(*) as count FROM customers'),
  ]);

  const invoiceStats = { paid, sent, overdue, draft };
  const totalRevenue = MONTHLY_REVENUE.reduce((a, b) => a + b, 0);
  const totalExpenses = MONTHLY_EXPENSES.reduce((a, b) => a + b, 0);
  const outstanding = Number(sent.total) + Number(overdue.total);
  const recentEvents = await eventStore.getRecent(10);
  const eventCount = await eventStore.getCount();

  const dashboard = {
    revenue: { total: totalRevenue, monthly: MONTHLY_REVENUE, change: 12.4 },
    expenses: { total: totalExpenses, monthly: MONTHLY_EXPENSES, change: 8.2 },
    netProfit: totalRevenue - totalExpenses,
    outstanding,
    invoiceStats,
    recentInvoices: recentInvoices.map(inv => ({ ...inv, items: JSON.parse(inv.items_json || '[]') })),
    recentEvents,
    productCount: parseInt(productCountRow.count),
    lowStockCount: parseInt(lowStockCountRow.count),
    customerCount: parseInt(customerCountRow.count),
    eventCount,
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    cashFlow: MONTHLY_REVENUE.map((r, i) => r - MONTHLY_EXPENSES[i]),
  };

  await cache.cacheDashboard(dashboard);
  res.json(dashboard);
}));

// Accounting data
router.get('/accounting', asyncHandler(async (_req, res) => {
  const [journal, chart] = await Promise.all([
    query('SELECT * FROM journal_entries ORDER BY date ASC'),
    query('SELECT * FROM chart_of_accounts ORDER BY code ASC'),
  ]);
  res.json({ journal, chart });
}));

// CRM leads
router.get('/leads', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM leads ORDER BY created_at DESC'));
}));

router.post('/leads', asyncHandler(async (req, res) => {
  const { name, contact, email, phone, status, value, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = uuidv4();
  const lastContact = new Date().toISOString().split('T')[0];

  await execute(
    `INSERT INTO leads (id, name, contact, email, phone, status, value, notes, last_contact, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'amha-default')`,
    [id, name, contact || '', email || '', phone || '', status || 'new', Number(value) || 0, notes || '', lastContact]
  );

  await eventStore.append({
    eventType: 'LEAD_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'lead',
    entityId: id,
    payload: { name, contact, email, status: status || 'new', value: Number(value) },
  });

  res.status(201).json({ id, name, contact, email, phone, status: status || 'new', value: Number(value), notes, last_contact: lastContact });
}));

router.put('/leads/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const lead = await queryOne('SELECT * FROM leads WHERE id = $1', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  await execute(
    'UPDATE leads SET status = $1, last_contact = $2 WHERE id = $3',
    [status, new Date().toISOString().split('T')[0], req.params.id]
  );

  await eventStore.append({
    eventType: 'LEAD_STATUS_UPDATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'lead',
    entityId: req.params.id,
    payload: { name: lead.name, before: { status: lead.status }, after: { status } },
  });

  res.json({ id: req.params.id, status });
}));

router.put('/leads/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM leads WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });
  const { name, contact, email, phone, status, value, notes } = req.body;
  await execute(
    'UPDATE leads SET name = $1, contact = $2, email = $3, phone = $4, status = $5, value = $6, notes = $7, last_contact = $8 WHERE id = $9',
    [name || existing.name, contact ?? existing.contact, email ?? existing.email, phone ?? existing.phone, status || existing.status, value !== undefined ? Number(value) : existing.value, notes ?? existing.notes, new Date().toISOString().split('T')[0], req.params.id]
  );
  await eventStore.append({
    eventType: 'LEAD_STATUS_UPDATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'lead',
    entityId: req.params.id,
    payload: { before: existing, after: req.body },
  });
  res.json({ id: req.params.id, ...existing, ...req.body });
}));

router.delete('/leads/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM leads WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });
  await execute('DELETE FROM leads WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

export default router;
