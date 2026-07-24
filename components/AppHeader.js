"use client";
import { useState } from "react";
import UserMenu from "./UserMenu";
import SettingsModal from "./SettingsModal";

export default function AppHeader({ username, version }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 
          className="app-title" 
          style={{ cursor: 'pointer', userSelect: 'none' }}
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
          <span className="app-version">{version}</span>
        </h1>
        <UserMenu username={username} />
      </header>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
