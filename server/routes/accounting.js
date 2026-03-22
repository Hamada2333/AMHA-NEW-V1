// ─── ACCOUNTING API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

// GET chart of accounts + recent journal entries
router.get('/', asyncHandler(async (_req, res) => {
  const [chartOfAccounts, recentJournal] = await Promise.all([
    query('SELECT * FROM chart_of_accounts ORDER BY code ASC'),
    query('SELECT * FROM journal_entries ORDER BY date DESC, created_at DESC LIMIT 50'),
  ]);
  res.json({ chartOfAccounts, recentJournal });
}));

// GET all journal entries
router.get('/journal', asyncHandler(async (_req, res) => {
  const entries = await query('SELECT * FROM journal_entries ORDER BY date DESC, created_at DESC');
  res.json(entries);
}));

// POST create journal entry
router.post('/journal', asyncHandler(async (req, res) => {
  const { date, description, debit, credit, amount } = req.body;
  if (!description || !debit || !credit || !amount) {
    return res.status(400).json({ error: 'description, debit, credit, and amount are required' });
  }

  const id = uuidv4();
  const entryDate = date || new Date().toISOString().split('T')[0];

  await execute(
    `INSERT INTO journal_entries (id, date, description, debit, credit, amount, company_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'amha-default')`,
    [id, entryDate, description, debit, credit, Number(amount)]
  );

  await eventStore.append({
    eventType: 'JOURNAL_ENTRY_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'journal_entry',
    entityId: id,
    payload: { date: entryDate, description, debit, credit, amount: Number(amount) },
  });

  res.status(201).json({ id, date: entryDate, description, debit, credit, amount: Number(amount) });
}));

// DELETE journal entry
router.delete('/journal/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM journal_entries WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Journal entry not found' });

  await execute('DELETE FROM journal_entries WHERE id = $1', [req.params.id]);

  await eventStore.append({
    eventType: 'JOURNAL_ENTRY_DELETED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'journal_entry',
    entityId: req.params.id,
    payload: { deleted: true },
  });

  res.json({ success: true });
}));

// GET chart of accounts
router.get('/accounts', asyncHandler(async (_req, res) => {
  const accounts = await query('SELECT * FROM chart_of_accounts ORDER BY code ASC');
  res.json(accounts);
}));

// POST create account
router.post('/accounts', asyncHandler(async (req, res) => {
  const { code, name, type, balance } = req.body;
  if (!code || !name || !type) {
    return res.status(400).json({ error: 'code, name, and type are required' });
  }

  const existing = await queryOne('SELECT code FROM chart_of_accounts WHERE code = $1', [code]);
  if (existing) return res.status(409).json({ error: 'Account code already exists' });

  await execute(
    `INSERT INTO chart_of_accounts (code, name, type, balance, company_id) VALUES ($1, $2, $3, $4, 'amha-default')`,
    [code, name, type, Number(balance) || 0]
  );

  res.status(201).json({ code, name, type, balance: Number(balance) || 0 });
}));

export default router;
