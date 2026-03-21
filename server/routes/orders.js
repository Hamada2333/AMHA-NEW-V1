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
  const { customerId, items } = req.body;

  const customer = await queryOne('SELECT * FROM customers WHERE id = $1', [customerId]);
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const countRow = await queryOne('SELECT COUNT(*) as count FROM orders');
  const orderCount = parseInt(countRow.count);
  const id = uuidv4();
  const number = `ORD-${String(2001 + orderCount).padStart(5, '0')}`;
  const date = new Date().toISOString().split('T')[0];

  const resolvedItems = await Promise.all(items.map(async item => {
    const prod = await queryOne('SELECT * FROM products WHERE id = $1', [item.productId]);
    return { product: prod?.name || item.product, qty: Number(item.qty), price: prod?.price || Number(item.price) };
  }));

  const total = resolvedItems.reduce((s, it) => s + it.qty * it.price, 0) * (1 + TAX_RATE);

  await execute(
    `INSERT INTO orders (id, number, customer_id, customer_name, date, total, status, items_json, company_id) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, 'amha-default')`,
    [id, number, customerId, customer.name, date, Math.round(total * 100) / 100, JSON.stringify(resolvedItems)]
  );

  await eventStore.append({
    eventType: 'ORDER_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'order',
    entityId: id,
    payload: { number, customer: customer.name, total, status: 'pending', items: resolvedItems },
  });

  cache.del('dashboard:cache');
  res.status(201).json({ id, number, customer: customer.name, customerId, date, total, status: 'pending', items: resolvedItems });
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
