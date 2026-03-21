import React from 'react';
import THEME from '../../styles/theme';

export const Badge = ({ status, children }) => {
  const c = {
    paid: { bg: `${THEME.success}1A`, color: THEME.success },
    sent: { bg: `${THEME.accent}1A`, color: THEME.accent },
    overdue: { bg: `${THEME.danger}1A`, color: THEME.danger },
    processing: { bg: `${THEME.purple}1A`, color: THEME.purple },
    draft: { bg: THEME.surface, color: THEME.textMuted },
  }[status] || { bg: THEME.surface, color: THEME.textMuted };

  return (
    <span style={{ 
      background: c.bg, color: c.color, 
      padding: "4px 10px", borderRadius: "20px", 
      fontSize: "11px", fontWeight: 700, 
      letterSpacing: "0.04em", textTransform: "uppercase" 
    }}>
      {children || status}
    </span>
  );
};

export default Badge;
