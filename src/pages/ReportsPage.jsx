import React, { useState } from 'react';
import THEME from '../styles/theme';
import { useToast } from '../context/ToastContext';
import { fmt } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Icon from '../components/ui/Icon';
import Btn from '../components/ui/Btn';

export const ReportsPage = () => {
  const addToast = useToast();
  const [generating, setGenerating] = useState({});
  const [result, setResult] = useState(null);

  const reports = [
    { id: "pl", name: "Profit & Loss Statement", desc: "Breakdown of revenues, costs, and expenses", icon: "accounting", color: THEME.success },
    { id: "bs", name: "Balance Sheet", desc: "Company's financial position (assets, liabilities, equity)", icon: "activity", color: THEME.accent },
    { id: "cf", name: "Cash Flow Analysis", desc: "Inflows and outflows of cash over a specific period", icon: "payments", color: THEME.cyan },
    { id: "tx", name: "Tax / VAT Summary", desc: "Calculated tax liabilities for FTA submission", icon: "reports", color: THEME.purple },
    { id: "iv", name: "Inventory Valuation", desc: "Current value of all stock items based on average cost", icon: "products", color: THEME.warning },
    { id: "ar", name: "A/R Aging Report", desc: "Outstanding customer balances categorized by days past due", icon: "customers", color: THEME.danger },
  ];

  const handleGenerate = async (id, name) => {
    try {
      setGenerating(p => ({ ...p, [id]: true }));
      const res = await api.post("/reports/generate", { reportId: id, name });
      setResult({ ...res, reportName: name });
      addToast(`${name} generated`, 'success');
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setGenerating(p => ({ ...p, [id]: false }));
    }
  };

  const renderReport = (data, id) => {
    if (!data) return null;
    const row = (label, value, bold) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${THEME.border}` }}>
        <span style={{ color: bold ? THEME.text : THEME.textMuted, fontWeight: bold ? 600 : 400 }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: bold ? 700 : 500, color: bold ? THEME.text : THEME.textMuted }}>{value}</span>
      </div>
    );
    if (id === 'pl') return [
      row('Total Revenue', fmt(data.revenue), false),
      row('VAT Collected', fmt(data.tax), false),
      row('Net Profit', fmt(data.net), true),
      row('Paid Invoices', `${data.invoiceCount} invoices`, false),
    ];
    if (id === 'bs') return [
      row('Cash (Paid Revenue)', fmt(data.assets?.cash), false),
      row('Accounts Receivable', fmt(data.assets?.receivables), false),
      row('Total Assets', fmt(data.totalAssets), true),
    ];
    if (id === 'cf') return [
      row('Cash Inflows (Paid)', fmt(data.inflows), false),
      row('Outstanding (Unpaid)', fmt(data.outstanding), false),
      row('Net Cash Position', fmt(data.net), true),
    ];
    if (id === 'tx') return [
      row('Taxable Revenue', fmt(data.taxableRevenue), false),
      row('VAT Rate', data.vatRate, false),
      row('VAT Collected', fmt(data.vatCollected), true),
    ];
    if (id === 'iv') return [
      ...(data.items || []).map(i => row(i.name, `${i.stock} × ${fmt(i.price)} = ${fmt(i.value)}`, false)),
      row('Total Inventory Value', fmt(data.totalValue), true),
    ];
    if (id === 'ar') return [
      ...(data.outstanding || []).map(i => row(`${i.number} — ${i.customer}`, fmt(i.total), false)),
      row('Total Outstanding', fmt(data.totalOutstanding), true),
      row('Total Customers', `${data.customerCount}`, false),
    ];
    return null;
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Financial & Operational Reports"
        subtitle="Generate and view comprehensive business analytics"
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
        {reports.map(r => (
          <Card key={r.id} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px", flex: 1 }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `${r.color}1A`, color: r.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={r.icon} size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: THEME.text, marginBottom: "6px" }}>{r.name}</h3>
                <p style={{ fontSize: "13px", color: THEME.textMuted, lineHeight: "1.5" }}>{r.desc}</p>
              </div>
            </div>
            <button
              onClick={() => handleGenerate(r.id, r.name)}
              disabled={generating[r.id]}
              style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                background: generating[r.id] ? THEME.surface : `${r.color}15`,
                color: generating[r.id] ? THEME.textMuted : r.color,
                border: "none", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
              }}
            >
              {generating[r.id]
                ? <><div style={{ width: "14px", height: "14px", border: `2px solid ${THEME.textMuted}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Generating...</>
                : <><Icon name="activity" size={16} /> Generate Report</>}
            </button>
          </Card>
        ))}
      </div>

      <Modal open={!!result} onClose={() => setResult(null)} title={result?.reportName || 'Report'} width={560}>
        <div style={{ fontSize: '12px', color: THEME.textDim, marginBottom: '16px' }}>
          Generated {result?.generatedAt ? new Date(result.generatedAt).toLocaleString() : ''}
        </div>
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {result && renderReport(result.data, result.reportId)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Btn variant="ghost" onClick={() => setResult(null)}>Close</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default ReportsPage;
