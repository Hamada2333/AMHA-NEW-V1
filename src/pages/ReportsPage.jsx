import React, { useState } from 'react';
import THEME from '../styles/theme';
import { useToast } from '../context/ToastContext';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';

export const ReportsPage = () => {
  const addToast = useToast();
  const [generating, setGenerating] = useState({});

  const reports = [
    { id: "pl", name: "Profit & Loss Statement", desc: "Detailed breakdown of revenues, costs, and expenses", icon: "accounting", color: THEME.success },
    { id: "bs", name: "Balance Sheet", desc: "Company's financial position (assets, liabilities, equity)", icon: "activity", color: THEME.accent },
    { id: "cf", name: "Cash Flow Analysis", desc: "Inflows and outflows of cash over a specific period", icon: "payments", color: THEME.cyan },
    { id: "tx", name: "Tax / VAT Summary", desc: "Calculated tax liabilities for FTA submission", icon: "reports", color: THEME.purple },
    { id: "iv", name: "Inventory Valuation", desc: "Current value of all stock items based on average cost", icon: "products", color: THEME.warning },
    { id: "ar", name: "A/R Aging Report", desc: "Outstanding customer balances categorized by days past due", icon: "customers", color: THEME.danger },
  ];

  const handleGenerate = async (id, name) => {
    try {
      addToast(`Generating ${name}...`, "processing");
      setGenerating(p => ({ ...p, [id]: true }));
      await api.post("/reports/generate", { reportId: id, name });
      setGenerating(p => ({ ...p, [id]: false }));
    } catch (err) {
      addToast(err.message, "error");
      setGenerating(p => ({ ...p, [id]: false }));
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Financial & Operational Reports"
        subtitle="Generate, view, and export comprehensive business analytics"
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
        {reports.map(r => (
          <Card key={r.id} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px", flex: 1 }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `${r.color}1A`, color: r.color, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                background: generating[r.id] ? THEME.surface : `${THEME.accent}15`,
                color: generating[r.id] ? THEME.textMuted : THEME.accent,
                border: "none", fontWeight: 600, transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
              }}
            >
              {generating[r.id] ? (
                <><div style={{ width: "16px", height: "16px", border: `2px solid ${THEME.textMuted}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pulse 1s linear infinite" }} /> Generating...</>
              ) : (
                <><Icon name="activity" size={16} /> Generate Report</>
              )}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
