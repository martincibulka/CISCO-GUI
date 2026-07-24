"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UserMenu({ username }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // null | 'rename' | 'password'
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setMode(null);
    setError('');
    setSuccess('');
    setNewUsername('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!newUsername.trim()) { setError('Meno nemôže byť prázdne'); return; }
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      const userId = meData?.userId;
      if (!userId) { setError('Nepodarilo sa načítať ID používateľa'); setLoading(false); return; }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Meno bolo zmenené. Stránka sa obnoví...');
        setTimeout(() => { router.refresh(); closeMenu(); }, 1500);
      } else {
        setError(data.error || 'Chyba pri zmene mena');
      }
    } catch {
      setError('Chyba spojenia');
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!newPassword) { setError('Zadajte nové heslo'); return; }
    if (newPassword !== confirmPassword) { setError('Heslá sa nezhodujú'); return; }
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      const userId = meData?.userId;
      if (!userId) { setError('Nepodarilo sa načítať ID používateľa'); setLoading(false); return; }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Heslo bolo zmenené.');
        setTimeout(() => closeMenu(), 1500);
      } else {
        setError(data.error || 'Chyba pri zmene hesla');
      }
    } catch {
      setError('Chyba spojenia');
    }
    setLoading(false);
  };

  const inputStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#f1f5f9',
    fontSize: '1.3rem',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  };

  const btnPrimaryStyle = {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '1.3rem',
    fontWeight: '600',
    flex: 1,
    transition: 'background 0.2s'
  };

  const btnSecondaryStyle = {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '1.3rem',
    flex: 1,
    transition: 'background 0.2s'
  };

  const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    cursor: 'pointer',
    color: '#cbd5e1',
    fontSize: '1.35rem',
    borderRadius: '6px',
    transition: 'background 0.15s, color 0.15s',
    userSelect: 'none'
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(o => !o); setMode(null); setError(''); setSuccess(''); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: open ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.05)',
          border: '1px solid',
          borderColor: open ? '#38bdf8' : 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '6px 14px',
          cursor: 'pointer',
          color: '#f1f5f9',
          fontSize: '1.35rem',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}
        title="Možnosti účtu"
      >
        {/* User icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span style={{ color: '#38bdf8' }}>{username}</span>
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          minWidth: '260px',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'dropdownFadeIn 0.15s ease'
        }}>
          <style>{`
            @keyframes dropdownFadeIn {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '1.35rem' }}>{username}</div>
              <div style={{ color: '#64748b', fontSize: '1.1rem' }}>Prihlásený používateľ</div>
            </div>
          </div>

          {/* Mode: main menu */}
          {!mode && (
            <div style={{ padding: '8px' }}>
              <div
                style={menuItemStyle}
                onClick={() => { setMode('rename'); setNewUsername(''); }}
                onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#cbd5e1'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Premenovať sa
              </div>
              <div
                style={menuItemStyle}
                onClick={() => { setMode('password'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#cbd5e1'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Zmeniť heslo
              </div>
              <div style={{ height: '1px', backgroundColor: '#334155', margin: '6px 8px' }} />
              <div
                style={{ ...menuItemStyle, color: '#f87171' }}
                onClick={handleLogout}
                onMouseOver={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#fca5a5'; }}
                onMouseOut={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#f87171'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Odhlásiť sa
              </div>
            </div>
          )}

          {/* Mode: rename */}
          {mode === 'rename' && (
            <form onSubmit={handleRename} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: '500' }}>Nové meno používateľa</div>
              <input
                type="text"
                placeholder={username}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                style={inputStyle}
                autoFocus
              />
              {error && <div style={{ color: '#f87171', fontSize: '1.2rem' }}>{error}</div>}
              {success && <div style={{ color: '#4ade80', fontSize: '1.2rem' }}>{success}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" style={btnSecondaryStyle} onClick={() => { setMode(null); setError(''); }}>Späť</button>
                <button type="submit" style={btnPrimaryStyle} disabled={loading}>{loading ? 'Ukladám...' : 'Uložiť'}</button>
              </div>
            </form>
          )}

          {/* Mode: change password */}
          {mode === 'password' && (
            <form onSubmit={handleChangePassword} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: '500' }}>Zmena hesla</div>
              <input
                type="password"
                placeholder="Nové heslo"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={inputStyle}
                autoFocus
              />
              <input
                type="password"
                placeholder="Potvrdiť heslo"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
              {error && <div style={{ color: '#f87171', fontSize: '1.2rem' }}>{error}</div>}
              {success && <div style={{ color: '#4ade80', fontSize: '1.2rem' }}>{success}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" style={btnSecondaryStyle} onClick={() => { setMode(null); setError(''); }}>Späť</button>
                <button type="submit" style={btnPrimaryStyle} disabled={loading}>{loading ? 'Ukladám...' : 'Zmeniť heslo'}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
