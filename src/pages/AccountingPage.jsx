import React, { useState, useEffect, useCallback } from 'react';
import THEME from '../styles/theme';
import { fmt, fmtDate } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Btn from '../components/ui/Btn';
import Card from '../components/ui/Card';

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const inputStyle = {
  width: '100%', background: '#0A0A0A', border: `1px solid ${THEME.border}`,
  borderRadius: '8px', color: THEME.text, padding: '10px 14px', fontSize: '14px',
  boxSizing: 'border-box',
};

const labelStyle = { fontSize: '12px', color: THEME.textMuted, marginBottom: '6px', display: 'block' };

export default function AccountingPage() {
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('journal');

  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    debit: '',
    credit: '',
    amount: '',
  });

  const [accountForm, setAccountForm] = useState({
    code: '', name: '', type: 'Asset', balance: '',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await api.get('/accounting');
      setChartOfAccounts(data.chartOfAccounts || []);
      setJournal(data.recentJournal || []);
    } catch (err) {
      console.error('[Accounting] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateJournal = async (e) => {
    e.preventDefault();
    if (!journalForm.description || !journalForm.debit || !journalForm.credit || !journalForm.amount) return;
    setSaving(true);
    try {
      const entry = await api.post('/accounting/journal', {
        date: journalForm.date,
        description: journalForm.description,
        debit: journalForm.debit,
        credit: journalForm.credit,
        amount: Number(journalForm.amount),
      });
      setJournal(prev => [entry, ...prev]);
      setShowJournalModal(false);
      setJournalForm({ date: new Date().toISOString().split('T')[0], description: '', debit: '', credit: '', amount: '' });
    } catch (err) {
      console.error('[Journal] Create failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJournal = async (id) => {
    if (!confirm('Delete this journal entry?')) return;
    try {
      await api.delete(`/accounting/journal/${id}`);
      setJournal(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      console.error('[Journal] Delete failed:', err);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.code || !accountForm.name || !accountForm.type) return;
    setSaving(true);
    try {
      const account = await api.post('/accounting/accounts', {
        code: accountForm.code,
        name: accountForm.name,
        type: accountForm.type,
        balance: Number(accountForm.balance) || 0,
      });
      setChartOfAccounts(prev => [...prev, account].sort((a, b) => a.code.localeCompare(b.code)));
      setShowAccountModal(false);
      setAccountForm({ code: '', name: '', type: 'Asset', balance: '' });
    } catch (err) {
      console.error('[Account] Create failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const typeColor = (type) => {
    const map = {
      Asset: THEME.success, Liability: THEME.danger, Equity: THEME.purple,
      Revenue: THEME.accent, Expense: THEME.warning,
    };
    return map[type] || THEME.textMuted;
  };

  const totalsByType = chartOfAccounts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + Number(a.balance || 0);
    return acc;
  }, {});

  if (loading) return <div style={{ color: THEME.textMuted, padding: '32px' }}>Loading accounting...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Accounting & General Ledger"
        subtitle="Manage chart of accounts and journal entries"
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn variant="secondary" icon="plus" onClick={() => setShowAccountModal(true)}>New Account</Btn>
            <Btn icon="plus" onClick={() => setShowJournalModal(true)}>New Journal Entry</Btn>
          </div>
        }
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => (
          <Card key={type} style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', color: THEME.textDim, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{type}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: typeColor(type), fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(totalsByType[type] || 0)}
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: THEME.surface, borderRadius: '10px', padding: '4px', width: 'fit-content', border: `1px solid ${THEME.border}` }}>
        {['journal', 'accounts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 600,
            background: activeTab === tab ? THEME.accent : 'transparent',
            color: activeTab === tab ? '#fff' : THEME.textMuted,
            transition: 'all 0.15s',
          }}>
            {tab === 'journal' ? 'Journal Entries' : 'Chart of Accounts'}
          </button>
        ))}
      </div>

      {/* Journal Entries Table */}
      {activeTab === 'journal' && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Journal Entries <span style={{ color: THEME.textDim, fontWeight: 400, fontSize: '13px' }}>({journal.length})</span></h3>
          </div>
          {journal.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: THEME.textDim }}>No journal entries yet. Click "New Journal Entry" to add one.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Debit Account</th>
                  <th>Credit Account</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {journal.map(j => (
                  <tr key={j.id}>
                    <td style={{ color: THEME.textMuted, whiteSpace: 'nowrap' }}>{fmtDate(j.date)}</td>
                    <td style={{ fontWeight: 500, color: THEME.text, maxWidth: '240px' }}>{j.description}</td>
                    <td>
                      <span style={{ color: THEME.success, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                        Dr {j.debit}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: THEME.danger, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                        Cr {j.credit}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(j.amount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Btn variant="danger" size="sm" onClick={() => handleDeleteJournal(j.id)}>Delete</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Chart of Accounts Table */}
      {activeTab === 'accounts' && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Chart of Accounts <span style={{ color: THEME.textDim, fontWeight: 400, fontSize: '13px' }}>({chartOfAccounts.length})</span></h3>
          </div>
          {chartOfAccounts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: THEME.textDim }}>No accounts yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {chartOfAccounts.map(a => (
                  <tr key={a.code}>
                    <td style={{ color: THEME.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{a.code}</td>
                    <td style={{ fontWeight: 500, color: THEME.text }}>{a.name}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', background: `${typeColor(a.type)}15`, color: typeColor(a.type), fontWeight: 600 }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* New Journal Entry Modal */}
      {showJournalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: '16px', padding: '32px', width: '520px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>New Journal Entry</h2>
              <button onClick={() => setShowJournalModal(false)} style={{ background: 'none', border: 'none', color: THEME.textMuted, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateJournal}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" style={inputStyle} value={journalForm.date}
                    onChange={e => setJournalForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Amount (AED)</label>
                  <input type="number" min="0" step="0.01" style={inputStyle} placeholder="0.00"
                    value={journalForm.amount} onChange={e => setJournalForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Description</label>
                <input type="text" style={inputStyle} placeholder="e.g. Sales revenue for January"
                  value={journalForm.description} onChange={e => setJournalForm(f => ({ ...f, description: e.target.value }))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>Debit Account</label>
                  <select style={inputStyle} value={journalForm.debit}
                    onChange={e => setJournalForm(f => ({ ...f, debit: e.target.value }))} required>
                    <option value="">Select account...</option>
                    {chartOfAccounts.map(a => (
                      <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Credit Account</label>
                  <select style={inputStyle} value={journalForm.credit}
                    onChange={e => setJournalForm(f => ({ ...f, credit: e.target.value }))} required>
                    <option value="">Select account...</option>
                    {chartOfAccounts.map(a => (
                      <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Btn variant="secondary" onClick={() => setShowJournalModal(false)}>Cancel</Btn>
                <Btn type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Entry'}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {showAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: '16px', padding: '32px', width: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>New Account</h2>
              <button onClick={() => setShowAccountModal(false)} style={{ background: 'none', border: 'none', color: THEME.textMuted, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Code</label>
                  <input type="text" style={inputStyle} placeholder="1000"
                    value={accountForm.code} onChange={e => setAccountForm(f => ({ ...f, code: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Account Name</label>
                  <input type="text" style={inputStyle} placeholder="Cash & Bank"
                    value={accountForm.name} onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select style={inputStyle} value={accountForm.type}
                    onChange={e => setAccountForm(f => ({ ...f, type: e.target.value }))}>
                    {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Opening Balance (AED)</label>
                  <input type="number" min="0" step="0.01" style={inputStyle} placeholder="0.00"
                    value={accountForm.balance} onChange={e => setAccountForm(f => ({ ...f, balance: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Btn variant="secondary" onClick={() => setShowAccountModal(false)}>Cancel</Btn>
                <Btn type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Account'}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
