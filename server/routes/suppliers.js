// ─── SUPPLIERS API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM suppliers ORDER BY created_at DESC'));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, address, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = uuidv4();
  await execute(
    `INSERT INTO suppliers (id, name, email, phone, address, category, company_id) VALUES ($1, $2, $3, $4, $5, $6, 'amha-default')`,
    [id, name, email || '', phone || '', address || '', category || '']
  );

  await eventStore.append({
    eventType: 'SUPPLIER_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'supplier',
    entityId: id,
    payload: { name, email, phone, address, category },
  });

  res.status(201).json({ id, name, email, phone, address, category });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });
  const { name, email, phone, address, category } = req.body;
  await execute(
    'UPDATE suppliers SET name = $1, email = $2, phone = $3, address = $4, category = $5 WHERE id = $6',
    [name || existing.name, email ?? existing.email, phone ?? existing.phone, address ?? existing.address, category || existing.category, req.params.id]
  );
  await eventStore.append({
    eventType: 'SUPPLIER_UPDATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'supplier',
    entityId: req.params.id,
    payload: { before: existing, after: { name, email, phone, address, category } },
  });
  res.json({ id: req.params.id, name: name || existing.name, email: email ?? existing.email, phone: phone ?? existing.phone, address: address ?? existing.address, category: category || existing.category });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM suppliers WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });
  await execute('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
  await eventStore.append({
    eventType: 'SUPPLIER_DELETED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'supplier',
    entityId: req.params.id,
    payload: { deleted: true },
  });
  res.json({ success: true });
}));

export default router;
