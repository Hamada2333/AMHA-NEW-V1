import React from 'react';
import THEME from '../../styles/theme';

export const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "6px" }}>{title}</h1>
      {subtitle && <p style={{ color: THEME.textMuted, fontSize: "14px" }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: "12px" }}>{actions}</div>}
  </div>
);

export default PageHeader;
