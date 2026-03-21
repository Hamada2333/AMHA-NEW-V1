// ─── RECEIPTS API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM receipts ORDER BY created_at DESC'));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { vendor, amount, category, date } = req.body;
  if (!vendor || !amount) return res.status(400).json({ error: 'Vendor and amount are required' });

  const id = uuidv4();
  const jobId = uuidv4();

  await execute(
    `INSERT INTO receipts (id, vendor, date, amount, category, account, linked, processing_status, company_id) VALUES ($1, $2, $3, $4, $5, '', 0, 'processing', 'amha-default')`,
    [id, vendor, date || new Date().toISOString().split('T')[0], Number(amount), category || '']
  );

  await eventStore.append({
    eventType: 'RECEIPT_UPLOADED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'receipt',
    entityId: id,
    payload: { vendor, amount: Number(amount), category, date, jobId },
  });

  cache.del('dashboard:cache');
  res.status(201).json({
    id, vendor, amount: Number(amount), category, date,
    processingStatus: 'processing',
    jobId,
    message: 'Receipt uploaded, OCR processing...',
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM receipts WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Receipt not found' });
  const { vendor, date, amount, category, account } = req.body;
  await execute(
    'UPDATE receipts SET vendor = $1, date = $2, amount = $3, category = $4, account = $5 WHERE id = $6',
    [vendor || existing.vendor, date || existing.date, amount !== undefined ? Number(amount) : existing.amount, category ?? existing.category, account ?? existing.account, req.params.id]
  );
  res.json({ id: req.params.id, vendor: vendor || existing.vendor, date: date || existing.date, amount: amount !== undefined ? Number(amount) : existing.amount, category: category ?? existing.category, account: account ?? existing.account });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM receipts WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Receipt not found' });
  await execute('DELETE FROM receipts WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

export default router;
