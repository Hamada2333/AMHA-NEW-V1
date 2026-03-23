import React, { useState } from 'react';
import THEME from '../styles/theme';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { fmt, fmtDate } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import SearchBar from '../components/ui/SearchBar';
import Btn from '../components/ui/Btn';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, FormRow } from '../components/ui/Form';
import Card from '../components/ui/Card';
import FileAttachment from '../components/ui/FileAttachment';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', AED: 'AED ' };
const VAT_RATE = 0.05;

const EMPTY_ITEM = { description: '', packaging: '', qty: '', nw: '', unitPrice: '' };
const EMPTY_FORM = { customerId: '', currency: 'USD', att: '', containerNumber: '', transportFees: '', tax: '', items: [{ ...EMPTY_ITEM }] };

export const InvoicesPage = () => {
  const { invoices, customers, setInvoices } = useAppContext();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [attachingId, setAttachingId] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  const filtered = invoices.filter(i => {
    const s = search.toLowerCase();
    const match = i.number?.toLowerCase().includes(s) || i.customer?.toLowerCase().includes(s) || i.customer_name?.toLowerCase().includes(s);
    return filter === 'all' ? match : match && i.status === filter;
  });

  const setItem = (idx, field, val) => {
    const items = [...formData.items];
    items[idx] = { ...items[idx], [field]: val };
    // Auto-calc total
    if (field === 'qty' || field === 'unitPrice') {
      const q = field === 'qty' ? Number(val) : Number(items[idx].qty);
      const p = field === 'unitPrice' ? Number(val) : Number(items[idx].unitPrice);
      items[idx]._total = (q * p).toFixed(2);
    }
    setFormData(f => ({ ...f, items }));
  };

  const addItem = () => setFormData(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx) => setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const sym = CURRENCY_SYMBOLS[formData.currency] || '$';

  const subtotal = formData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.unitPrice) || 0), 0);
  const fees = Number(formData.transportFees) || 0;
  const autoVat = Math.round((subtotal + fees) * VAT_RATE * 100) / 100;
  const tax = formData.tax === '' ? autoVat : Number(formData.tax);
  const grandTotal = subtotal + fees + tax;

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData(f => ({ ...f, customerId, currency: customer?.currency || 'USD', tax: '' }));
  };

  const handleCreate = async () => {
    try {
      if (!formData.customerId) { addToast('Please select a customer', 'error'); return; }
      if (formData.items.every(it => !it.description)) { addToast('Add at least one item', 'error'); return; }
      const res = await api.post('/invoices', {
        customerId: formData.customerId,
        currency: formData.currency,
        att: formData.att,
        containerNumber: formData.containerNumber,
        transportFees: fees,
        tax,
        items: formData.items.filter(it => it.description).map(it => ({
          description: it.description,
          packaging: it.packaging,
          qty: Number(it.qty),
          nw: Number(it.nw),
          unitPrice: Number(it.unitPrice),
        })),
      });
      const customer = customers.find(c => c.id === formData.customerId);
      setInvoices(p => [{ ...res, customer: customer?.name }, ...p]);
      setModalOpen(false);
      setFormData(EMPTY_FORM);
      addToast(`Invoice ${res.number} created`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleSend = async (id, number) => {
    try {
      await api.put(`/invoices/${id}/send`);
      setInvoices(p => p.map(i => i.id === id ? { ...i, status: 'sent' } : i));
      addToast(`${number} marked as sent`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handlePay = async (id, number) => {
    try {
      await api.put(`/invoices/${id}/pay`);
      setInvoices(p => p.map(i => i.id === id ? { ...i, status: 'paid' } : i));
      addToast(`${number} marked as paid`, 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(p => p.filter(i => i.id !== id));
      setConfirmDelete(null);
      addToast('Invoice deleted', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const openView = async (inv) => {
    try {
      const full = await api.get(`/invoices/${inv.id}`);
      setViewInvoice({ ...full, customer: inv.customer || inv.customer_name });
    } catch { setViewInvoice(inv); }
  };

  const tdStyle = { border: '1px solid #ccc', padding: '6px 8px', fontSize: '12px' };
  const thStyle = { ...tdStyle, background: '#1B6CA8', color: '#fff', fontWeight: 600, textAlign: 'center' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Invoices" actions={<Btn icon="plus" onClick={() => { setFormData(EMPTY_FORM); setModalOpen(true); }}>Create Invoice</Btn>} />
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search invoice number or customer..." />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '160px', background: THEME.surface }}>
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="sent">Sent</option>
          <option value="overdue">Overdue</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <Card style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="invoice" title="No invoices found" desc="Create a new invoice to get started." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice No.</th><th>Customer</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{i.number}</td>
                  <td style={{ color: THEME.textMuted }}>{i.customer || i.customer_name}</td>
                  <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>{CURRENCY_SYMBOLS[i.currency] || '$'}{fmt(i.total)}</td>
                  <td style={{ color: THEME.textMuted }}>{fmtDate(i.due_date || i.dueDate)}</td>
                  <td><Badge status={i.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openView(i)} title="View Invoice" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="invoice" size={15} />
                      </button>
                      {(i.status === 'draft' || i.status === 'overdue') && (
                        <button onClick={() => handleSend(i.id, i.number)} title="Mark as Sent" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                          <Icon name="activity" size={15} />
                        </button>
                      )}
                      {i.status === 'sent' && (
                        <button onClick={() => handlePay(i.id, i.number)} title="Mark as Paid" style={{ background: 'none', border: 'none', color: THEME.success, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                          <Icon name="check" size={15} />
                        </button>
                      )}
                      <button onClick={() => setAttachingId(i.id)} title="Attachments" style={{ background: 'none', border: 'none', color: THEME.textMuted, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="upload" size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(i)} title="Delete" style={{ background: 'none', border: 'none', color: THEME.danger, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Create Invoice Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Invoice" width={780}>
        <FormRow>
          <FormField label="Customer">
            <select value={formData.customerId} onChange={e => handleCustomerChange(e.target.value)}>
              <option value="">Choose customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.currency || 'USD'})</option>)}
            </select>
          </FormField>
          <FormField label="Att (Contact Person)">
            <input value={formData.att} onChange={e => setFormData(f => ({ ...f, att: e.target.value }))} placeholder="e.g. HAIFA FOOD AB" />
          </FormField>
          <FormField label="Container No.">
            <input value={formData.containerNumber} onChange={e => setFormData(f => ({ ...f, containerNumber: e.target.value }))} placeholder="e.g. UETU239760/3" />
          </FormField>
        </FormRow>

        {/* Line Items */}
        <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Description', 'Packaging', 'Qty', 'N.W', `Unit Price (${sym})`, 'Total', ''].map(h => (
                  <th key={h} style={{ background: THEME.surface, padding: '8px 6px', borderBottom: `2px solid ${THEME.border}`, fontWeight: 600, color: THEME.textMuted, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formData.items.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '4px 4px' }}><input value={it.description} onChange={e => setItem(idx, 'description', e.target.value)} placeholder="Product description" style={{ width: '160px' }} /></td>
                  <td style={{ padding: '4px 4px' }}><input value={it.packaging} onChange={e => setItem(idx, 'packaging', e.target.value)} placeholder="900gr x 30" style={{ width: '90px' }} /></td>
                  <td style={{ padding: '4px 4px' }}><input type="number" value={it.qty} onChange={e => setItem(idx, 'qty', e.target.value)} placeholder="0" style={{ width: '60px' }} /></td>
                  <td style={{ padding: '4px 4px' }}><input type="number" value={it.nw} onChange={e => setItem(idx, 'nw', e.target.value)} placeholder="0" style={{ width: '60px' }} /></td>
                  <td style={{ padding: '4px 4px' }}><input type="number" step="0.01" value={it.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} placeholder="0.00" style={{ width: '80px' }} /></td>
                  <td style={{ padding: '4px 8px', fontWeight: 600, color: THEME.text, whiteSpace: 'nowrap' }}>{((Number(it.qty) * Number(it.unitPrice)) || 0).toFixed(2)}</td>
                  <td><button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: THEME.danger, cursor: 'pointer' }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} style={{ fontSize: '13px', color: THEME.accent, background: 'none', border: `1px dashed ${THEME.accent}`, borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', marginBottom: '16px' }}>+ Add Line Item</button>

        <FormRow>
          <FormField label={`Transport & Fees (${sym})`}>
            <input type="number" step="0.01" value={formData.transportFees} onChange={e => setFormData(f => ({ ...f, transportFees: e.target.value, tax: '' }))} placeholder="0.00" />
          </FormField>
          <FormField label={`VAT 5% (${sym}) — auto-calculated`}>
            <input type="number" step="0.01" value={formData.tax === '' ? autoVat.toFixed(2) : formData.tax} onChange={e => setFormData(f => ({ ...f, tax: e.target.value }))} placeholder={autoVat.toFixed(2)} />
          </FormField>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '4px' }}>
            <div style={{ fontSize: '12px', color: THEME.textMuted }}>Subtotal: <strong>{sym}{subtotal.toFixed(2)}</strong></div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: THEME.text }}>Grand Total: {sym}{grandTotal.toFixed(2)}</div>
          </div>
        </FormRow>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleCreate}>Create Invoice</Btn>
        </div>
      </Modal>

      {/* ── Invoice View / Print Modal ── */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title="" width={720}>
        {viewInvoice && (
          <div id="invoice-print" style={{ fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff', padding: '8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>AMHA FOODSTUFF TRADING L.L.C</div>
                <div>TEL.: +971585995281</div>
                <div>AMHAFOODSTUFF@GMAIL.COM</div>
                <div>TAX REG: 104025246000003</div>
                <div>Dubai Investment Park First</div>
                <div>Office Building 106</div>
                <div>DUBAI UAE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', background: '#1B6CA8', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '20px', margin: '0 auto 4px' }}>A</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#1B6CA8' }}>A M H A</div>
                <div style={{ fontSize: '8px', color: '#555' }}>FOODSTUFF TRADING L.L.C</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', marginBottom: '10px', textDecoration: 'underline' }}>
              Invoice {viewInvoice.number}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
              <div><strong>Att: {viewInvoice.att || viewInvoice.customer || viewInvoice.customer_name}</strong></div>
              <div>
                <div><strong>Date: {viewInvoice.date || fmtDate(viewInvoice.created_at)}</strong></div>
                {viewInvoice.container_number && <div><strong>Container #{viewInvoice.container_number}</strong></div>}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
              <thead>
                <tr>
                  {['Description', 'Packaging', 'Quantity', 'N.W', `U.Price(${CURRENCY_SYMBOLS[viewInvoice.currency] || '$'})`, `Total(${CURRENCY_SYMBOLS[viewInvoice.currency] || '$'})`].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(viewInvoice.items || []).map((it, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                    <td style={tdStyle}>{it.description || it.product}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{it.packaging || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{it.qty}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{it.nw || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{Number(it.unitPrice || it.price || 0).toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{Number(it.total || (it.qty * (it.unitPrice || it.price || 0))).toFixed(2)}</td>
                  </tr>
                ))}
                {Number(viewInvoice.transport_fees) > 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>Transportation &amp; fees</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{Number(viewInvoice.transport_fees).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>Total C&amp;F</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{(Number(viewInvoice.subtotal) + Number(viewInvoice.transport_fees || 0)).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>Vat</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{Number(viewInvoice.tax || 0).toFixed(2)}</td>
                </tr>
                <tr style={{ background: '#1B6CA8', color: '#fff' }}>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff', border: '1px solid #1B6CA8' }}>Grand Total {viewInvoice.number}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#fff', border: '1px solid #1B6CA8' }}>{Number(viewInvoice.total).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {viewInvoice.container_number && (
              <div style={{ fontSize: '11px', marginBottom: '8px' }}>Container #{viewInvoice.container_number}</div>
            )}
            <div style={{ fontSize: '11px', color: '#333', marginBottom: '16px' }}>
              WE HEREBY CERTIFY THAT THIS INVOICE IS TRUE AND CORRECT.<br />
              CONTENTS TRUE AND AUTHENTIC PRICE CORRECT &amp;CURRENT.<br />
              AND THAT IS THE ONLY INVOICE ISSUED BY US FOR THE MERCHANDISE.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <Btn variant="ghost" onClick={() => setViewInvoice(null)}>Close</Btn>
              <Btn onClick={() => window.print()}>Print</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Attachments Modal ── */}
      <Modal open={!!attachingId} onClose={() => setAttachingId(null)} title="Invoice Attachments" width={500}>
        <FileAttachment entityType="invoice" entityId={attachingId} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setAttachingId(null)}>Close</Btn>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Invoice" width={400}>
        <p style={{ color: THEME.textMuted, marginBottom: '24px' }}>Delete invoice <strong style={{ color: THEME.text }}>{confirmDelete?.number}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesPage;
