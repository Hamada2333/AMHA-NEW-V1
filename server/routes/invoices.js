// ─── INVOICES API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';

const router = Router();
const TAX_RATE = 0.05;

// GET all invoices
router.get('/', asyncHandler(async (_req, res) => {
  const invoices = await query('SELECT * FROM invoices ORDER BY created_at DESC');
  res.json(invoices.map(inv => ({ ...inv, items: JSON.parse(inv.items_json || '[]') })));
}));

// GET single invoice
router.get('/:id', asyncHandler(async (req, res) => {
  const inv = await queryOne('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  inv.items = JSON.parse(inv.items_json || '[]');
  res.json(inv);
}));

// GET invoice event history
router.get('/:id/history', asyncHandler(async (req, res) => {
  const events = await eventStore.getByEntity('invoice', req.params.id);
  res.json(events);
}));

// POST create invoice
router.post('/', asyncHandler(async (req, res) => {
  const { customerId, items } = req.body;

  const customer = await queryOne('SELECT * FROM customers WHERE id = $1', [customerId]);
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const countRow = await queryOne('SELECT COUNT(*) as count FROM invoices');
  const invoiceCount = parseInt(countRow.count);
  const id = uuidv4();
  const number = `INV-${String(1001 + invoiceCount).padStart(5, '0')}`;
  const date = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const resolvedItems = await Promise.all(items.map(async item => {
    const prod = await queryOne('SELECT * FROM products WHERE id = $1', [item.productId]);
    return { product: prod?.name || item.product, qty: Number(item.qty), price: prod?.price || Number(item.price) };
  }));

  const subtotal = resolvedItems.reduce((s, it) => s + it.qty * it.price, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;

  await execute(
    `INSERT INTO invoices (id, number, customer_id, customer_name, date, due_date, subtotal, tax, total, status, items_json, company_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, 'amha-default')`,
    [id, number, customerId, customer.name, date, dueDate, subtotal, tax, total, JSON.stringify(resolvedItems)]
  );

  const event = await eventStore.append({
    eventType: 'INVOICE_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: id,
    payload: { number, customer: customer.name, customerId, subtotal, tax, total, status: 'draft', items: resolvedItems },
  });

  cache.del('dashboard:cache');

  res.status(201).json({
    id, number, customer: customer.name, customerId, date, dueDate,
    subtotal, tax, total, status: 'draft', items: resolvedItems,
    _event: event.event_id,
  });
}));

// PUT send invoice (async via worker)
router.put('/:id/send', asyncHandler(async (req, res) => {
  const inv = await queryOne('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const jobId = uuidv4();

  await eventStore.append({
    eventType: 'INVOICE_SEND_REQUESTED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: inv.id,
    payload: { number: inv.number, customer: inv.customer_name, jobId, method: 'email' },
  });

  await cache.setProcessingState(jobId, {
    status: 'queued',
    type: 'invoice_send',
    entityId: inv.id,
    queuedAt: new Date().toISOString(),
  });

  res.json({
    status: 'processing',
    jobId,
    message: `Invoice ${inv.number} is being sent...`,
    _entityId: inv.id,
  });
}));

// PUT mark invoice as paid
router.put('/:id/pay', asyncHandler(async (req, res) => {
  const inv = await queryOne('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  await eventStore.append({
    eventType: 'PAYMENT_RECEIVED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: inv.id,
    payload: {
      number: inv.number,
      customer: inv.customer_name,
      amount: inv.total,
      method: req.body?.method || 'bank_transfer',
      before: { status: inv.status },
      after: { status: 'paid' },
    },
  });

  res.json({ status: 'paid', invoiceId: inv.id, number: inv.number });
}));

// PUT send payment reminder (async)
router.put('/:id/remind', asyncHandler(async (req, res) => {
  const inv = await queryOne('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const jobId = uuidv4();

  await eventStore.append({
    eventType: 'PAYMENT_REMINDER_REQUESTED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: inv.id,
    payload: { number: inv.number, customer: inv.customer_name, jobId },
  });

  res.json({
    status: 'processing',
    jobId,
    message: `Reminder for ${inv.number} is being sent...`,
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM invoices WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });
  await execute('DELETE FROM invoices WHERE id = $1', [req.params.id]);
  await eventStore.append({
    eventType: 'INVOICE_DELETED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: req.params.id,
    payload: { deleted: true },
  });
  cache.del('dashboard:cache');
  res.json({ success: true });
}));

export default router;
