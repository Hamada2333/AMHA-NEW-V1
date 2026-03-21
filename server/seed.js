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
    `INSERT INTO companies (id, name, trn, address, email, phone) VALUES ($1, $2, $3, $4, $5, $6)`,
    [COMPANY_ID, 'AMHA FOOD & STUFF TRADING L.L.C', '100XXXXXXXXX', 'Sharjah, UAE', 'info@amhafood.ae', '+971 6 XXX XXXX']
  );

  // ─── User ───
  await execute(
    `INSERT INTO users (id, name, email, role, company_id) VALUES ($1, $2, $3, $4, $5)`,
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
      `INSERT INTO customers (id, name, email, phone, address, balance, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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
      `INSERT INTO suppliers (id, name, email, phone, address, category, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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
      `INSERT INTO products (id, name, sku, price, stock, category, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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
      `INSERT INTO invoices (id, number, customer_id, customer_name, date, due_date, subtotal, tax, total, status, items_json, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
      `INSERT INTO orders (id, number, customer_id, customer_name, date, total, status, items_json, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
      `INSERT INTO receipts (id, vendor, date, amount, category, account, linked, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [r.id, r.vendor, r.date, r.amount, r.category, r.account, r.linked, COMPANY_ID]
    );
  }

  // ─── CRM Leads ───
  const leads = [
    { id: uuidv4(), name: 'Paradise Restaurants Group', contact: 'Ahmed Al-Hakim', email: 'ahmed@paradise.ae', phone: '+971 4 777 1111', status: 'new', value: 45000, notes: 'Interested in bulk rice & oil supply', lastContact: '2026-03-18' },
    { id: uuidv4(), name: 'Oasis Hotel & Resorts', contact: 'Fatima Hassan', email: 'fatima@oasishotel.ae', phone: '+971 2 777 2222', status: 'contacted', value: 82000, notes: 'Meeting scheduled for next week', lastContact: '2026-03-15' },
    { id: uuidv4(), name: 'Carrefour UAE', contact: 'David Chen', email: 'dchen@carrefour.ae', phone: '+971 4 777 3333', status: 'qualified', value: 150000, notes: 'Large wholesale deal in progress', lastContact: '2026-03-12' },
    { id: uuidv4(), name: 'Spinneys Fresh Market', contact: 'Sarah Thompson', email: 'sarah@spinneys.ae', phone: '+971 4 777 4444', status: 'converted', value: 67000, notes: 'Contract signed — monthly delivery', lastContact: '2026-03-10' },
    { id: uuidv4(), name: 'Le Meridien Catering', contact: 'Khalid Mansour', email: 'khalid@meridien.ae', phone: '+971 4 777 5555', status: 'new', value: 35000, notes: 'Initial inquiry received', lastContact: '2026-03-19' },
  ];

  for (const l of leads) {
    await execute(
      `INSERT INTO leads (id, name, contact, email, phone, status, value, notes, last_contact, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [l.id, l.name, l.contact, l.email, l.phone, l.status, l.value, l.notes, l.lastContact, COMPANY_ID]
    );
  }

  // ─── Journal Entries ───
  const journals = [
    { id: uuidv4(), date: '2026-03-01', description: 'Sales Revenue - Al Rayyan Trading', debit: '1200 - Accounts Receivable', credit: '3000 - Sales Revenue', amount: 15960 },
    { id: uuidv4(), date: '2026-03-03', description: 'Purchase - Global Food Imports', debit: '5000 - Cost of Goods Sold', credit: '2100 - Accounts Payable', amount: 8400 },
    { id: uuidv4(), date: '2026-03-05', description: 'Payment Received - Gulf Fresh Foods', debit: '1000 - Cash & Bank', credit: '1200 - Accounts Receivable', amount: 8820 },
    { id: uuidv4(), date: '2026-03-08', description: 'Office Supplies', debit: '6100 - Office Expenses', credit: '1000 - Cash & Bank', amount: 1250 },
    { id: uuidv4(), date: '2026-03-10', description: 'Sales Revenue - Emirates Wholesale', debit: '1200 - Accounts Receivable', credit: '3000 - Sales Revenue', amount: 24255 },
    { id: uuidv4(), date: '2026-03-12', description: 'Rent Payment', debit: '6200 - Rent Expense', credit: '1000 - Cash & Bank', amount: 15000 },
    { id: uuidv4(), date: '2026-03-15', description: 'VAT Payment', debit: '2200 - VAT Payable', credit: '1000 - Cash & Bank', amount: 3200 },
  ];

  for (const j of journals) {
    await execute(
      `INSERT INTO journal_entries (id, date, description, debit, credit, amount, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [j.id, j.date, j.description, j.debit, j.credit, j.amount, COMPANY_ID]
    );
  }

  // ─── Chart of Accounts ───
  const accounts = [
    { code: '1000', name: 'Cash & Bank', type: 'Asset', balance: 245000 },
    { code: '1200', name: 'Accounts Receivable', type: 'Asset', balance: 64200 },
    { code: '1300', name: 'Inventory', type: 'Asset', balance: 128500 },
    { code: '1500', name: 'Fixed Assets', type: 'Asset', balance: 85000 },
    { code: '2100', name: 'Accounts Payable', type: 'Liability', balance: 42300 },
    { code: '2200', name: 'VAT Payable', type: 'Liability', balance: 8750 },
    { code: '3000', name: 'Sales Revenue', type: 'Revenue', balance: 712300 },
    { code: '3100', name: 'Other Income', type: 'Revenue', balance: 5200 },
    { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 398400 },
    { code: '6100', name: 'Office Expenses', type: 'Expense', balance: 18200 },
    { code: '6200', name: 'Rent Expense', type: 'Expense', balance: 45000 },
    { code: '6300', name: 'Utilities', type: 'Expense', balance: 12800 },
    { code: '6400', name: 'Salaries & Wages', type: 'Expense', balance: 156000 },
    { code: '9000', name: "Owner's Equity", type: 'Equity', balance: 350000 },
  ];

  for (const a of accounts) {
    await execute(
      `INSERT INTO chart_of_accounts (code, name, type, balance, company_id) VALUES ($1, $2, $3, $4, $5)`,
      [a.code, a.name, a.type, a.balance, COMPANY_ID]
    );
  }

  console.log('[Seed] Database seeded successfully!');
  console.log(`  - ${customers.length} customers`);
  console.log(`  - ${suppliers.length} suppliers`);
  console.log(`  - ${products.length} products`);
  console.log(`  - 12 invoices`);
  console.log(`  - 6 orders`);
  console.log(`  - ${receipts.length} receipts`);
  console.log(`  - ${leads.length} CRM leads`);
  console.log(`  - ${journals.length} journal entries`);
  console.log(`  - ${accounts.length} chart of accounts items`);
}

export default seedDatabase;
