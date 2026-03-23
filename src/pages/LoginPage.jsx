import React, { useState } from 'react';
import THEME from '../styles/theme';

const CREDENTIALS = { email: 'info@amha.com', password: 'Amha2026!' };

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (email.trim().toLowerCase() === CREDENTIALS.email && password === CREDENTIALS.password) {
        localStorage.setItem('amha_auth', '1');
        onLogin();
      } else {
        setError('Incorrect email or password.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '400px', background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '20px', padding: '48px 40px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `linear-gradient(135deg, ${THEME.accent}, #8B5CF6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 auto 14px' }}>A</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: THEME.text, marginBottom: '4px' }}>AMHA ERP</div>
          <div style={{ fontSize: '13px', color: THEME.textDim, letterSpacing: '0.05em' }}>FOOD &amp; STUFF TRADING L.L.C</div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: THEME.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email Address
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="info@amha.com"
              required
              style={{ width: '100%', background: THEME.bg, border: `1px solid ${error ? THEME.danger : THEME.border}`, borderRadius: '10px', color: THEME.text, padding: '12px 16px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: THEME.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', background: THEME.bg, border: `1px solid ${error ? THEME.danger : THEME.border}`, borderRadius: '10px', color: THEME.text, padding: '12px 44px 12px 16px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: THEME.textDim, cursor: 'pointer', fontSize: '13px', padding: '4px' }}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: `${THEME.danger}15`, border: `1px solid ${THEME.danger}40`, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: THEME.danger, marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: loading ? THEME.textDim : THEME.accent, color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: THEME.textDim }}>
          AMHA FOODSTUFF TRADING L.L.C · Dubai, UAE
        </div>
      </div>
    </div>
  );
}
