// ─── REPORTS API ───
import { Router } from 'express';
import { query, queryOne } from '../db.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.post('/generate', asyncHandler(async (req, res) => {
  const { reportId } = req.body;

  const [invoices, products, customers] = await Promise.all([
    query('SELECT * FROM invoices'),
    query('SELECT * FROM products'),
    query('SELECT * FROM customers'),
  ]);

  const paid = invoices.filter(i => i.status === 'paid');
  const sent = invoices.filter(i => i.status === 'sent');
  const overdue = invoices.filter(i => i.status === 'overdue');
  const revenue = paid.reduce((s, i) => s + Number(i.total || 0), 0);
  const outstanding = [...sent, ...overdue].reduce((s, i) => s + Number(i.total || 0), 0);
  const tax = paid.reduce((s, i) => s + Number(i.tax || 0), 0);

  const reports = {
    pl: {
      name: 'Profit & Loss Statement',
      revenue,
      tax,
      net: revenue - tax,
      invoiceCount: paid.length,
    },
    bs: {
      name: 'Balance Sheet',
      assets: { cash: revenue, receivables: outstanding },
      totalAssets: revenue + outstanding,
    },
    cf: {
      name: 'Cash Flow Analysis',
      inflows: revenue,
      outstanding,
      net: revenue - outstanding,
    },
    tx: {
      name: 'Tax / VAT Summary',
      taxableRevenue: revenue,
      vatCollected: tax,
      vatRate: '5%',
    },
    iv: {
      name: 'Inventory Valuation',
      items: products.map(p => ({ name: p.name, stock: p.stock, price: p.price, value: Number(p.stock) * Number(p.price) })),
      totalValue: products.reduce((s, p) => s + Number(p.stock) * Number(p.price), 0),
    },
    ar: {
      name: 'A/R Aging Report',
      outstanding: [...sent, ...overdue].map(i => ({ number: i.number, customer: i.customer_name, total: i.total, status: i.status, dueDate: i.due_date })),
      totalOutstanding: outstanding,
      customerCount: customers.length,
    },
  };

  const data = reports[reportId];
  if (!data) return res.status(400).json({ error: 'Unknown report type' });

  res.json({ success: true, reportId, generatedAt: new Date().toISOString(), data });
}));

export default router;
