import React from 'react';
import THEME from '../../styles/theme';

export const FormField = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{ fontSize: "12px", fontWeight: 600, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.02em" }}>{label}</label>
    {children}
  </div>
);

export const FormRow = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
    {children}
  </div>
);
