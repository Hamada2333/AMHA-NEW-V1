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

export const InvoicesPage = () => {
  const { invoices, customers, setInvoices } = useAppContext();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', amount: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [attachingId, setAttachingId] = useState(null);

  const filtered = invoices.filter(i => {
    const s = search.toLowerCase();
    const match = i.number?.toLowerCase().includes(s) || i.customer?.toLowerCase().includes(s) || i.customer_name?.toLowerCase().includes(s);
    return filter === 'all' ? match : match && i.status === filter;
  });

  const handleCreate = async () => {
    try {
      if (!formData.customerId || !formData.amount) { addToast('Please fill all fields', 'error'); return; }
      const customer = customers.find(c => c.id === formData.customerId);
      const subtotal = parseFloat(formData.amount);
      const inv = await api.post('/invoices', {
        customerId: formData.customerId,
        items: [{ productId: null, product: 'Custom Service', qty: 1, price: subtotal }],
      });
      inv.customer = customer.name;
      setInvoices(p => [inv, ...p]);
      setModalOpen(false);
      setFormData({ customerId: '', amount: '' });
      addToast(`Invoice ${inv.number} created`, 'success');
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

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Invoices" actions={<Btn icon="plus" onClick={() => setModalOpen(true)}>Create Invoice</Btn>} />
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
          <EmptyState icon="invoice" title="No invoices found" desc="Adjust your filters or create a new invoice." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{i.number}</td>
                  <td style={{ color: THEME.textMuted }}>{i.customer || i.customer_name}</td>
                  <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(i.total)}</td>
                  <td style={{ color: THEME.textMuted }}>{fmtDate(i.due_date || i.dueDate)}</td>
                  <td><Badge status={i.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Invoice">
        <FormRow>
          <FormField label="Select Customer">
            <select value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })}>
              <option value="">Choose customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Line Item Amount (AED)">
            <input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </FormField>
        </FormRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleCreate}>Create Invoice</Btn>
        </div>
      </Modal>

      <Modal open={!!attachingId} onClose={() => setAttachingId(null)} title="Invoice Attachments" width={500}>
        <FileAttachment entityType="invoice" entityId={attachingId} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setAttachingId(null)}>Close</Btn>
        </div>
      </Modal>

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
