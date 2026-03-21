import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { useToast } from '../context/ToastContext';
import { fmt, fmtDate } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Btn from '../components/ui/Btn';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, FormRow } from '../components/ui/Form';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';

const EMPTY_FORM = { vendor: '', amount: '', category: '', date: '' };

export const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState([]);
  const addToast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/receipts').then(d => { if (active) setReceipts(d); }).catch(console.error);
    return () => { active = false; };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setFormData({ vendor: r.vendor, amount: String(r.amount), category: r.category || '', date: r.date || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.vendor || !formData.amount) { addToast('Vendor and amount are required', 'error'); return; }
      if (editingId) {
        const res = await api.put(`/receipts/${editingId}`, { ...formData, amount: parseFloat(formData.amount) });
        setReceipts(p => p.map(r => r.id === editingId ? { ...r, ...res } : r));
        addToast('Receipt updated', 'success');
      } else {
        const res = await api.post('/receipts', { ...formData, amount: parseFloat(formData.amount) });
        setReceipts(p => [res, ...p]);
        addToast('Receipt added', 'success');
      }
      setModalOpen(false);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/receipts/${id}`);
      setReceipts(p => p.filter(r => r.id !== id));
      setConfirmDelete(null);
      addToast('Receipt deleted', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const statusColor = (s) => s === 'processed' ? THEME.success : s === 'processing' ? THEME.warning : THEME.textMuted;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Expense Receipts"
        subtitle="Track and manage company expenses"
        actions={<Btn icon="plus" onClick={openCreate}>Add Receipt</Btn>}
      />
      <Card style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {receipts.length === 0 ? (
          <EmptyState icon="receipts" title="No receipts yet" desc="Add expense receipts to track company spend." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td style={{ color: THEME.textMuted }}>{fmtDate(r.date)}</td>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{r.vendor}</td>
                  <td style={{ color: THEME.textMuted }}>{r.category || '—'}</td>
                  <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.amount)}</td>
                  <td><span style={{ fontSize: '12px', fontWeight: 600, color: statusColor(r.processing_status) }}>{r.processing_status || 'ready'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEdit(r)} title="Edit" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(r)} title="Delete" style={{ background: 'none', border: 'none', color: THEME.danger, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Receipt' : 'Add Receipt'}>
        <FormRow>
          <FormField label="Vendor / Supplier">
            <input value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} placeholder="e.g. Office Mart Dubai" />
          </FormField>
          <FormField label="Amount (AED)">
            <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="Category">
            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="">Select category...</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Utilities">Utilities</option>
              <option value="Transport">Transport</option>
              <option value="Meals & Entertainment">Meals & Entertainment</option>
              <option value="Equipment">Equipment</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
          <FormField label="Date">
            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </FormField>
        </FormRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Receipt'}</Btn>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Receipt" width={400}>
        <p style={{ color: THEME.textMuted, marginBottom: '24px' }}>Delete receipt from <strong style={{ color: THEME.text }}>{confirmDelete?.vendor}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default ReceiptsPage;
