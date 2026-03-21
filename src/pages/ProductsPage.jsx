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
import FileAttachment from '../components/ui/FileAttachment';

const EMPTY_FORM = { name: '', sku: '', price: '', stock: '', category: 'General' };

export const ProductsPage = () => {
  const { products, setProducts } = useAppContext();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = products.filter(p => {
    const s = search.toLowerCase();
    return p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s);
  });

  const openCreate = () => { setEditingId(null); setFormData(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (p) => {
    setEditingId(p.id);
    setFormData({ name: p.name, sku: p.sku, price: String(p.price), stock: String(p.stock), category: p.category || 'General' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.sku) { addToast('Name and SKU are required', 'error'); return; }
      const body = { ...formData, price: parseFloat(formData.price) || 0, stock: parseInt(formData.stock) || 0 };
      if (editingId) {
        const res = await api.put(`/products/${editingId}`, body);
        setProducts(p => p.map(x => x.id === editingId ? { ...x, ...res } : x));
        addToast(`${res.name} updated`, 'success');
      } else {
        const res = await api.post('/products', body);
        setProducts(p => [res, ...p]);
        addToast(`${res.name} added`, 'success');
      }
      setModalOpen(false);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(p => p.filter(x => x.id !== id));
      setConfirmDelete(null);
      addToast('Product deleted', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Products & Inventory"
        subtitle="Manage catalog and track stock levels"
        actions={<Btn icon="plus" onClick={openCreate}>Add Product</Btn>}
      />
      <div style={{ marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search product name or SKU..." />
      </div>
      <Card style={{ padding: 0, flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="products" title="No products found" desc="Add items to the catalog to get started." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: THEME.text }}>{p.name}</td>
                  <td style={{ color: THEME.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{p.sku}</td>
                  <td style={{ color: THEME.textMuted }}>{p.category}</td>
                  <td style={{ fontWeight: 500 }}>{fmt(p.price)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.stock > 100 ? THEME.success : p.stock > 0 ? THEME.warning : THEME.danger }} />
                      <span style={{ fontWeight: p.stock <= 100 ? 700 : 400, color: p.stock <= 100 ? THEME.warning : THEME.text }}>{p.stock} units</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEdit(p)} title="Edit" style={{ background: 'none', border: 'none', color: THEME.accent, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(p)} title="Delete" style={{ background: 'none', border: 'none', color: THEME.danger, padding: '4px', cursor: 'pointer', borderRadius: '6px' }}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Product' : 'Add New Product'}>
        <FormField label="Product Name">
          <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Basmati Rice Premium 5kg" style={{ marginBottom: '16px' }} />
        </FormField>
        <FormRow>
          <FormField label="SKU / Item Code">
            <input value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="AMHA-R001" />
          </FormField>
          <FormField label="Category">
            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="Grains">Grains</option>
              <option value="Spices">Spices</option>
              <option value="Oils">Oils</option>
              <option value="Canned Goods">Canned Goods</option>
              <option value="General">General</option>
            </select>
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="Unit Price (AED)">
            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" />
          </FormField>
          <FormField label="Stock Level">
            <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} placeholder="0" />
          </FormField>
        </FormRow>
        <FileAttachment entityType="product" entityId={editingId} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave}>{editingId ? 'Save Changes' : 'Save Product'}</Btn>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Product" width={400}>
        <p style={{ color: THEME.textMuted, marginBottom: '24px' }}>Are you sure you want to delete <strong style={{ color: THEME.text }}>{confirmDelete?.name}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
