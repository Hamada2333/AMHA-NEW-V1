import React from 'react';
import THEME from '../styles/theme';
import PageHeader from '../components/ui/PageHeader';
import Btn from '../components/ui/Btn';
import EmptyState from '../components/ui/EmptyState';
import Card from '../components/ui/Card';

export const SettingsPage = () => (
  <div style={{ animation: "fadeIn 0.3s ease", height: "100%", display: "flex", flexDirection: "column" }}>
    <PageHeader 
      title="System Settings" 
      subtitle="Configure application preferences and integrations" 
      actions={<Btn>Save Changes</Btn>} 
    />
    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "32px", flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {["General Overview", "Company Profile", "Tax & Compliance", "User Management", "Integrations", "Audit Log Defaults"].map((item, i) => (
          <button key={item} style={{
            padding: "12px 16px", textAlign: "left", borderRadius: "8px", border: "none",
            background: i === 0 ? THEME.surface : "transparent",
            color: i === 0 ? THEME.text : THEME.textMuted,
            fontWeight: i === 0 ? 600 : 400, transition: "all 0.2s"
          }}>{item}</button>
        ))}
      </div>
      <Card>
        <EmptyState icon="settings" title="Configuration Module" desc="Administrative settings and user roles will be configurable here." />
      </Card>
    </div>
  </div>
);

export default SettingsPage;
