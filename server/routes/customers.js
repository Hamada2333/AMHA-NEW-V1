// ─── CUSTOMERS API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const customers = await query('SELECT * FROM customers ORDER BY created_at DESC');
  res.json(customers);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const customer = await queryOne('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, address, currency } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = uuidv4();
  const cur = ['USD', 'EUR', 'AED'].includes(currency) ? currency : 'USD';
  await execute(
    `INSERT INTO customers (id, name, email, phone, address, balance, currency, company_id) VALUES ($1, $2, $3, $4, $5, 0, $6, 'amha-default')`,
    [id, name, email || '', phone || '', address || '', cur]
  );

  await eventStore.append({
    eventType: 'CUSTOMER_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'customer',
    entityId: id,
    payload: { name, email, phone, address, balance: 0, currency: cur },
  });

  cache.del('dashboard:cache');
  res.status(201).json({ id, name, email, phone, address, balance: 0, currency: cur });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const { name, email, phone, address, currency } = req.body;
  const cur = ['USD', 'EUR', 'AED'].includes(currency) ? currency : (existing.currency || 'USD');
  await execute(
    'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4, currency = $5 WHERE id = $6',
    [name || existing.name, email || existing.email, phone || existing.phone, address || existing.address, cur, req.params.id]
  );

  await eventStore.append({
    eventType: 'CUSTOMER_UPDATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'customer',
    entityId: req.params.id,
    payload: {
      before: { name: existing.name, email: existing.email, currency: existing.currency },
      after: { name: name || existing.name, email: email || existing.email, currency: cur },
    },
  });

  res.json({ id: req.params.id, name: name || existing.name, email: email || existing.email, phone: phone || existing.phone, address: address || existing.address, currency: cur });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM customers WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  await execute('DELETE FROM invoices WHERE customer_id = $1', [req.params.id]);
  await execute('DELETE FROM orders WHERE customer_id = $1', [req.params.id]);
  await execute('DELETE FROM customers WHERE id = $1', [req.params.id]);
  await eventStore.append({
    eventType: 'CUSTOMER_DELETED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'customer',
    entityId: req.params.id,
    payload: { deleted: true },
  });
  cache.del('dashboard:cache');
  res.json({ success: true });
}));

export default router;
