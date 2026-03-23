// ─── INVOICES API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';

const router = Router();

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
  const { customerId, att, containerNumber, items, transportFees, tax: manualTax, currency: reqCurrency } = req.body;

  const customer = await queryOne('SELECT * FROM customers WHERE id = $1', [customerId]);
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const currency = ['USD', 'EUR', 'AED'].includes(reqCurrency) ? reqCurrency : (customer.currency || 'USD');

  const countRow = await queryOne('SELECT COUNT(*) as count FROM invoices');
  const invoiceCount = parseInt(countRow.count);
  const id = uuidv4();
  const number = `INV-${String(1001 + invoiceCount).padStart(5, '0')}`;
  const date = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const resolvedItems = (items || []).map(item => ({
    description: item.description || item.product || '',
    packaging: item.packaging || '',
    qty: Number(item.qty) || 0,
    nw: Number(item.nw) || 0,
    unitPrice: Number(item.unitPrice || item.price) || 0,
    total: Math.round((Number(item.qty) || 0) * (Number(item.unitPrice || item.price) || 0) * 100) / 100,
  }));

  const subtotal = resolvedItems.reduce((s, it) => s + it.total, 0);
  const fees = Number(transportFees) || 0;
  const tax = Number(manualTax) || 0;
  const total = Math.round((subtotal + fees + tax) * 100) / 100;

  await execute(
    `INSERT INTO invoices (id, number, customer_id, customer_name, att, container_number, date, due_date, subtotal, transport_fees, tax, total, status, items_json, currency, company_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13, $14, 'amha-default')`,
    [id, number, customerId, customer.name, att || '', containerNumber || '', date, dueDate, subtotal, fees, tax, total, JSON.stringify(resolvedItems), currency]
  );

  await eventStore.append({
    eventType: 'INVOICE_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: id,
    payload: { number, customer: customer.name, subtotal, tax, total, status: 'draft' },
  });

  cache.del('dashboard:cache');

  res.status(201).json({
    id, number, customer: customer.name, customer_name: customer.name, customerId,
    att: att || '', container_number: containerNumber || '',
    date, due_date: dueDate, subtotal, transport_fees: fees, tax, total,
    status: 'draft', items: resolvedItems, currency,
  });
}));

// PUT mark invoice as sent
router.put('/:id/send', asyncHandler(async (req, res) => {
  const inv = await queryOne('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  await execute('UPDATE invoices SET status = $1 WHERE id = $2', ['sent', inv.id]);

  await eventStore.append({
    eventType: 'INVOICE_SENT',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: inv.id,
    payload: { number: inv.number, customer: inv.customer_name },
  });

  cache.del('dashboard:cache');
  res.json({ status: 'sent', invoiceId: inv.id, number: inv.number });
}));

// PUT mark invoice as paid
router.put('/:id/pay', asyncHandler(async (req, res) => {
  const inv = await queryOne('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  await execute('UPDATE invoices SET status = $1 WHERE id = $2', ['paid', inv.id]);

  await eventStore.append({
    eventType: 'PAYMENT_RECEIVED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: inv.id,
    payload: { number: inv.number, customer: inv.customer_name, amount: inv.total },
  });

  cache.del('dashboard:cache');
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
