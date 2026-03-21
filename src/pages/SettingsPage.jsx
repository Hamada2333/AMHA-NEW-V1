import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import Btn from '../components/ui/Btn';
import Card from '../components/ui/Card';
import { FormField, FormRow } from '../components/ui/Form';

const SECTIONS = ['Company Profile', 'Tax & Compliance', 'General', 'User Management'];

const DEFAULTS = {
  companyName: 'AMHA Food & Stuff Trading L.L.C',
  trn: '',
  address: '',
  phone: '',
  email: '',
  vatRate: '5',
  currency: 'AED',
  dateFormat: 'DD/MM/YYYY',
  userName: 'Admin User',
  userEmail: 'admin@amha.ae',
};

export const SettingsPage = () => {
  const addToast = useToast();
  const [activeSection, setActiveSection] = useState('Company Profile');
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    const saved = localStorage.getItem('amha_settings');
    if (saved) {
      try { setForm(prev => ({ ...prev, ...JSON.parse(saved) })); } catch (_) {}
    }
  }, []);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    localStorage.setItem('amha_settings', JSON.stringify(form));
    addToast('Settings saved', 'success');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="System Settings"
        subtitle="Configure application preferences"
        actions={<Btn onClick={handleSave}>Save Changes</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setActiveSection(s)} style={{
              padding: '11px 16px', textAlign: 'left', borderRadius: '8px', border: 'none',
              background: activeSection === s ? THEME.accentLight : 'transparent',
              color: activeSection === s ? THEME.accent : THEME.textMuted,
              fontWeight: activeSection === s ? 600 : 400, cursor: 'pointer', fontSize: '14px',
              transition: 'all 0.15s',
            }}>{s}</button>
          ))}
        </div>

        <Card>
          {activeSection === 'Company Profile' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Company Profile</h3>
              <FormRow>
                <FormField label="Company Name">
                  <input value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                </FormField>
                <FormField label="Phone">
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971..." />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Email">
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.ae" />
                </FormField>
                <FormField label="TRN (Tax Registration Number)">
                  <input value={form.trn} onChange={e => set('trn', e.target.value)} placeholder="1234567890" />
                </FormField>
              </FormRow>
              <FormField label="Address">
                <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Dubai, UAE" />
              </FormField>
            </div>
          )}

          {activeSection === 'Tax & Compliance' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Tax & Compliance</h3>
              <FormRow>
                <FormField label="VAT Rate (%)">
                  <input type="number" value={form.vatRate} onChange={e => set('vatRate', e.target.value)} />
                </FormField>
                <FormField label="TRN Number">
                  <input value={form.trn} onChange={e => set('trn', e.target.value)} placeholder="100XXXXXXXXX" />
                </FormField>
              </FormRow>
              <div style={{ marginTop: '16px', padding: '14px', background: `${THEME.success}12`, borderRadius: '10px', border: `1px solid ${THEME.success}30` }}>
                <p style={{ fontSize: '13px', color: THEME.success, fontWeight: 600 }}>FTA Compliance</p>
                <p style={{ fontSize: '12px', color: THEME.textMuted, marginTop: '4px' }}>VAT is applied automatically at {form.vatRate}% on all invoices. Use Reports → Tax / VAT Summary for FTA submission.</p>
              </div>
            </div>
          )}

          {activeSection === 'General' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>General Preferences</h3>
              <FormRow>
                <FormField label="Currency">
                  <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </FormField>
                <FormField label="Date Format">
                  <select value={form.dateFormat} onChange={e => set('dateFormat', e.target.value)}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </FormField>
              </FormRow>
            </div>
          )}

          {activeSection === 'User Management' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>User Management</h3>
              <FormRow>
                <FormField label="Display Name">
                  <input value={form.userName} onChange={e => set('userName', e.target.value)} />
                </FormField>
                <FormField label="Email">
                  <input type="email" value={form.userEmail} onChange={e => set('userEmail', e.target.value)} />
                </FormField>
              </FormRow>
              <div style={{ marginTop: '16px', padding: '14px', background: `${THEME.accent}12`, borderRadius: '10px', border: `1px solid ${THEME.accent}30` }}>
                <p style={{ fontSize: '13px', color: THEME.accent, fontWeight: 600 }}>Role: Administrator</p>
                <p style={{ fontSize: '12px', color: THEME.textMuted, marginTop: '4px' }}>Full access to all modules, data, and settings.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
