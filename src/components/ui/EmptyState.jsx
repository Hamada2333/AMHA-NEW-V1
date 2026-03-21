import React from 'react';
import THEME from '../../styles/theme';
import Icon from './Icon';

export const EmptyState = ({ icon, title, desc }) => (
  <div style={{ padding: "60px 20px", textAlign: "center", color: THEME.textMuted }}>
    <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: THEME.surface, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
      <Icon name={icon} size={32} color={THEME.textDim} />
    </div>
    <h3 style={{ fontSize: "16px", fontWeight: 600, color: THEME.text, marginBottom: "8px" }}>{title}</h3>
    <p style={{ fontSize: "14px" }}>{desc}</p>
  </div>
);

export default EmptyState;
