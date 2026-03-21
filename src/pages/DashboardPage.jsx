import React, { useState, useEffect } from 'react';
import THEME from '../styles/theme';
import { fmt } from '../utils/helpers';
import api from '../api';
import { useAppContext } from '../context/AppContext';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';

export const DashboardPage = () => {
  const { invoices, customers, products } = useAppContext();
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    let active = true;
    api.get('/events?limit=5').then(d => { if (active) setRecentEvents((d.events || []).slice(0, 5)); }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Compute all stats from live AppContext state
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0);
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + Number(i.total || 0), 0);
  const lowStock = products.filter(p => Number(p.stock) < 50).length;
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <PageHeader title="Overview Dashboard" subtitle="Real-time financial and operational metrics" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        <StatCard title="Total Revenue" value={fmt(revenue)} icon="activity" color={THEME.success} />
        <StatCard title="Outstanding" value={fmt(outstanding)} icon="invoice" color={THEME.warning} />
        <StatCard title="Customers" value={customers.length} icon="customers" color={THEME.accent} />
        <StatCard title="Low Stock Items" value={lowStock} icon="products" color={THEME.danger} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Recent Invoices</h3>
          </div>
          {recentInvoices.length === 0 ? (
            <EmptyState icon="invoice" title="No invoices yet" desc="Create an invoice to see it here" />
          ) : (
            <table style={{ background: THEME.bg, borderRadius: "8px", overflow: "hidden" }}>
              <tbody>
                {recentInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td><div style={{ fontWeight: 600 }}>{inv.number}</div><div style={{ fontSize: "12px", color: THEME.textMuted }}>{inv.customer || inv.customer_name}</div></td>
                    <td style={{ textAlign: "right" }}><div style={{ fontWeight: 600 }}>{fmt(inv.total)}</div><div style={{ marginTop: "4px" }}><Badge status={inv.status} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>System Live Activity</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {recentEvents.length === 0 ? (
              <EmptyState icon="activity" title="No activity" desc="System events will appear here" />
            ) : recentEvents.map(ev => {
              const info = {
                INVOICE_CREATED: { icon: "invoice", color: THEME.accent, text: `Invoice ${ev.payload?.number} created` },
                INVOICE_SENT: { icon: "activity", color: THEME.success, text: `Invoice ${ev.payload?.number} marked as sent` },
                PAYMENT_RECEIVED: { icon: "payments", color: THEME.success, text: `Payment received — ${ev.payload?.number}` },
                CUSTOMER_CREATED: { icon: "customers", color: THEME.purple, text: `New customer ${ev.payload?.name} added` },
                ORDER_CREATED: { icon: "orders", color: THEME.warning, text: `Order ${ev.payload?.number} placed` },
              }[ev.event_type] || { icon: "activity", color: THEME.textDim, text: `${ev.event_type}` };
              return (
                <div key={ev.event_id} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: `${info.color}1A`, color: info.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={info.icon} size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", color: THEME.text }}>{info.text}</p>
                    <p style={{ fontSize: "11px", color: THEME.textDim }}>{new Date(ev.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
