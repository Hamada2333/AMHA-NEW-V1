import React, { useState } from 'react';
import THEME from '../styles/theme';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { fmt } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import SearchBar from '../components/ui/SearchBar';
import Btn from '../components/ui/Btn';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, FormRow } from '../components/ui/Form';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '' };

export const CustomersPage = () => {
  const { customers, setCustomers } = useAppContext();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = customers.filter(c => {
    const s = search.toLowerCase();
    return c.name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s);
  });

  const openCreate = () => { setEditingId(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (c) => { setEditingId(c.id); setFormData({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' }); setModalOpen(true); };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email) { addToast('Name and email are required', 'error'); return; }
      if (editingId) {
        const res = await api.put(`/customers/${editingId}`, formData);
        setCustomers(p => p.map(c => c.id === editingId ? { ...c, ...res } : c));
        addToast(`${res.name} updated`, 'success');
      } else {
        const res = await api.post('/customers', { ...formData, balance: 0 });
        setCustomers(p => [res, ...p]);
        addToast(`${res.name} added`, 'success');
      }
      setModalOpen(false);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(p => p.filter(c => c.id !== id));
      setConfirmDelete(null);
      addToast('Customer deleted', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Customers"
        subtitle="Manage client relationships and balances"
        actions={<Btn icon="plus" onClick={openCreate}>Add Customer</Btn>}
      />
      <div style={{ marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search customers..." />
      </div>
      <Card style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="customers" title="No customers found" desc="Add your first customer to get started." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Email</th>
                <th>Phone</th>
                <th>Outstanding Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{c.name}</td>
                  <td style={{ color: THEME.textMuted }}>{c.email}</td>
                  <td style={{ color: THEME.textMuted }}>{c.phone}</td>
                  <td style={{ fontWeight: 600, color: c.balance > 0 ? THEME.warning : THEME.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(c.balance)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEdit(c)} title="Edit" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(c)} title="Delete" style={{ background: 'none', border: 'none', color: THEME.danger, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Customer' : 'Add New Customer'}>
        <FormField label="Customer Name">
          <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Company or Individual Name" style={{ marginBottom: '16px' }} />
        </FormField>
        <FormRow>
          <FormField label="Email Address">
            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@example.com" />
          </FormField>
          <FormField label="Phone Number">
            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+971..." />
          </FormField>
        </FormRow>
        <FormField label="Address">
          <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="City, Country" style={{ marginTop: '16px' }} />
        </FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave}>{editingId ? 'Save Changes' : 'Save Customer'}</Btn>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Customer" width={400}>
        <p style={{ color: THEME.textMuted, marginBottom: '24px' }}>Are you sure you want to delete <strong style={{ color: THEME.text }}>{confirmDelete?.name}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;
