import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { fmt, fmtDate } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Btn from '../components/ui/Btn';
import EmptyState from '../components/ui/EmptyState';
import Card from '../components/ui/Card';

export const AccountingPage = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    let active = true;
    api.get("/dashboard/accounting").then(d => { if(active) setData(d); }).catch(console.error);
    return () => { active = false; };
  }, []);

  if (!data) return <div style={{ color: THEME.textMuted }}>Loading accounting...</div>;

  return (
    <div style={{ animation: "fadeIn 0.3s ease", height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Accounting & General Ledger"
        subtitle="Manage chart of accounts and journal entries"
        actions={<Btn icon="plus">New Journal Entry</Btn>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", flex: 1, overflow: "hidden" }}>
        <Card style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Chart of Accounts</h3>
            <Btn variant="ghost" size="sm">Export</Btn>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.chartOfAccounts?.map(a => (
                  <tr key={a.code}>
                    <td style={{ color: THEME.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>{a.code}</td>
                    <td style={{ fontWeight: 500, color: THEME.text }}>{a.name}</td>
                    <td><span style={{ padding: "4px 8px", borderRadius: "8px", fontSize: "11px", background: THEME.surface, border: `1px solid ${THEME.border}` }}>{a.type}</span></td>
                    <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        
        <Card style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Recent Journal Entries</h3>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentJournal?.map(j => (
                  <tr key={j.id}>
                    <td style={{ color: THEME.textMuted }}>{fmtDate(j.date)}</td>
                    <td>
                      <div style={{ fontWeight: 500, color: THEME.text }}>{j.description}</div>
                      <div style={{ fontSize: "11px", color: THEME.textDim, marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
                        <span style={{ color: THEME.success }}>Dr {j.debit.split(' ')[0]}</span> • <span style={{ color: THEME.danger }}>Cr {j.credit.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(j.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccountingPage;
