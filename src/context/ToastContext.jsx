import { createContext, useContext, useState, useCallback } from 'react';
import THEME from '../styles/theme';
import Icon from '../components/ui/Icon';

const ToastContext = createContext();

export const ToastContainer = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  
  const colors = { 
    info: THEME.accent, 
    success: THEME.success, 
    warning: THEME.warning, 
    error: THEME.danger, 
    processing: THEME.purple 
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: THEME.card, border: `1px solid ${colors[t.type] || THEME.border}`,
            borderLeft: `4px solid ${colors[t.type] || THEME.accent}`,
            borderRadius: "10px", padding: "14px 20px", minWidth: "300px", maxWidth: "420px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "slideIn 0.3s ease",
            display: "flex", alignItems: "center", gap: "10px"
          }}>
            {t.type === "processing" && <div style={{ width: "14px", height: "14px", border: `2px solid ${THEME.purple}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pulse 1s linear infinite" }} />}
            {t.type === "success" && <Icon name="check" size={16} color={THEME.success} />}
            {t.type === "error" && <Icon name="x" size={16} color={THEME.danger} />}
            <span style={{ fontSize: "13px", color: THEME.text }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export default ToastContext;
