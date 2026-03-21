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

export const OrdersPage = () => {
  const { orders, customers, setOrders, setInvoices } = useAppContext();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', amount: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [attachingId, setAttachingId] = useState(null);

  const filtered = orders.filter(o => {
    const s = search.toLowerCase();
    return o.number?.toLowerCase().includes(s) || o.customer?.toLowerCase().includes(s) || o.customer_name?.toLowerCase().includes(s);
  });

  const handleCreate = async () => {
    try {
      if (!formData.customerId || !formData.amount) { addToast('Please fill all fields', 'error'); return; }
      const customer = customers.find(c => c.id === formData.customerId);
      const total = parseFloat(formData.amount);
      const res = await api.post('/orders', {
        customerId: formData.customerId,
        items: [{ productId: null, product: 'Custom Item', qty: 1, price: total }],
      });
      res.customer = customer.name;
      setOrders(p => [res, ...p]);
      setModalOpen(false);
      setFormData({ customerId: '', amount: '' });
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

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Sales Orders" actions={<Btn icon="plus" onClick={() => setModalOpen(true)}>New Order</Btn>} />
      <div style={{ marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search orders..." />
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
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{o.number}</td>
                  <td style={{ color: THEME.textMuted }}>{o.customer || o.customer_name}</td>
                  <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(o.total)}</td>
                  <td style={{ color: THEME.textMuted }}>{fmtDate(o.date)}</td>
                  <td><Badge status={o.status === 'completed' ? 'paid' : o.status === 'pending' ? 'draft' : o.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {o.status === 'pending' && (
                        <button onClick={() => handleConvert(o.id, o.number)} title="Convert to Invoice" style={{ background: 'none', border: 'none', color: THEME.success, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                          <Icon name="invoice" size={15} />
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
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Sales Order">
        <FormRow>
          <FormField label="Select Customer">
            <select value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })}>
              <option value="">Choose customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Total Amount (AED)">
            <input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </FormField>
        </FormRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleCreate}>Create Order</Btn>
        </div>
      </Modal>

      <Modal open={!!attachingId} onClose={() => setAttachingId(null)} title="Order Attachments" width={500}>
        <FileAttachment entityType="order" entityId={attachingId} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setAttachingId(null)}>Close</Btn>
        </div>
      </Modal>

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
