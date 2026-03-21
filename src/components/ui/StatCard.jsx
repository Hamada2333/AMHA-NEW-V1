import React from 'react';
import THEME from '../../styles/theme';
import Icon from './Icon';

export const StatCard = ({ title, value, icon, color }) => (
  <div style={{
    background: THEME.card, borderRadius: "16px", padding: "20px",
    border: `1px solid ${THEME.border}`, position: "relative", overflow: "hidden"
  }}>
    <div style={{ position: "absolute", top: "-10px", right: "-10px", opacity: 0.05, transform: "scale(2)" }}>
      <Icon name={icon} size={64} color={color} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${color}1A`, color, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} />
      </div>
      <h3 style={{ fontSize: "14px", fontWeight: 600, color: THEME.textMuted }}>{title}</h3>
    </div>
    <p style={{ fontSize: "28px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: THEME.text }}>{value}</p>
  </div>
);

export default StatCard;
