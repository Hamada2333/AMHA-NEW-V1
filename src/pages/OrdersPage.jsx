import React, { useState } from 'react';
import THEME from '../styles/theme';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { fmt, fmtDate } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import SearchBar from '../components/ui/SearchBar';
import Btn from '../components/ui/Btn';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, FormRow } from '../components/ui/Form';
import Card from '../components/ui/Card';
import FileAttachment from '../components/ui/FileAttachment';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', AED: 'AED ' };
const PAYMENT_TERMS = ['Net 7', 'Net 15', 'Net 30', 'Net 60', 'Due on Receipt', 'Prepaid'];
const VAT_RATE = 0.05;
const EMPTY_ITEM = { description: '', qty: '', unitPrice: '' };
const EMPTY_FORM = {
  customerId: '', currency: 'USD', deliveryDate: '', paymentTerms: 'Net 30',
  notes: '', items: [{ ...EMPTY_ITEM }],
};

export const OrdersPage = () => {
  const { orders, customers, products, setOrders, setInvoices } = useAppContext();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [attachingId, setAttachingId] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);

  const filtered = orders.filter(o => {
    const s = search.toLowerCase();
    const match = o.number?.toLowerCase().includes(s) || o.customer?.toLowerCase().includes(s) || o.customer_name?.toLowerCase().includes(s);
    return filter === 'all' ? match : match && o.status === filter;
  });

  const sym = CURRENCY_SYMBOLS[formData.currency] || '$';
  const subtotal = formData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.unitPrice) || 0), 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const grandTotal = subtotal + vat;

  const setItem = (idx, field, val) => {
    const items = [...formData.items];
    items[idx] = { ...items[idx], [field]: val };
    setFormData(f => ({ ...f, items }));
  };

  const addItem = () => setFormData(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx) => setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const selectProduct = (idx, productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const items = [...formData.items];
    items[idx] = { ...items[idx], description: product.name, unitPrice: product.price, _productId: productId };
    setFormData(f => ({ ...f, items }));
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData(f => ({ ...f, customerId, currency: customer?.currency || 'USD' }));
  };

  const handleCreate = async () => {
    try {
      if (!formData.customerId) { addToast('Please select a customer', 'error'); return; }
      if (formData.items.every(it => !it.description)) { addToast('Add at least one item', 'error'); return; }
      const res = await api.post('/orders', {
        customerId: formData.customerId,
        currency: formData.currency,
        deliveryDate: formData.deliveryDate,
        paymentTerms: formData.paymentTerms,
        notes: formData.notes,
        items: formData.items.filter(it => it.description).map(it => ({
          description: it.description,
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
        })),
      });
      const customer = customers.find(c => c.id === formData.customerId);
      setOrders(p => [{ ...res, customer: customer?.name }, ...p]);
      setModalOpen(false);
      setFormData(EMPTY_FORM);
      addToast(`Order ${res.number} created`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleConvert = async (id, number) => {
    try {
      addToast(`Converting ${number} to invoice...`, 'processing');
      const res = await api.put(`/orders/${id}/invoice`);
      setOrders(p => p.map(o => o.id === id ? { ...o, status: 'completed' } : o));
      if (setInvoices && res.invoiceId) {
        const inv = await api.get(`/invoices/${res.invoiceId}`);
        setInvoices(p => [inv, ...p]);
      }
      addToast(`Converted to ${res.invoiceNumber}`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/orders/${id}`);
      setOrders(p => p.filter(o => o.id !== id));
      setConfirmDelete(null);
      addToast('Order deleted', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const openView = async (order) => {
    try {
      const full = await api.get(`/orders/${order.id}`).catch(() => order);
      setViewOrder({ ...full, customer: order.customer || order.customer_name });
    } catch { setViewOrder(order); }
  };

  const statusColor = (status) => {
    if (status === 'completed') return THEME.success;
    if (status === 'cancelled') return THEME.danger;
    return THEME.warning;
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Sales Orders"
        actions={<Btn icon="plus" onClick={() => { setFormData(EMPTY_FORM); setModalOpen(true); }}>New Order</Btn>}
      />
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search order number or customer..." />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '160px', background: THEME.surface }}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <Card style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="orders" title="No orders found" desc="Create your first sales order to get started." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Delivery</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const items = Array.isArray(o.items) ? o.items : [];
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: THEME.text }}>{o.number}</td>
                    <td style={{ color: THEME.textMuted }}>{o.customer || o.customer_name}</td>
                    <td style={{ color: THEME.textDim, fontSize: '12px' }}>{items.length} line{items.length !== 1 ? 's' : ''}</td>
                    <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                      {CURRENCY_SYMBOLS[o.currency] || '$'}{fmt(o.total)}
                    </td>
                    <td style={{ color: THEME.textMuted }}>{fmtDate(o.date)}</td>
                    <td style={{ color: THEME.textMuted, fontSize: '12px' }}>{o.delivery_date ? fmtDate(o.delivery_date) : '—'}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: `${statusColor(o.status)}15`, color: statusColor(o.status) }}>
                        {o.status === 'completed' ? 'Completed' : o.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openView(o)} title="View Order" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                          <Icon name="invoice" size={15} />
                        </button>
                        {o.status === 'pending' && (
                          <button onClick={() => handleConvert(o.id, o.number)} title="Convert to Invoice" style={{ background: 'none', border: 'none', color: THEME.success, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                            <Icon name="activity" size={15} />
                          </button>
                        )}
                        <button onClick={() => setAttachingId(o.id)} title="Attachments" style={{ background: 'none', border: 'none', color: THEME.textMuted, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                          <Icon name="upload" size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(o)} title="Delete" style={{ background: 'none', border: 'none', color: THEME.danger, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Create Sales Order Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Sales Order" width={800}>
        {/* Row 1: Customer + Currency */}
        <FormRow>
          <FormField label="Customer">
            <select value={formData.customerId} onChange={e => handleCustomerChange(e.target.value)}>
              <option value="">Choose customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.currency || 'USD'})</option>)}
            </select>
          </FormField>
          <FormField label="Currency">
            <select value={formData.currency} onChange={e => setFormData(f => ({ ...f, currency: e.target.value }))}>
              {['USD', 'EUR', 'AED'].map(c => <option key={c}>{c}</option>)}
            </select>
          </FormField>
        </FormRow>

        {/* Row 2: Delivery Date + Payment Terms */}
        <FormRow>
          <FormField label="Expected Delivery Date">
            <input type="date" value={formData.deliveryDate} onChange={e => setFormData(f => ({ ...f, deliveryDate: e.target.value }))} />
          </FormField>
          <FormField label="Payment Terms">
            <select value={formData.paymentTerms} onChange={e => setFormData(f => ({ ...f, paymentTerms: e.target.value }))}>
              {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>
        </FormRow>

        {/* Line Items */}
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Line Items
        </div>
        <div style={{ overflowX: 'auto', marginBottom: '8px', border: `1px solid ${THEME.border}`, borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: THEME.surface }}>
                {['#', 'Product', 'Description', `Qty`, `Unit Price (${sym})`, `Total (${sym})`, ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 8px', borderBottom: `1px solid ${THEME.border}`, fontWeight: 600, color: THEME.textMuted, textAlign: i >= 3 ? 'right' : 'left', whiteSpace: 'nowrap', fontSize: '12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formData.items.map((it, idx) => {
                const lineTotal = (Number(it.qty) * Number(it.unitPrice)) || 0;
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: '6px 8px', color: THEME.textDim, fontSize: '12px', width: '30px' }}>{idx + 1}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <select value={it._productId || ''} onChange={e => selectProduct(idx, e.target.value)} style={{ width: '140px', fontSize: '12px' }}>
                        <option value="">— pick product —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        value={it.description}
                        onChange={e => setItem(idx, 'description', e.target.value)}
                        placeholder="or type manually"
                        style={{ width: '160px' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                      <input type="number" min="0" value={it.qty} onChange={e => setItem(idx, 'qty', e.target.value)} placeholder="0" style={{ width: '70px', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                      <input type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} placeholder="0.00" style={{ width: '90px', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                      {sym}{lineTotal.toFixed(2)}
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <button onClick={() => removeItem(idx)} disabled={formData.items.length === 1} style={{ background: 'none', border: 'none', color: formData.items.length === 1 ? THEME.textDim : THEME.danger, cursor: formData.items.length === 1 ? 'default' : 'pointer', fontSize: '16px' }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} style={{ fontSize: '13px', color: THEME.accent, background: 'none', border: `1px dashed ${THEME.accent}`, borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', marginBottom: '20px' }}>
          + Add Line Item
        </button>

        {/* Totals + Notes side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'end' }}>
          <FormField label="Notes / Internal Remarks">
            <textarea
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              placeholder="Delivery instructions, special requirements..."
              rows={3}
              style={{ width: '100%', resize: 'vertical', background: '#0A0A0A', border: `1px solid ${THEME.border}`, borderRadius: '8px', color: THEME.text, padding: '10px 14px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </FormField>

          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '10px', padding: '16px 20px', minWidth: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '8px', fontSize: '13px', color: THEME.textMuted }}>
              <span>Subtotal</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sym}{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '12px', fontSize: '13px', color: THEME.textMuted }}>
              <span>VAT (5%)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sym}{vat.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', paddingTop: '10px', borderTop: `1px solid ${THEME.border}`, fontSize: '15px', fontWeight: 700, color: THEME.text }}>
              <span>Grand Total</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: THEME.accent }}>{sym}{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleCreate}>Create Order</Btn>
        </div>
      </Modal>

      {/* ── View Order Modal ── */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="" width={700}>
          <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff', padding: '8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B6CA8', marginBottom: '4px' }}>SALES ORDER</div>
                <div style={{ fontSize: '14px', color: '#555' }}>{viewOrder.number}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', lineHeight: '1.8', color: '#333' }}>
                <div style={{ fontWeight: 700 }}>AMHA FOODSTUFF TRADING L.L.C</div>
                <div>Dubai Investment Park First, Office Building 106</div>
                <div>DUBAI UAE | +971585995281</div>
                <div>TAX REG: 104025246000003</div>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: '#f5f7fa', borderRadius: '8px', padding: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Bill To</div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{viewOrder.customer || viewOrder.customer_name}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  ['Order Date', fmtDate(viewOrder.date)],
                  ['Delivery Date', viewOrder.delivery_date ? fmtDate(viewOrder.delivery_date) : '—'],
                  ['Payment Terms', viewOrder.payment_terms || 'Net 30'],
                  ['Status', viewOrder.status?.toUpperCase() || 'PENDING'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1B6CA8', color: '#fff' }}>
                  {['#', 'Description', 'Qty', `Unit Price`, `Total`].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === '#' || h === 'Qty' ? 'center' : h === 'Description' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(viewOrder.items || []).map((it, i) => {
                  const cur = CURRENCY_SYMBOLS[viewOrder.currency] || '$';
                  const lineTotal = it.total ?? (Number(it.qty) * Number(it.unitPrice || it.price || 0));
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px' }}>{it.description || it.product}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.qty}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{cur}{Number(it.unitPrice || it.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{cur}{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <div style={{ width: '240px' }}>
                {[
                  ['Subtotal', viewOrder.subtotal],
                  ['VAT (5%)', viewOrder.tax],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#555' }}>
                    <span>{label}</span>
                    <span>{CURRENCY_SYMBOLS[viewOrder.currency] || '$'}{Number(val || 0).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', marginTop: '4px', background: '#1B6CA8', color: '#fff', borderRadius: '6px', fontWeight: 700, fontSize: '14px' }}>
                  <span>Grand Total</span>
                  <span>{CURRENCY_SYMBOLS[viewOrder.currency] || '$'}{Number(viewOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {viewOrder.notes && (
              <div style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: '#555', marginBottom: '16px' }}>
                <strong>Notes:</strong> {viewOrder.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <Btn variant="ghost" onClick={() => setViewOrder(null)}>Close</Btn>
              <Btn onClick={() => window.print()}>Print</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Attachments Modal ── */}
      <Modal open={!!attachingId} onClose={() => setAttachingId(null)} title="Order Attachments" width={500}>
        <FileAttachment entityType="order" entityId={attachingId} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setAttachingId(null)}>Close</Btn>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Order" width={400}>
        <p style={{ color: THEME.textMuted, marginBottom: '24px' }}>Delete order <strong style={{ color: THEME.text }}>{confirmDelete?.number}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default OrdersPage;
