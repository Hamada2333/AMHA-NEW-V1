import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { fmt } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';

export const PaymentsPage = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;
    api.get("/payments/summary").then(d => { if(active) setSummary(d); }).catch(console.error);
    return () => { active = false; };
  }, []);

  return (
    <div style={{ animation: "fadeIn 0.3s ease", height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Payments & Collections"
        subtitle="Track incoming revenue and accounts receivable"
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "24px" }}>
        <StatCard title="Total Received (30d)" value={summary ? fmt(summary.received) : "..."} icon="payments" color={THEME.success} />
        <StatCard title="Outstanding Balances" value={summary ? fmt(summary.outstanding) : "..."} icon="invoice" color={THEME.warning} />
        <StatCard title="Overdue Total" value={summary ? fmt(summary.overdue) : "..."} icon="activity" color={THEME.danger} />
      </div>
      <Card style={{ flex: 1 }}>
        <EmptyState icon="dashboard" title="Payment gateway integration pending" desc="Full payment processing module will be implemented in the next phase." />
      </Card>
    </div>
  );
};

export default PaymentsPage;
