import React, { useState } from 'react';
import THEME from '../../styles/theme';
import Icon from './Icon';

export const Btn = ({ children, variant = "primary", icon, onClick, size = "md", style }) => {
  const [hover, setHover] = useState(false);
  const v = {
    primary: { bg: THEME.accent, color: "#fff", border: "transparent", hoverBg: "#2563EB" },
    secondary: { bg: THEME.surface, color: THEME.text, border: THEME.border, hoverBg: THEME.border },
    ghost: { bg: "transparent", color: THEME.accent, border: "transparent", hoverBg: THEME.accentLight },
    danger: { bg: `${THEME.danger}15`, color: THEME.danger, border: "transparent", hoverBg: `${THEME.danger}25` },
    success: { bg: `${THEME.success}15`, color: THEME.success, border: "transparent", hoverBg: `${THEME.success}25` },
  }[variant];

  const s = {
    sm: { padding: "6px 12px", fontSize: "13px" },
    md: { padding: "10px 18px", fontSize: "14px" },
  }[size];

  return (
    <button
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: hover ? v.hoverBg : v.bg, color: v.color, border: `1px solid ${v.border}`,
        borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px",
        fontWeight: 600, transition: "all 0.2s ease", ...s, ...style
      }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
};

export default Btn;
