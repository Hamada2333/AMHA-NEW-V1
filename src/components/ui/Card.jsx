import React from 'react';
import THEME from '../../styles/theme';

export const Card = ({ children, style }) => (
  <div style={{
    background: THEME.card, borderRadius: "16px", padding: "24px",
    border: `1px solid ${THEME.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    ...style
  }}>
    {children}
  </div>
);

export default Card;
