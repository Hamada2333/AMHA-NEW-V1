import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { fmt } from '../utils/helpers';
import api from '../api';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    let active = true;
    api.get("/dashboard").then(d => { if(active) setData(d); }).catch(console.error);
    return () => { active = false; };
  }, []);

  if (!data) return <div style={{ color: THEME.textMuted }}>Loading dashboard...</div>;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <PageHeader title="Overview dashboard" subtitle="Real-time financial and operational metrics" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <StatCard title="Total Revenue" value={fmt(data.revenue?.total || 0)} icon="activity" color={THEME.success} />
        <StatCard title="Total Outstanding" value={fmt(data.outstanding || 0)} icon="invoice" color={THEME.warning} />
        <StatCard title="Active Customers" value={data.customerCount || 0} icon="customers" color={THEME.accent} />
        <StatCard title="System Events" value={data.eventCount || 0} icon="reports" color={THEME.purple} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Recent Invoices</h3>
            <button style={{ color: THEME.accent, background: "none", border: "none", fontSize: "13px" }}>View all</button>
          </div>
          <table style={{ background: THEME.bg, borderRadius: "8px", overflow: "hidden" }}>
            <tbody>
              {data.recentInvoices?.slice(0, 5).map(inv => (
                <tr key={inv.id}>
                  <td><div style={{ fontWeight: 600 }}>{inv.number}</div><div style={{ fontSize: "12px", color: THEME.textMuted }}>{inv.customer_name}</div></td>
                  <td style={{ textAlign: "right" }}><div style={{ fontWeight: 600 }}>{fmt(inv.total)}</div><div style={{ marginTop: "4px" }}><Badge status={inv.status} /></div></td>
                </tr>
              )) || <tr><td colSpan="2"><EmptyState icon="invoice" title="No invoices yet" desc="Create an invoice to see it here" /></td></tr>}
            </tbody>
          </table>
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>System Live Activity</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {data.recentEvents?.slice(0, 5).map(ev => {
              const info = {
                INVOICE_CREATED: { icon: "invoice", color: THEME.accent, text: `Invoice ${ev.payload.number} created` },
                INVOICE_SENT: { icon: "activity", color: THEME.success, text: `Invoice ${ev.payload.number} sent to customer` },
                PAYMENT_RECEIVED: { icon: "payments", color: THEME.success, text: `Payment received for ${ev.payload.number}` },
                CUSTOMER_CREATED: { icon: "customers", color: THEME.purple, text: `New customer ${ev.payload.name} added` },
                ORDER_CREATED: { icon: "orders", color: THEME.warning, text: `Order ${ev.payload.number} placed` }
              }[ev.event_type] || { icon: "activity", color: THEME.textDim, text: `System event: ${ev.event_type}` };

              return (
                <div key={ev.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: `${info.color}1A`, color: info.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={info.icon} size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", color: THEME.text }}>{info.text}</p>
                    <p style={{ fontSize: "11px", color: THEME.textDim }}>{new Date(ev.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            }) || <EmptyState icon="activity" title="No activity" desc="System events will appear here" />}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
