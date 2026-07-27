"use client";
import { useState, useCallback } from "react";
import UserMenu from "./UserMenu";
import SettingsModal from "./SettingsModal";

export default function AppHeader({ username, version }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyVersion = useCallback(() => {
    try {
      // Fallback pre HTTP (navigator.clipboard vyžaduje HTTPS)
      const el = document.createElement('textarea');
      el.value = version;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopírovanie zlyhalo:', err);
    }
  }, [version]);

  return (
    <>
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="app-title" style={{ userSelect: 'none' }}>
          <span
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setIsSettingsOpen(true)}
            title="Nastavenia"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            Cisco Switch Manager
          </span>
          <span
            className="app-version"
            style={{ cursor: 'pointer' }}
            onClick={copyVersion}
            title={copied ? 'Skopírované! ✓' : 'Klikni pre skopírovanie'}
          >{copied ? '✓ Skopírované' : version}</span>
        </h1>
        <UserMenu username={username} />
      </header>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
