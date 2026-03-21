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
  const { name, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = uuidv4();
  await execute(
    `INSERT INTO customers (id, name, email, phone, address, balance, company_id) VALUES ($1, $2, $3, $4, $5, 0, 'amha-default')`,
    [id, name, email || '', phone || '', address || '']
  );

  await eventStore.append({
    eventType: 'CUSTOMER_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'customer',
    entityId: id,
    payload: { name, email, phone, address, balance: 0 },
  });

  cache.del('dashboard:cache');
  res.status(201).json({ id, name, email, phone, address, balance: 0 });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const { name, email, phone, address } = req.body;
  await execute(
    'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4 WHERE id = $5',
    [name || existing.name, email || existing.email, phone || existing.phone, address || existing.address, req.params.id]
  );

  await eventStore.append({
    eventType: 'CUSTOMER_UPDATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'customer',
    entityId: req.params.id,
    payload: {
      before: { name: existing.name, email: existing.email, phone: existing.phone, address: existing.address },
      after: { name: name || existing.name, email: email || existing.email, phone: phone || existing.phone, address: address || existing.address },
    },
  });

  res.json({ id: req.params.id, name: name || existing.name, email: email || existing.email, phone: phone || existing.phone, address: address || existing.address });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM customers WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const [invCount, ordCount] = await Promise.all([
    queryOne('SELECT COUNT(*) as count FROM invoices WHERE customer_id = $1', [req.params.id]),
    queryOne('SELECT COUNT(*) as count FROM orders WHERE customer_id = $1', [req.params.id]),
  ]);
  if (parseInt(invCount.count) > 0 || parseInt(ordCount.count) > 0) {
    return res.status(409).json({ error: 'Cannot delete customer with existing invoices or orders. Delete those first.' });
  }

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
