import React, { useState } from 'react';
import THEME from '../styles/theme';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import SearchBar from '../components/ui/SearchBar';
import Btn from '../components/ui/Btn';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, FormRow } from '../components/ui/Form';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', category: '' };

export const SuppliersPage = () => {
  const { suppliers, setSuppliers } = useAppContext();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = suppliers.filter(s => {
    const term = search.toLowerCase();
    return s.name?.toLowerCase().includes(term) || s.category?.toLowerCase().includes(term);
  });

  const openCreate = () => { setEditingId(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (s) => { setEditingId(s.id); setFormData({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '', category: s.category || '' }); setModalOpen(true); };

  const handleSave = async () => {
    try {
      if (!formData.name) { addToast('Supplier name is required', 'error'); return; }
      if (editingId) {
        const res = await api.put(`/suppliers/${editingId}`, formData);
        setSuppliers(p => p.map(s => s.id === editingId ? { ...s, ...res } : s));
        addToast(`${res.name} updated`, 'success');
      } else {
        const res = await api.post('/suppliers', { ...formData });
        setSuppliers(p => [res, ...p]);
        addToast(`${res.name} added`, 'success');
      }
      setModalOpen(false);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(p => p.filter(s => s.id !== id));
      setConfirmDelete(null);
      addToast('Supplier deleted', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendor relationships and procurement contacts"
        actions={<Btn icon="plus" onClick={openCreate}>Add Supplier</Btn>}
      />
      <div style={{ marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers..." />
      </div>
      <Card style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="suppliers" title="No suppliers found" desc="Add vendors to start managing procurement." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Category</th>
                <th>Contact Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{s.name}</td>
                  <td><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: THEME.surface, border: `1px solid ${THEME.border}` }}>{s.category}</span></td>
                  <td style={{ color: THEME.textMuted }}>{s.email}</td>
                  <td style={{ color: THEME.textMuted }}>{s.phone}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEdit(s)} title="Edit" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(s)} title="Delete" style={{ background: 'none', border: 'none', color: THEME.danger, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Supplier' : 'Add New Supplier'}>
        <FormField label="Supplier Name">
          <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Vendor Company Name" style={{ marginBottom: '16px' }} />
        </FormField>
        <FormRow>
          <FormField label="Category">
            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="">Select category...</option>
              <option value="Food & Beverages">Food & Beverages</option>
              <option value="Spices & Seasonings">Spices & Seasonings</option>
              <option value="Packaging">Packaging</option>
              <option value="Equipment">Equipment</option>
              <option value="Logistics">Logistics</option>
            </select>
          </FormField>
          <FormField label="Email Address">
            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="vendor@example.com" />
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="Phone">
            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+971..." />
          </FormField>
          <FormField label="Address">
            <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="City, Area" />
          </FormField>
        </FormRow>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave}>{editingId ? 'Save Changes' : 'Save Supplier'}</Btn>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Supplier" width={400}>
        <p style={{ color: THEME.textMuted, marginBottom: '24px' }}>Are you sure you want to delete <strong style={{ color: THEME.text }}>{confirmDelete?.name}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default SuppliersPage;
