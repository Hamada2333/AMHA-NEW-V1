import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { useToast } from '../context/ToastContext';
import { fmt } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Btn from '../components/ui/Btn';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { FormField, FormRow } from '../components/ui/Form';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import FileAttachment from '../components/ui/FileAttachment';

const STATUSES = ['new', 'contacted', 'qualified', 'converted'];
const STATUS_COLORS = { new: THEME.accent, contacted: THEME.warning, qualified: THEME.success, converted: '#8B5CF6' };
const EMPTY_FORM = { name: '', contact: '', email: '', phone: '', status: 'new', value: '', notes: '' };

export const CRMPage = () => {
  const [leads, setLeads] = useState([]);
  const addToast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/dashboard/leads').then(d => { if (active) setLeads(d); }).catch(console.error);
    return () => { active = false; };
  }, []);

  const openCreate = () => { setEditingId(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (l) => {
    setEditingId(l.id);
    setFormData({ name: l.name, contact: l.contact || '', email: l.email || '', phone: l.phone || '', status: l.status || 'new', value: String(l.value || ''), notes: l.notes || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name) { addToast('Name is required', 'error'); return; }
      const body = { ...formData, value: parseFloat(formData.value) || 0 };
      if (editingId) {
        const res = await api.put(`/dashboard/leads/${editingId}`, body);
        setLeads(p => p.map(l => l.id === editingId ? { ...l, ...res } : l));
        addToast(`${formData.name} updated`, 'success');
      } else {
        const res = await api.post('/dashboard/leads', body);
        setLeads(p => [res, ...p]);
        addToast(`${res.name} added`, 'success');
      }
      setModalOpen(false);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/dashboard/leads/${id}/status`, { status });
      setLeads(p => p.map(l => l.id === id ? { ...l, status } : l));
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/dashboard/leads/${id}`);
      setLeads(p => p.filter(l => l.id !== id));
      setConfirmDelete(null);
      addToast('Lead deleted', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="CRM Pipeline"
        subtitle="Track sales leads and conversion funnels"
        actions={<Btn icon="plus" onClick={openCreate}>Add Lead</Btn>}
      />
      <Card style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {leads.length === 0 ? (
          <EmptyState icon="crm" title="No leads yet" desc="Add your first sales lead to start tracking." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company / Name</th>
                <th>Contact</th>
                <th>Est. Value</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{l.name}</td>
                  <td style={{ color: THEME.textMuted }}>
                    <div>{l.contact}</div>
                    {l.email && <div style={{ fontSize: '12px', color: THEME.textDim }}>{l.email}</div>}
                  </td>
                  <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(l.value)}</td>
                  <td>
                    <select
                      value={l.status}
                      onChange={e => handleStatusChange(l.id, e.target.value)}
                      style={{ background: `${STATUS_COLORS[l.status]}18`, color: STATUS_COLORS[l.status], border: `1px solid ${STATUS_COLORS[l.status]}40`, borderRadius: '8px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                  <td style={{ color: THEME.textMuted, fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEdit(l)} title="Edit" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(l)} title="Delete" style={{ background: 'none', border: 'none', color: THEME.danger, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Lead' : 'Add Lead'} width={540}>
        <FormRow>
          <FormField label="Company / Name">
            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Carrefour UAE" />
          </FormField>
          <FormField label="Contact Person">
            <input value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Full name" />
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="Email">
            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@company.com" />
          </FormField>
          <FormField label="Phone">
            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+971..." />
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="Status">
            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </FormField>
          <FormField label="Estimated Value (AED)">
            <input type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder="0" />
          </FormField>
        </FormRow>
        <FormField label="Notes">
          <input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Any relevant details..." style={{ marginTop: '16px' }} />
        </FormField>
        <FileAttachment entityType="lead" entityId={editingId} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Lead'}</Btn>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Lead" width={400}>
        <p style={{ color: THEME.textMuted, marginBottom: '24px' }}>Delete lead <strong style={{ color: THEME.text }}>{confirmDelete?.name}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default CRMPage;
