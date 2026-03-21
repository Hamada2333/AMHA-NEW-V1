export const SEED_CUSTOMERS = [
  { id: "c1", name: "Al Rayyan Trading LLC", email: "info@alrayyan.ae", phone: "+971 4 555 1234", address: "Dubai, UAE", balance: 15200 },
  { id: "c2", name: "Gulf Fresh Foods", email: "orders@gulffresh.ae", phone: "+971 6 555 5678", address: "Sharjah, UAE", balance: 8400 },
  { id: "c3", name: "Emirates Wholesale Co", email: "buy@emirateswholesale.ae", phone: "+971 2 555 9012", address: "Abu Dhabi, UAE", balance: 23100 },
  { id: "c4", name: "Horizon Supermarkets", email: "procurement@horizon.ae", phone: "+971 4 555 3456", address: "Dubai, UAE", balance: 5600 },
  { id: "c5", name: "Desert Palm Catering", email: "supply@desertpalm.ae", phone: "+971 7 555 7890", address: "Ras Al Khaimah, UAE", balance: 11800 },
];

export const SEED_SUPPLIERS = [
  { id: "s1", name: "Global Food Imports Ltd", email: "sales@globalfood.com", phone: "+971 4 666 1111", address: "Jebel Ali, Dubai", category: "Food & Beverages" },
  { id: "s2", name: "Arabian Spice Trading", email: "info@arabianspice.ae", phone: "+971 6 666 2222", address: "Sharjah Industrial", category: "Spices & Seasonings" },
  { id: "s3", name: "PackRight Solutions", email: "orders@packright.ae", phone: "+971 4 666 3333", address: "Al Quoz, Dubai", category: "Packaging" },
];

export const SEED_PRODUCTS = [
  { id: "p1", name: "Basmati Rice Premium 5kg", sku: "AMHA-R001", price: 45.00, stock: 520, category: "Grains" },
  { id: "p2", name: "Extra Virgin Olive Oil 1L", sku: "AMHA-O001", price: 32.50, stock: 340, category: "Oils" },
  { id: "p3", name: "Mixed Spice Pack 500g", sku: "AMHA-S001", price: 18.75, stock: 890, category: "Spices" },
  { id: "p4", name: "Canned Chickpeas 400g", sku: "AMHA-C001", price: 5.25, stock: 1200, category: "Canned Goods" },
  { id: "p5", name: "Jasmine Rice 10kg", sku: "AMHA-R002", price: 78.00, stock: 280, category: "Grains" },
  { id: "p6", name: "Sunflower Oil 5L", sku: "AMHA-O002", price: 42.00, stock: 450, category: "Oils" },
  { id: "p7", name: "Black Pepper Ground 250g", sku: "AMHA-S002", price: 22.00, stock: 650, category: "Spices" },
  { id: "p8", name: "Tomato Paste 800g", sku: "AMHA-C002", price: 8.50, stock: 980, category: "Canned Goods" },
];

const TAX_RATE = 0.05;
const genInvNum = (n) => `INV-${String(n).padStart(5, '0')}`;
const genOrdNum = (n) => `ORD-${String(n).padStart(5, '0')}`;
const genId = () => Math.random().toString(36).substr(2, 9);

export const generateInvoices = () => {
  const statuses = ["paid", "paid", "paid", "sent", "sent", "overdue", "draft"];
  return Array.from({ length: 12 }).map((_, i) => {
    const cust = SEED_CUSTOMERS[i % SEED_CUSTOMERS.length];
    const status = statuses[i % statuses.length];
    const prod = SEED_PRODUCTS[i % SEED_PRODUCTS.length];
    const qty = Math.ceil(Math.random() * 20) + 1;
    const subtotal = Math.round(2000 + Math.random() * 18000);
    const tax = Math.round(subtotal * TAX_RATE);
    const date = `2026-${String(Math.max(1, 3 - Math.floor(i / 4))).padStart(2, '0')}-${String(5 + i * 2).padStart(2, '0')}`;
    const dueDate = `2026-${String(Math.max(1, 4 - Math.floor(i / 4))).padStart(2, '0')}-${String(5 + i * 2).padStart(2, '0')}`;

    return {
      id: genId(),
      number: genInvNum(1001 + i),
      customer: cust.name,
      customerId: cust.id,
      date, dueDate,
      subtotal, tax, total: subtotal + tax,
      status,
      items: [{ product: prod.name, qty, price: prod.price }]
    };
  });
};

export const generateOrders = () => {
  const statuses = ["completed", "processing", "pending", "completed", "processing"];
  return Array.from({ length: 6 }).map((_, i) => {
    const cust = SEED_CUSTOMERS[i % SEED_CUSTOMERS.length];
    const prod = SEED_PRODUCTS[i % SEED_PRODUCTS.length];
    const qty = Math.ceil(Math.random() * 15) + 1;
    const total = Math.round(3000 + Math.random() * 12000);
    return {
      id: genId(),
      number: genOrdNum(2001 + i),
      customer: cust.name,
      customerId: cust.id,
      date: `2026-03-${String(1 + i * 3).padStart(2, '0')}`,
      total,
      status: statuses[i % statuses.length],
      items: [{ product: prod.name, qty, price: prod.price }]
    };
  });
};

export const SEED_JOURNAL = [
  { id: "j1", date: "2026-03-01", description: "Sales Revenue - Al Rayyan Trading", debit: "1200 - Accounts Receivable", credit: "3000 - Sales Revenue", amount: 15960 },
  { id: "j2", date: "2026-03-03", description: "Purchase - Global Food Imports", debit: "5000 - Cost of Goods Sold", credit: "2100 - Accounts Payable", amount: 8400 },
  { id: "j3", date: "2026-03-05", description: "Payment Received - Gulf Fresh Foods", debit: "1000 - Cash & Bank", credit: "1200 - Accounts Receivable", amount: 8820 },
  { id: "j4", date: "2026-03-08", description: "Office Supplies", debit: "6100 - Office Expenses", credit: "1000 - Cash & Bank", amount: 1250 },
  { id: "j5", date: "2026-03-10", description: "Sales Revenue - Emirates Wholesale", debit: "1200 - Accounts Receivable", credit: "3000 - Sales Revenue", amount: 24255 },
  { id: "j6", date: "2026-03-12", description: "Rent Payment", debit: "6200 - Rent Expense", credit: "1000 - Cash & Bank", amount: 15000 },
  { id: "j7", date: "2026-03-15", description: "VAT Payment", debit: "2200 - VAT Payable", credit: "1000 - Cash & Bank", amount: 3200 },
];

export const CHART_OF_ACCOUNTS = [
  { code: "1000", name: "Cash & Bank", type: "Asset", balance: 245000 },
  { code: "1200", name: "Accounts Receivable", type: "Asset", balance: 64200 },
  { code: "1300", name: "Inventory", type: "Asset", balance: 128500 },
  { code: "1500", name: "Fixed Assets", type: "Asset", balance: 85000 },
  { code: "2100", name: "Accounts Payable", type: "Liability", balance: 42300 },
  { code: "2200", name: "VAT Payable", type: "Liability", balance: 8750 },
  { code: "3000", name: "Sales Revenue", type: "Revenue", balance: 712300 },
  { code: "3100", name: "Other Income", type: "Revenue", balance: 5200 },
  { code: "5000", name: "Cost of Goods Sold", type: "Expense", balance: 398400 },
  { code: "6100", name: "Office Expenses", type: "Expense", balance: 18200 },
  { code: "6200", name: "Rent Expense", type: "Expense", balance: 45000 },
  { code: "6300", name: "Utilities", type: "Expense", balance: 12800 },
  { code: "6400", name: "Salaries & Wages", type: "Expense", balance: 156000 },
  { code: "9000", name: "Owner's Equity", type: "Equity", balance: 350000 },
];
