"use client";
import { useState, useEffect } from "react";

export default function SettingsModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("používateľ");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [editUserRole, setEditUserRole] = useState("používateľ");
  
  // Roles state
  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");

  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setRoles(sortedData);
        if (sortedData.length > 0) {
          // Default to the first role or 'používateľ' if present
          const hasPoužívateľ = sortedData.find(r => r.name === 'používateľ');
          setNewUserRole(hasPoužívateľ ? 'používateľ' : sortedData[0].name);
        }
      }
    } catch (e) {
      console.error("Failed to fetch roles", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchRoles();
      setError("");
      setNewUsername("");
      setNewPassword("");
      setEditingUserId(null);
      setEditPassword("");
      setNewRoleName("");
      setEditingRoleId(null);
      setEditRoleName("");
      setActiveTab("users");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError("");
    if (!newUsername || !newPassword) {
      setError("Meno aj heslo sú povinné");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newUserRole })
      });
      const data = await res.json();
      if (res.ok) {
        setNewUsername("");
        setNewPassword("");
        fetchUsers();
      } else {
        setError(data.error || "Nepodarilo sa pridať používateľa");
      }
    } catch (err) {
      setError("Chyba spojenia so serverom");
    }
  };

  const handleUpdateUser = async (id) => {
    setError("");
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: editPassword, role: editUserRole })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingUserId(null);
        setEditPassword("");
        fetchUsers();
      } else {
        setError(data.error || "Nepodarilo sa upraviť používateľa");
      }
    } catch (err) {
      setError("Chyba spojenia so serverom");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Naozaj chcete vymazať tohto používateľa?")) return;
    setError("");
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
      } else {
        setError(data.error || "Nepodarilo sa vymazať používateľa");
      }
    } catch (err) {
      setError("Chyba spojenia so serverom");
    }
  };

  // Roles CRUD handlers
  const handleAddRole = async (e) => {
    e.preventDefault();
    setError("");
    if (!newRoleName) {
      setError("Názov oprávnenia je povinný");
      return;
    }
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName })
      });
      const data = await res.json();
      if (res.ok) {
        setNewRoleName("");
        fetchRoles();
      } else {
        setError(data.error || "Nepodarilo sa pridať oprávnenie");
      }
    } catch (err) {
      setError("Chyba spojenia so serverom");
    }
  };

  const handleUpdateRole = async (id) => {
    setError("");
    if (!editRoleName) {
      setError("Názov oprávnenia nemôže byť prázdny");
      return;
    }
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editRoleName })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingRoleId(null);
        setEditRoleName("");
        fetchRoles();
      } else {
        setError(data.error || "Nepodarilo sa zmeniť oprávnenie");
      }
    } catch (err) {
      setError("Chyba spojenia so serverom");
    }
  };

  const handleDeleteRole = async (id) => {
    if (!confirm("Naozaj chcete vymazať toto oprávnenie?")) return;
    setError("");
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        fetchRoles();
      } else {
        setError(data.error || "Nepodarilo sa vymazať oprávnenie");
      }
    } catch (err) {
      setError("Chyba spojenia so serverom");
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="modal-content" 
        style={{ 
          width: '70vw', 
          height: '70vh', 
          maxWidth: '1200px', 
          maxHeight: '800px', 
          minWidth: '700px', 
          minHeight: '500px', 
          backgroundColor: '#1e293b', 
          border: '2px solid #475569', 
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #475569', padding: '16px 24px', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--accent)', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Nastavenia</h2>
          <button className="btn-close" style={{ color: '#ef4444', fontSize: '2.4rem', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={onClose}>&times;</button>
        </div>

        {/* Dual-Pane Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar */}
          <div style={{ width: '220px', backgroundColor: '#0f172a', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '12px 0', flexShrink: 0 }}>
            <button
              onClick={() => { setActiveTab("users"); setError(""); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 24px',
                background: activeTab === "users" ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: 'none',
                borderLeft: activeTab === "users" ? '4px solid #38bdf8' : '4px solid transparent',
                color: activeTab === "users" ? '#38bdf8' : '#94a3b8',
                textAlign: 'left',
                fontSize: '1.4rem',
                fontWeight: activeTab === "users" ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Používatelia
            </button>

            <button
              onClick={() => { setActiveTab("roles"); setError(""); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 24px',
                background: activeTab === "roles" ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: 'none',
                borderLeft: activeTab === "roles" ? '4px solid #38bdf8' : '4px solid transparent',
                color: activeTab === "roles" ? '#38bdf8' : '#94a3b8',
                textAlign: 'left',
                fontSize: '1.4rem',
                fontWeight: activeTab === "roles" ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Oprávnenia
            </button>
          </div>

          {/* Right Content Area */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '4px', color: '#f87171', fontSize: '1.3rem' }}>
                {error}
              </div>
            )}

            {activeTab === "users" && (
              <>
                {/* User List Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Aktuálni používatelia</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{ display: 'flex', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', padding: '12px 16px', fontWeight: '600', fontSize: '1.4rem', color: '#94a3b8' }}>
                      <div style={{ flex: 2 }}>Meno</div>
                      <div style={{ flex: 1.5 }}>Oprávnenie</div>
                      <div style={{ flex: 3.5, textAlign: 'right' }}>Úpravy</div>
                    </div>
                    {/* Table Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '250px', overflowY: 'auto' }}>
                      {users.map((u, index) => {
                        const isEditing = editingUserId === u.id;
                        return (
                          <div 
                            key={u.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              padding: '12px 16px', 
                              backgroundColor: index % 2 === 0 ? '#1e293b' : '#1b2537', 
                              borderBottom: index === users.length - 1 ? 'none' : '1px solid #334155',
                              fontSize: '1.4rem'
                            }}
                          >
                            <div style={{ flex: 2, fontWeight: '500', color: '#f1f5f9' }}>
                              {u.username}
                            </div>
                            <div style={{ flex: 1.5 }}>
                              {isEditing ? (
                                <select
                                  value={editUserRole}
                                  onChange={(e) => setEditUserRole(e.target.value)}
                                  style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '4px 8px', color: '#f1f5f9', fontSize: '1.3rem', width: '130px' }}
                                >
                                  {roles.map(r => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                  {u.role || 'používateľ'}
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 3.5, display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <input
                                    type="password"
                                    placeholder="Nové heslo"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '6px 12px', color: '#f1f5f9', fontSize: '1.3rem', width: '135px' }}
                                  />
                                  <button
                                    onClick={() => handleUpdateUser(u.id)}
                                    style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600' }}
                                  >
                                    Uložiť
                                  </button>
                                  <button
                                    onClick={() => { setEditingUserId(null); setEditPassword(""); }}
                                    style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600' }}
                                  >
                                    Zrušiť
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditingUserId(u.id); setEditUserRole(u.role || 'používateľ'); setEditPassword(""); }}
                                    style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', padding: '6px 12px', cursor: 'pointer', fontSize: '1.2rem', transition: 'background 0.2s', fontWeight: '500' }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                  >
                                    Zmeniť heslo
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', padding: '6px 12px', cursor: 'pointer', fontSize: '1.2rem', transition: 'background 0.2s', fontWeight: '500' }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                  >
                                    Vymazať
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Add User Form */}
                <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '10px' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Pridať nového používateľa</h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Používateľské meno"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      style={{ flex: 2, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '8px 12px', color: '#f1f5f9', fontSize: '1.3rem' }}
                    />
                    <input
                      type="password"
                      placeholder="Heslo"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ flex: 2, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '8px 12px', color: '#f1f5f9', fontSize: '1.3rem' }}
                    />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      style={{ flex: 1.5, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '8px 12px', color: '#f1f5f9', fontSize: '1.3rem', height: '37px' }}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '10px 16px', cursor: 'pointer', fontSize: '1.4rem', fontWeight: '600', alignSelf: 'flex-start', marginTop: '6px' }}
                  >
                    + Pridať používateľa
                  </button>
                </form>
              </>
            )}

            {activeTab === "roles" && (
              <>
                {/* Roles List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Aktuálne oprávnenia</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {roles.map(r => (
                      <div key={r.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', gap: '12px' }}>
                        {editingRoleId === r.id ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Názov oprávnenia"
                                value={editRoleName}
                                onChange={(e) => setEditRoleName(e.target.value)}
                                style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '6px 12px', color: '#f1f5f9', fontSize: '1.3rem', width: '180px' }}
                              />
                              <button
                                onClick={() => handleUpdateRole(r.id)}
                                style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600' }}
                              >
                                Uložiť
                              </button>
                              <button
                                onClick={() => { setEditingRoleId(null); setEditRoleName(""); }}
                                style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600' }}
                              >
                                Zrušiť
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span 
                              onClick={() => { setEditingRoleId(r.id); setEditRoleName(r.name); }}
                              title="Kliknite pre úpravu"
                              style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '500', 
                                color: '#38bdf8', 
                                cursor: 'pointer',
                                transition: 'color 0.2s'
                              }}
                              onMouseOver={(e) => e.target.style.color = '#7dd3fc'}
                              onMouseOut={(e) => e.target.style.color = '#38bdf8'}
                            >
                              {r.name}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }}
                                title="Vymazať oprávnenie"
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  color: '#ef4444', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  padding: '6px',
                                  borderRadius: '50%',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Role Form */}
                <form onSubmit={handleAddRole} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '10px' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Pridať nové oprávnenie</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Názov oprávnenia (napr. admin, používateľ)"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '8px 12px', color: '#f1f5f9', fontSize: '1.3rem' }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '10px 16px', cursor: 'pointer', fontSize: '1.4rem', fontWeight: '600', alignSelf: 'flex-start', marginTop: '6px' }}
                  >
                    + Pridať oprávnenie
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #475569', padding: '12px 24px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end', backgroundColor: '#0f172a' }}>
          <button className="btn-modal btn-ok" style={{ padding: '8px 20px', fontSize: '1.4rem' }} onClick={onClose}>Hotovo</button>
        </div>
      </div>
    </div>
  );
}
