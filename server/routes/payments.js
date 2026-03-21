// ─── PAYMENTS API ───
import { Router } from 'express';
import { query, queryOne } from '../db.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/outstanding', asyncHandler(async (_req, res) => {
  const invoices = await query("SELECT * FROM invoices WHERE status IN ('sent', 'overdue') ORDER BY due_date ASC");
  res.json(invoices.map(inv => ({ ...inv, items: JSON.parse(inv.items_json || '[]') })));
}));

router.get('/overdue', asyncHandler(async (_req, res) => {
  const invoices = await query("SELECT * FROM invoices WHERE status = 'overdue' ORDER BY due_date ASC");
  res.json(invoices.map(inv => ({ ...inv, items: JSON.parse(inv.items_json || '[]') })));
}));

router.get('/summary', asyncHandler(async (_req, res) => {
  const [outstanding, overdue, collected] = await Promise.all([
    queryOne("SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status IN ('sent', 'overdue')"),
    queryOne("SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'overdue'"),
    queryOne("SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid'"),
  ]);

  res.json({
    outstanding: Number(outstanding.total),
    overdue: Number(overdue.total),
    collected: Number(collected.total),
  });
}));

export default router;
