import { THEME } from './theme';

export const globalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: ${THEME.bg};
    color: ${THEME.text};
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${THEME.textDim}; }

  button { cursor: pointer; font-family: inherit; }
  input, select, textarea {
    font-family: inherit; font-size: 14px;
    background: ${THEME.bg}; color: ${THEME.text};
    border: 1px solid ${THEME.border}; border-radius: 8px;
    padding: 10px 14px; width: 100%; transition: all 0.2s;
    outline: none;
  }
  input:focus, select:focus, textarea:focus {
    border-color: ${THEME.accent};
    box-shadow: 0 0 0 2px ${THEME.accentLight};
  }
  input::placeholder, textarea::placeholder { color: ${THEME.textDim}; }
  input:disabled { opacity: 0.5; cursor: not-allowed; }

  select { appearance: none; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A1A1AA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"); background-repeat: no-repeat; background-position: right 14px top 50%; background-size: 10px auto; padding-right: 32px; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  th { text-align: left; padding: 14px 16px; font-weight: 500; color: ${THEME.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid ${THEME.border}; background: ${THEME.surface}; position: sticky; top: 0; z-index: 10; }
  td { padding: 14px 16px; border-bottom: 1px solid ${THEME.border}; font-size: 14px; transition: background 0.15s; vertical-align: middle; }
  tr:hover td { background: ${THEME.bg}; }
  tr:last-child td { border-bottom: none; }

  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
`;

export default globalCSS;
