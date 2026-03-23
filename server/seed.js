// ─── SEED DATA ───
import { queryOne, execute } from './db.js';
import eventStore from './eventStore.js';
import { v4 as uuidv4 } from 'uuid';

const COMPANY_ID = 'amha-default';
const USER_ID = 'admin-default';
const TAX_RATE = 0.05;

export async function seedDatabase() {
  const existing = await queryOne('SELECT COUNT(*) as count FROM customers');
  if (parseInt(existing.count) > 0) {
    console.log('[Seed] Database already seeded, skipping...');
    return;
  }

  console.log('[Seed] Populating database...');

  // ─── Company ───
  await execute(
    `INSERT INTO companies (id, name, trn, address, email, phone) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [COMPANY_ID, 'AMHA FOOD & STUFF TRADING L.L.C', '100XXXXXXXXX', 'Sharjah, UAE', 'info@amhafood.ae', '+971 6 XXX XXXX']
  );

  // ─── User ───
  await execute(
    `INSERT INTO users (id, name, email, role, company_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
    [USER_ID, 'Admin User', 'admin@amhafood.ae', 'Administrator', COMPANY_ID]
  );

  // ─── Customers ───
  const customers = [
    { id: uuidv4(), name: 'Al Rayyan Trading LLC', email: 'info@alrayyan.ae', phone: '+971 4 555 1234', address: 'Dubai, UAE', balance: 15200 },
    { id: uuidv4(), name: 'Gulf Fresh Foods', email: 'orders@gulffresh.ae', phone: '+971 6 555 5678', address: 'Sharjah, UAE', balance: 8400 },
    { id: uuidv4(), name: 'Emirates Wholesale Co', email: 'buy@emirateswholesale.ae', phone: '+971 2 555 9012', address: 'Abu Dhabi, UAE', balance: 23100 },
    { id: uuidv4(), name: 'Horizon Supermarkets', email: 'procurement@horizon.ae', phone: '+971 4 555 3456', address: 'Dubai, UAE', balance: 5600 },
    { id: uuidv4(), name: 'Desert Palm Catering', email: 'supply@desertpalm.ae', phone: '+971 7 555 7890', address: 'Ras Al Khaimah, UAE', balance: 11800 },
  ];

  for (const c of customers) {
    await execute(
      `INSERT INTO customers (id, name, email, phone, address, balance, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, c.email, c.phone, c.address, c.balance, COMPANY_ID]
    );
    await eventStore.append({
      eventType: 'CUSTOMER_CREATED', userId: USER_ID, entityType: 'customer', entityId: c.id,
      payload: { name: c.name, email: c.email, phone: c.phone, address: c.address, balance: c.balance },
    });
  }

  // ─── Suppliers ───
  const suppliers = [
    { id: uuidv4(), name: 'Global Food Imports Ltd', email: 'sales@globalfood.com', phone: '+971 4 666 1111', address: 'Jebel Ali, Dubai', category: 'Food & Beverages' },
    { id: uuidv4(), name: 'Arabian Spice Trading', email: 'info@arabianspice.ae', phone: '+971 6 666 2222', address: 'Sharjah Industrial', category: 'Spices & Seasonings' },
    { id: uuidv4(), name: 'PackRight Solutions', email: 'orders@packright.ae', phone: '+971 4 666 3333', address: 'Al Quoz, Dubai', category: 'Packaging' },
  ];

  for (const s of suppliers) {
    await execute(
      `INSERT INTO suppliers (id, name, email, phone, address, category, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.email, s.phone, s.address, s.category, COMPANY_ID]
    );
    await eventStore.append({
      eventType: 'SUPPLIER_CREATED', userId: USER_ID, entityType: 'supplier', entityId: s.id,
      payload: { name: s.name, email: s.email, category: s.category },
    });
  }

  // ─── Products ───
  const products = [
    { id: uuidv4(), name: 'Basmati Rice Premium 5kg', sku: 'AMHA-R001', price: 45.00, stock: 520, category: 'Grains' },
    { id: uuidv4(), name: 'Extra Virgin Olive Oil 1L', sku: 'AMHA-O001', price: 32.50, stock: 340, category: 'Oils' },
    { id: uuidv4(), name: 'Mixed Spice Pack 500g', sku: 'AMHA-S001', price: 18.75, stock: 890, category: 'Spices' },
    { id: uuidv4(), name: 'Canned Chickpeas 400g', sku: 'AMHA-C001', price: 5.25, stock: 1200, category: 'Canned Goods' },
    { id: uuidv4(), name: 'Jasmine Rice 10kg', sku: 'AMHA-R002', price: 78.00, stock: 280, category: 'Grains' },
    { id: uuidv4(), name: 'Sunflower Oil 5L', sku: 'AMHA-O002', price: 42.00, stock: 450, category: 'Oils' },
    { id: uuidv4(), name: 'Black Pepper Ground 250g', sku: 'AMHA-S002', price: 22.00, stock: 650, category: 'Spices' },
    { id: uuidv4(), name: 'Tomato Paste 800g', sku: 'AMHA-C002', price: 8.50, stock: 980, category: 'Canned Goods' },
  ];

  for (const p of products) {
    await execute(
      `INSERT INTO products (id, name, sku, price, stock, category, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, p.sku, p.price, p.stock, p.category, COMPANY_ID]
    );
    await eventStore.append({
      eventType: 'PRODUCT_CREATED', userId: USER_ID, entityType: 'product', entityId: p.id,
      payload: { name: p.name, sku: p.sku, price: p.price, stock: p.stock, category: p.category },
    });
  }

  // ─── Invoices ───
  const statuses = ['paid', 'paid', 'paid', 'sent', 'sent', 'overdue', 'draft'];
  for (let i = 0; i < 12; i++) {
    const cust = customers[i % customers.length];
    const status = statuses[i % statuses.length];
    const prod = products[i % products.length];
    const qty = Math.ceil(Math.random() * 20) + 1;
    const subtotal = Math.round(2000 + Math.random() * 18000);
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;
    const invId = uuidv4();
    const number = `INV-${String(1001 + i).padStart(5, '0')}`;
    const date = `2026-${String(Math.max(1, 3 - Math.floor(i / 4))).padStart(2, '0')}-${String(5 + i * 2).padStart(2, '0')}`;
    const dueDate = `2026-${String(Math.max(1, 4 - Math.floor(i / 4))).padStart(2, '0')}-${String(5 + i * 2).padStart(2, '0')}`;
    const items = [{ product: prod.name, qty, price: prod.price }];

    await execute(
      `INSERT INTO invoices (id, number, customer_id, customer_name, date, due_date, subtotal, tax, total, status, items_json, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
      [invId, number, cust.id, cust.name, date, dueDate, subtotal, tax, total, status, JSON.stringify(items), COMPANY_ID]
    );
    await eventStore.append({
      eventType: 'INVOICE_CREATED', userId: USER_ID, entityType: 'invoice', entityId: invId,
      payload: { number, customer: cust.name, subtotal, tax, total, status, items },
    });
  }

  // ─── Orders ───
  const orderStatuses = ['completed', 'processing', 'pending', 'completed', 'processing'];
  for (let i = 0; i < 6; i++) {
    const cust = customers[i % customers.length];
    const prod = products[i % products.length];
    const qty = Math.ceil(Math.random() * 15) + 1;
    const total = Math.round(3000 + Math.random() * 12000);
    const ordId = uuidv4();
    const number = `ORD-${String(2001 + i).padStart(5, '0')}`;
    const items = [{ product: prod.name, qty, price: prod.price }];

    await execute(
      `INSERT INTO orders (id, number, customer_id, customer_name, date, total, status, items_json, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [ordId, number, cust.id, cust.name, `2026-03-${String(1 + i * 3).padStart(2, '0')}`, total, orderStatuses[i % orderStatuses.length], JSON.stringify(items), COMPANY_ID]
    );
    await eventStore.append({
      eventType: 'ORDER_CREATED', userId: USER_ID, entityType: 'order', entityId: ordId,
      payload: { number, customer: cust.name, total, status: orderStatuses[i % orderStatuses.length] },
    });
  }

  // ─── Receipts ───
  const receipts = [
    { id: uuidv4(), vendor: 'Office Mart Dubai', date: '2026-03-10', amount: 850, category: 'Office Supplies', account: '6100 - Office Expenses', linked: 1 },
    { id: uuidv4(), vendor: 'DEWA Utilities', date: '2026-03-08', amount: 2400, category: 'Utilities', account: '6300 - Utilities', linked: 1 },
    { id: uuidv4(), vendor: 'Emirates Transport', date: '2026-03-05', amount: 1800, category: 'Transport', account: '', linked: 0 },
  ];

  for (const r of receipts) {
    await execute(
      `INSERT INTO receipts (id, vendor, date, amount, category, account, linked, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.vendor, r.date, r.amount, r.category, r.account, r.linked, COMPANY_ID]
    );
  }

  // CRM leads and accounting (journal entries + chart of accounts) are NOT seeded.
  // They start empty and are populated by real business use.

  console.log('[Seed] Database seeded successfully!');
  console.log(`  - ${customers.length} customers`);
  console.log(`  - ${suppliers.length} suppliers`);
  console.log(`  - ${products.length} products`);
  console.log(`  - 12 invoices`);
  console.log(`  - 6 orders`);
  console.log(`  - ${receipts.length} receipts`);
  console.log(`  - Accounting & CRM: empty (ready for real data)`);
}

export default seedDatabase;
