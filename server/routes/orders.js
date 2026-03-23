// ─── ORDERS API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';

const router = Router();
const TAX_RATE = 0.05;

router.get('/', asyncHandler(async (_req, res) => {
  const orders = await query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items_json || '[]') })));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { customerId, items, notes, deliveryDate, paymentTerms, currency: reqCurrency } = req.body;

  const customer = await queryOne('SELECT * FROM customers WHERE id = $1', [customerId]);
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const currency = ['USD', 'EUR', 'AED'].includes(reqCurrency) ? reqCurrency : (customer.currency || 'USD');

  const countRow = await queryOne('SELECT COUNT(*) as count FROM orders');
  const orderCount = parseInt(countRow.count);
  const id = uuidv4();
  const number = `ORD-${String(2001 + orderCount).padStart(5, '0')}`;
  const date = new Date().toISOString().split('T')[0];
  const delivery = deliveryDate || '';
  const terms = paymentTerms || 'Net 30';

  const resolvedItems = (items || []).map(item => ({
    description: item.description || item.product || '',
    qty: Number(item.qty) || 0,
    unitPrice: Number(item.unitPrice || item.price) || 0,
    total: Math.round((Number(item.qty) || 0) * (Number(item.unitPrice || item.price) || 0) * 100) / 100,
  }));

  const subtotal = resolvedItems.reduce((s, it) => s + it.total, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  await execute(
    `INSERT INTO orders (id, number, customer_id, customer_name, date, subtotal, tax, total, status, items_json, currency, notes, delivery_date, payment_terms, company_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, 'amha-default')`,
    [id, number, customerId, customer.name, date, subtotal, tax, total, JSON.stringify(resolvedItems), currency, notes || '', delivery, terms]
  );

  await eventStore.append({
    eventType: 'ORDER_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'order',
    entityId: id,
    payload: { number, customer: customer.name, total, status: 'pending', items: resolvedItems },
  });

  cache.del('dashboard:cache');
  res.status(201).json({ id, number, customer: customer.name, customer_name: customer.name, customerId, date, subtotal, tax, total, status: 'pending', items: resolvedItems, currency, notes: notes || '', delivery_date: delivery, payment_terms: terms });
}));

// Convert order to invoice
router.put('/:id/invoice', asyncHandler(async (req, res) => {
  const order = await queryOne('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = JSON.parse(order.items_json || '[]');
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;

  const countRow = await queryOne('SELECT COUNT(*) as count FROM invoices');
  const invoiceCount = parseInt(countRow.count);
  const invId = uuidv4();
  const invNumber = `INV-${String(1001 + invoiceCount).padStart(5, '0')}`;
  const date = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  await execute(
    `INSERT INTO invoices (id, number, customer_id, customer_name, date, due_date, subtotal, tax, total, status, items_json, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, 'amha-default')`,
    [invId, invNumber, order.customer_id, order.customer_name, date, dueDate, subtotal, tax, total, JSON.stringify(items)]
  );

  await execute('UPDATE orders SET status = $1 WHERE id = $2', ['completed', order.id]);

  await eventStore.append({
    eventType: 'ORDER_CONVERTED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'order',
    entityId: order.id,
    payload: { number: order.number, invoiceNumber: invNumber, invoiceId: invId },
  });

  await eventStore.append({
    eventType: 'INVOICE_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'invoice',
    entityId: invId,
    payload: { number: invNumber, customer: order.customer_name, subtotal, tax, total, status: 'draft', items, fromOrder: order.number },
  });

  cache.del('dashboard:cache');
  res.json({ orderId: order.id, orderStatus: 'completed', invoiceId: invId, invoiceNumber: invNumber });
}));

router.put('/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  await execute('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ id: req.params.id, status });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM orders WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Order not found' });
  await execute('DELETE FROM orders WHERE id = $1', [req.params.id]);
  await eventStore.append({
    eventType: 'ORDER_DELETED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'order',
    entityId: req.params.id,
    payload: { deleted: true },
  });
  cache.del('dashboard:cache');
  res.json({ success: true });
}));

export default router;
