import React, { useEffect, useState } from 'react';
import THEME from '../../styles/theme';
import Icon from './Icon';

export const Modal = ({ open, onClose, title, children, width = 500 }) => {
  const [show, setShow] = useState(false);
  useEffect(() => { if (open) setShow(true); else setTimeout(() => setShow(false), 200); }, [open]);
  if (!show && !open) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      opacity: open ? 1 : 0, transition: "opacity 0.2s"
    }} onClick={onClose}>
      <div style={{
        background: THEME.surface, border: `1px solid ${THEME.border}`,
        borderRadius: "20px", width: "100%", maxWidth: `${width}px`,
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)", padding: "24px",
        transform: open ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", animation: "scaleIn 0.2s"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: THEME.textMuted, padding: "4px", borderRadius: "8px" }}><Icon name="x" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
