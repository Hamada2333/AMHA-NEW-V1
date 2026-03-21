import React, { useState, useEffect, useCallback } from 'react';
import THEME from './styles/theme';
import { globalCSS } from './styles/globalCSS';
import AppContext from './context/AppContext';
import { ToastContainer } from './context/ToastContext';
import Icon from './components/ui/Icon';
import api, { connectWebSocket } from './api';

import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductsPage from './pages/ProductsPage';
import PaymentsPage from './pages/PaymentsPage';
import ReceiptsPage from './pages/ReceiptsPage';
import AccountingPage from './pages/AccountingPage';
import ReportsPage from './pages/ReportsPage';
import CRMPage from './pages/CRMPage';
import EventLogPage from './pages/EventLogPage';
import SettingsPage from './pages/SettingsPage';

import {
  generateInvoices,
  generateOrders,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  SEED_PRODUCTS
} from './utils/seedData';

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", icon: "dashboard" },
  { id: "invoices", label: "Invoices", icon: "invoice" },
  { id: "orders", label: "Sales Orders", icon: "orders" },
  { id: "customers", label: "Customers", icon: "customers" },
  { id: "products", label: "Products & Stock", icon: "products" },
  { id: "suppliers", label: "Suppliers", icon: "suppliers" },
  { id: "payments", label: "Payments", icon: "payments" },
  { id: "receipts", label: "Receipt Scanner", icon: "receipts" },
  { id: "accounting", label: "Accounting", icon: "accounting" },
  { id: "reports", label: "Reports", icon: "reports" },
  { id: "crm", label: "CRM Pipeline", icon: "crm" },
  { id: "eventlog", label: "Event Log", icon: "activity" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [inv, ord, cust, sup, prod] = await Promise.all([
        api.get("/invoices"),
        api.get("/orders"),
        api.get("/customers"),
        api.get("/suppliers"),
        api.get("/products"),
      ]);
      setInvoices(inv.map(i => ({ ...i, customer: i.customer_name || i.customer, customerId: i.customer_id, dueDate: i.due_date })));
      setOrders(ord.map(o => ({ ...o, customer: o.customer_name || o.customer, customerId: o.customer_id })));
      setCustomers(cust);
      setSuppliers(sup);
      setProducts(prod);
      setLoading(false);
    } catch (err) {
      console.error("[API] Load failed, using seed data:", err);
      setInvoices(generateInvoices());
      setOrders(generateOrders());
      setCustomers(SEED_CUSTOMERS);
      setSuppliers(SEED_SUPPLIERS);
      setProducts(SEED_PRODUCTS);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Show the app after 4 seconds regardless — Render free tier wakes up slowly
    const timeout = setTimeout(() => setLoading(false), 4000);
    loadData().finally(() => { clearTimeout(timeout); setLoading(false); });
  }, [loadData]);

  useEffect(() => {
    let ws;
    try {
      ws = connectWebSocket((event) => {
        if (event.type === "CONNECTED") { setWsConnected(true); return; }
        const refreshEvents = ["INVOICE_CREATED","INVOICE_SENT","PAYMENT_RECEIVED","CUSTOMER_CREATED","PRODUCT_CREATED","STOCK_UPDATED","ORDER_CREATED","ORDER_CONVERTED","RECEIPT_PROCESSED"];
        if (refreshEvents.includes(event.type)) {
          loadData();
        }
      });
    } catch (_) {}
    return () => { if (ws) ws.close(); };
  }, [loadData]);

  const ctx = { invoices, setInvoices, orders, setOrders, customers, setCustomers, suppliers, setSuppliers, products, setProducts };

  const pages = {
    dashboard: <DashboardPage />,
    invoices: <InvoicesPage />,
    orders: <OrdersPage />,
    customers: <CustomersPage />,
    suppliers: <SuppliersPage />,
    products: <ProductsPage />,
    payments: <PaymentsPage />,
    receipts: <ReceiptsPage />,
    accounting: <AccountingPage />,
    reports: <ReportsPage />,
    crm: <CRMPage />,
    eventlog: <EventLogPage />,
    settings: <SettingsPage />,
  };

  if (loading) {
    return (
      <>
        <style>{globalCSS}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: THEME.bg }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg, ${THEME.accent}, #8B5CF6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 800, color: "#fff", margin: "0 auto 16px" }}>A</div>
            <p style={{ color: THEME.textMuted, fontSize: "14px" }}>Loading AMHA ERP...</p>
            <p style={{ color: THEME.textDim, fontSize: "12px", marginTop: "8px" }}>Waking up server, please wait...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <ToastContainer>
      <AppContext.Provider value={ctx}>
        <style>{globalCSS}</style>
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          <aside style={{
            width: sidebarCollapsed ? "68px" : "240px",
            background: THEME.surface,
            borderRight: `1px solid ${THEME.border}`,
            display: "flex", flexDirection: "column",
            transition: "width 0.25s ease",
            overflow: "hidden", flexShrink: 0
          }}>
            <div style={{
              padding: sidebarCollapsed ? "20px 12px" : "20px 20px",
              borderBottom: `1px solid ${THEME.border}`,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "12px"
            }} onClick={() => setSidebarCollapsed(p => !p)}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                background: `linear-gradient(135deg, ${THEME.accent}, #8B5CF6)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 800, color: "#fff"
              }}>A</div>
              {!sidebarCollapsed && (
                <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, lineHeight: "1.2" }}>AMHA</p>
                  <p style={{ fontSize: "10px", color: THEME.textDim, letterSpacing: "0.04em" }}>FOOD & STUFF</p>
                </div>
              )}
            </div>

            <nav style={{ flex: 1, padding: "12px 8px", overflow: "auto" }}>
              {NAV_ITEMS.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      width: "100%", padding: sidebarCollapsed ? "12px" : "10px 14px",
                      borderRadius: "8px", marginBottom: "2px",
                      background: isActive ? THEME.accentLight : "transparent",
                      color: isActive ? THEME.accent : THEME.textMuted,
                      border: "none", fontSize: "14px", fontWeight: isActive ? 600 : 400,
                      transition: "all 0.15s",
                      justifyContent: sidebarCollapsed ? "center" : "flex-start"
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            {!sidebarCollapsed && (
              <div style={{ padding: "16px 20px", borderTop: `1px solid ${THEME.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: THEME.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff" }}>A</div>
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ fontSize: "13px", fontWeight: 500 }}>Admin User</p>
                    <p style={{ fontSize: "11px", color: THEME.textDim }}>
                      <span style={{ color: wsConnected ? THEME.success : THEME.warning, marginRight: "4px" }}>●</span>
                      {wsConnected ? "Live" : "Connecting..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>

          <main style={{ flex: 1, overflow: "auto" }}>
            <header style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 32px",
              borderBottom: `1px solid ${THEME.border}`,
              background: THEME.surface,
              position: "sticky", top: 0, zIndex: 100
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: THEME.textDim }}><Icon name="search" size={16} /></div>
                  <input placeholder="Search anything..." style={{ paddingLeft: "38px", background: THEME.bg, border: `1px solid ${THEME.border}`, width: "320px", borderRadius: "8px", color: THEME.text }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative" }}>
                  <button style={{ background: "none", border: "none", color: THEME.textMuted, padding: "8px", borderRadius: "8px" }}><Icon name="bell" size={20} /></button>
                  <div style={{ position: "absolute", top: "6px", right: "6px", width: "8px", height: "8px", borderRadius: "50%", background: THEME.danger }} />
                </div>
                <div style={{ padding: "6px 14px", background: THEME.bg, borderRadius: "8px", fontSize: "12px", color: THEME.textMuted }}>
                  <span style={{ color: wsConnected ? THEME.success : THEME.warning, marginRight: "6px" }}>●</span>
                  AMHA FOOD & STUFF TRADING L.L.C
                </div>
              </div>
            </header>

            <div style={{ padding: "24px 32px", minHeight: "calc(100vh - 57px)" }}>
              {pages[activePage]}
            </div>
          </main>
        </div>
      </AppContext.Provider>
    </ToastContainer>
  );
}
