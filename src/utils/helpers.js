export const fmt = (n) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(n);
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const genId = () => Math.random().toString(36).substr(2, 9);
export const genInvNum = (n) => `INV-${String(n).padStart(5, '0')}`;
export const genOrdNum = (n) => `ORD-${String(n).padStart(5, '0')}`;
