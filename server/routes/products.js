// ─── PRODUCTS API ───
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db.js';
import eventStore from '../eventStore.js';
import asyncHandler from '../middleware/asyncHandler.js';
import cache from '../redis.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await query('SELECT * FROM products ORDER BY name ASC'));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, sku, price, stock, category } = req.body;
  if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required' });

  const id = uuidv4();
  await execute(
    `INSERT INTO products (id, name, sku, price, stock, category, company_id) VALUES ($1, $2, $3, $4, $5, $6, 'amha-default')`,
    [id, name, sku, Number(price) || 0, Number(stock) || 0, category || '']
  );

  await eventStore.append({
    eventType: 'PRODUCT_CREATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'product',
    entityId: id,
    payload: { name, sku, price: Number(price), stock: Number(stock), category },
  });

  cache.del('dashboard:cache');
  res.status(201).json({ id, name, sku, price: Number(price), stock: Number(stock), category });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const { name, sku, price, stock, category } = req.body;
  await execute(
    'UPDATE products SET name = $1, sku = $2, price = $3, stock = $4, category = $5 WHERE id = $6',
    [name || existing.name, sku || existing.sku, price !== undefined ? Number(price) : existing.price, stock !== undefined ? Number(stock) : existing.stock, category || existing.category, req.params.id]
  );
  await eventStore.append({
    eventType: 'PRODUCT_UPDATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'product',
    entityId: req.params.id,
    payload: { before: existing, after: { name, sku, price, stock, category } },
  });
  cache.del('dashboard:cache');
  res.json({ id: req.params.id, name: name || existing.name, sku: sku || existing.sku, price: price !== undefined ? Number(price) : existing.price, stock: stock !== undefined ? Number(stock) : existing.stock, category: category || existing.category });
}));

router.put('/:id/stock', asyncHandler(async (req, res) => {
  const product = await queryOne('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const newStock = Number(req.body.stock);
  await execute('UPDATE products SET stock = $1 WHERE id = $2', [newStock, req.params.id]);

  await eventStore.append({
    eventType: 'STOCK_UPDATED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'product',
    entityId: req.params.id,
    payload: {
      name: product.name,
      sku: product.sku,
      before: { stock: product.stock },
      after: { stock: newStock },
    },
  });

  res.json({ id: req.params.id, stock: newStock });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT id FROM products WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  await execute('DELETE FROM products WHERE id = $1', [req.params.id]);
  await eventStore.append({
    eventType: 'PRODUCT_DELETED',
    userId: req.headers['x-user-id'] || 'admin-default',
    entityType: 'product',
    entityId: req.params.id,
    payload: { deleted: true },
  });
  cache.del('dashboard:cache');
  res.json({ success: true });
}));

export default router;
