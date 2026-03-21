// ─── ATTACHMENTS API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

const MAX_SIZE = 10 * 1024 * 1024; // 10MB base64 limit

// GET all attachments for an entity
router.get('/:entityType/:entityId', asyncHandler(async (req, res) => {
  const rows = await query(
    'SELECT id, entity_type, entity_id, filename, mimetype, size, created_at FROM attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
    [req.params.entityType, req.params.entityId]
  );
  res.json(rows);
}));

// GET single attachment (serve file)
router.get('/file/:id', asyncHandler(async (req, res) => {
  const row = await queryOne('SELECT * FROM attachments WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Attachment not found' });
  const buffer = Buffer.from(row.data, 'base64');
  res.setHeader('Content-Type', row.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${row.filename}"`);
  res.send(buffer);
}));

// POST upload attachment (base64 JSON body)
router.post('/', asyncHandler(async (req, res) => {
  const { entityType, entityId, filename, mimetype, data } = req.body;
  if (!entityType || !entityId || !filename || !data) {
    return res.status(400).json({ error: 'entityType, entityId, filename, and data are required' });
  }
  if (data.length > MAX_SIZE * 1.37) { // base64 is ~37% larger
    return res.status(413).json({ error: 'File too large. Max 10MB.' });
  }
  const id = uuidv4();
  const size = Math.round(data.length * 0.75); // approx decoded size
  await execute(
    'INSERT INTO attachments (id, entity_type, entity_id, filename, mimetype, size, data) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, entityType, entityId, filename, mimetype || 'application/octet-stream', size, data]
  );
  res.status(201).json({ id, entityType, entityId, filename, mimetype, size, created_at: new Date().toISOString() });
}));

// DELETE attachment
router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM attachments WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Attachment not found' });
  await execute('DELETE FROM attachments WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

export default router;
