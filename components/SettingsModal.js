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
  const [rolePickerUserId, setRolePickerUserId] = useState(null);
  
  // Roles state
  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");

  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [permissions, setPermissions] = useState({ edit_users: false, edit_switches: false, edit_roles: false, view_logs: false });

  // Logs state
  const [switches, setSwitches] = useState([]);
  const [logSwitchId, setLogSwitchId] = useState('');
  const [logEntries, setLogEntries] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const fetchPermissions = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data && data.permissions) {
          setPermissions(data.permissions);
        }
      }
    } catch (e) {
      console.error("Failed to fetch permissions", e);
    }
  };

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

  const fetchSwitchesList = async () => {
    try {
      const res = await fetch('/api/switches');
      if (res.ok) setSwitches(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchLogs = async (switchId) => {
    if (!switchId) { setLogEntries([]); return; }
    setLogLoading(true);
    try {
      const res = await fetch(`/api/switches/${switchId}/changelog`);
      if (res.ok) {
        const data = await res.json();
        setLogEntries(data.logs || []);
      }
    } catch (e) { console.error(e); }
    setLogLoading(false);
  };

  const handleExportCSV = () => {
    if (logEntries.length === 0) return;
    
    const headers = ["Čas", "Port", "Pole", "Stará hodnota", "Nová hodnota", "Zmenil", "Zdroj"];
    const rows = logEntries.map(entry => [
      entry.changed_at || "",
      entry.port_name || "",
      entry.field || "",
      entry.old_value || "",
      entry.new_value || "",
      entry.changed_by || "",
      entry.source === 'external' ? "Externá zmena" : "Cez aplikáciu"
    ]);

    const escapeCsvValue = (val) => {
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvContent = [
      headers.map(escapeCsvValue).join(";"),
      ...rows.map(row => row.map(escapeCsvValue).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    const switchName = switches.find(sw => String(sw.id) === String(logSwitchId))?.name || "switch";
    const safeSwitchName = switchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    link.setAttribute("href", url);
    link.setAttribute("download", `log_zmien_${safeSwitchName}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchRoles();
      fetchPermissions();
      fetchSwitchesList();
      setError("");
      setNewUsername("");
      setNewPassword("");
      setEditingUserId(null);
      setEditPassword("");
      setNewRoleName("");
      setEditingRoleId(null);
      setEditRoleName("");
      setLogSwitchId('');
      setLogEntries([]);
      setActiveTab("users");
      setIsAddUserOpen(false);
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
        setIsAddUserOpen(false);
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

  const handleUpdateUserRole = async (userId, newRole) => {
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        setRolePickerUserId(null);
        fetchUsers();
      } else {
        setError(data.error || "Nepodarilo sa zmeniť oprávnenie");
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

            {permissions.view_logs && (
              <button
                onClick={() => { setActiveTab("logs"); setError(""); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 24px',
                  background: activeTab === "logs" ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: 'none',
                  borderLeft: activeTab === "logs" ? '4px solid #38bdf8' : '4px solid transparent',
                  color: activeTab === "logs" ? '#38bdf8' : '#94a3b8',
                  textAlign: 'left',
                  fontSize: '1.4rem',
                  fontWeight: activeTab === "logs" ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Logy
              </button>
            )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Aktuálni používatelia</h3>
                    {permissions.edit_users && (
                      <button
                        onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                        style={{
                          backgroundColor: isAddUserOpen ? '#ef4444' : '#22c55e',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 14px',
                          cursor: 'pointer',
                          fontSize: '1.3rem',
                          fontWeight: '600',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        {isAddUserOpen ? 'Zrušiť' : '+ Pridať používateľa'}
                      </button>
                    )}
                  </div>

                  {/* Add User Form */}
                  {permissions.edit_users && isAddUserOpen && (
                    <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Pridať nového používateľa</h3>
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
                          style={{ flex: 1.5, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '8px 12px', color: '#f1f5f9', fontSize: '1.3rem', outline: 'none', cursor: 'pointer' }}
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.name} style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}>{r.name}</option>
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
                  )}

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
                            <div style={{ flex: 1.5, position: 'relative' }}>
                              {rolePickerUserId === u.id ? (
                                <select
                                  autoFocus
                                  value={u.role || 'používateľ'}
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                  onBlur={() => setRolePickerUserId(null)}
                                  style={{ backgroundColor: '#1e293b', border: '1px solid #38bdf8', borderRadius: '6px', padding: '4px 8px', color: '#f1f5f9', fontSize: '1.2rem', width: '140px', cursor: 'pointer', outline: 'none' }}
                                >
                                  {roles.map(r => (
                                    <option key={r.id} value={r.name} style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}>{r.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  onClick={permissions.edit_users ? () => setRolePickerUserId(u.id) : undefined}
                                  title={permissions.edit_users ? 'Kliknite pre zmenu oprávnenia' : ''}
                                  style={{
                                    color: '#38bdf8',
                                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    fontSize: '1.2rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    cursor: permissions.edit_users ? 'pointer' : 'default',
                                    border: permissions.edit_users ? '1px solid transparent' : 'none',
                                    transition: 'border-color 0.2s, background 0.2s',
                                    display: 'inline-block'
                                  }}
                                  onMouseOver={(e) => { if (permissions.edit_users) { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.2)'; }}}
                                  onMouseOut={(e) => { if (permissions.edit_users) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.1)'; }}}
                                >
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
                                  {permissions.edit_users && (
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
                                  {!permissions.edit_users && (
                                    <span style={{ color: '#64748b', fontSize: '1.2rem' }}>Bez prístupu</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "roles" && (
              <>
                {/* Roles List Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{ display: 'flex', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', padding: '12px 16px', fontWeight: '600', fontSize: '1.4rem', color: '#94a3b8' }}>
                      <div style={{ flex: 2 }}>Oprávnenie</div>
                      <div style={{ flex: 1.6, textAlign: 'center' }}>Editovanie užívateľov</div>
                      <div style={{ flex: 1.6, textAlign: 'center' }}>Editovanie switchov</div>
                      <div style={{ flex: 1.6, textAlign: 'center' }}>Editovanie oprávnení</div>
                      <div style={{ flex: 1.6, textAlign: 'center' }}>Logy</div>
                      <div style={{ width: '40px', textAlign: 'right' }}></div>
                    </div>
                    {/* Table Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '250px', overflowY: 'auto' }}>
                      {roles.map((r, index) => {
                        const isEditing = editingRoleId === r.id;
                        return (
                          <div 
                            key={r.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              padding: '12px 16px', 
                              backgroundColor: index % 2 === 0 ? '#1e293b' : '#1b2537', 
                              borderBottom: index === roles.length - 1 ? 'none' : '1px solid #334155',
                              fontSize: '1.4rem'
                            }}
                          >
                            <div style={{ flex: 2 }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    placeholder="Názov oprávnenia"
                                    value={editRoleName}
                                    onChange={(e) => setEditRoleName(e.target.value)}
                                    style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '6px 12px', color: '#f1f5f9', fontSize: '1.3rem', width: '130px' }}
                                  />
                                  <button
                                    onClick={() => handleUpdateRole(r.id)}
                                    style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '600' }}
                                  >
                                    Uložiť
                                  </button>
                                  <button
                                    onClick={() => { setEditingRoleId(null); setEditRoleName(""); }}
                                    style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '600' }}
                                  >
                                    Zrušiť
                                  </button>
                                </div>
                              ) : (
                                <span 
                                  onClick={() => { if (permissions.edit_roles) { setEditingRoleId(r.id); setEditRoleName(r.name); } }}
                                  title={permissions.edit_roles ? "Kliknite pre úpravu" : ""}
                                  style={{ 
                                    fontWeight: '500', 
                                    color: '#38bdf8', 
                                    cursor: permissions.edit_roles ? 'pointer' : 'default',
                                    transition: 'color 0.2s'
                                  }}
                                  onMouseOver={(e) => { if (permissions.edit_roles) e.target.style.color = '#7dd3fc'; }}
                                  onMouseOut={(e) => { if (permissions.edit_roles) e.target.style.color = '#38bdf8'; }}
                                >
                                  {r.name}
                                </span>
                              )}
                            </div>
                            
                            {/* Checkbox: edit_users */}
                            <div style={{ flex: 1.8, display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="checkbox"
                                checked={r.edit_users === 1}
                                disabled={!permissions.edit_roles}
                                onChange={async (e) => {
                                  try {
                                    const res = await fetch(`/api/roles/${r.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ edit_users: e.target.checked })
                                    });
                                    if (res.ok) {
                                      fetchRoles();
                                    } else {
                                      const data = await res.json();
                                      setError(data.error || "Nepodarilo sa zmeniť oprávnenia");
                                    }
                                  } catch (err) {
                                    setError("Chyba pripojenia k serveru");
                                  }
                                }}
                                style={{ width: '18px', height: '18px', cursor: permissions.edit_roles ? 'pointer' : 'default' }}
                              />
                            </div>

                            {/* Checkbox: edit_switches */}
                            <div style={{ flex: 1.8, display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="checkbox"
                                checked={r.edit_switches === 1}
                                disabled={!permissions.edit_roles}
                                onChange={async (e) => {
                                  try {
                                    const res = await fetch(`/api/roles/${r.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ edit_switches: e.target.checked })
                                    });
                                    if (res.ok) {
                                      fetchRoles();
                                    } else {
                                      const data = await res.json();
                                      setError(data.error || "Nepodarilo sa zmeniť oprávnenia");
                                    }
                                  } catch (err) {
                                    setError("Chyba pripojenia k serveru");
                                  }
                                }}
                                style={{ width: '18px', height: '18px', cursor: permissions.edit_roles ? 'pointer' : 'default' }}
                              />
                            </div>

                            {/* Checkbox: edit_roles */}
                            <div style={{ flex: 1.6, display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="checkbox"
                                checked={r.edit_roles === 1}
                                disabled={!permissions.edit_roles}
                                onChange={async (e) => {
                                  try {
                                    const res = await fetch(`/api/roles/${r.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ edit_roles: e.target.checked })
                                    });
                                    if (res.ok) {
                                      fetchRoles();
                                    } else {
                                      const data = await res.json();
                                      setError(data.error || "Nepodarilo sa zmeniť oprávnenia");
                                    }
                                  } catch (err) {
                                    setError("Chyba pripojenia k serveru");
                                  }
                                }}
                                style={{ width: '18px', height: '18px', cursor: permissions.edit_roles ? 'pointer' : 'default' }}
                              />
                            </div>

                            {/* Checkbox: view_logs */}
                            <div style={{ flex: 1.6, display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="checkbox"
                                checked={r.view_logs === 1}
                                disabled={!permissions.edit_roles}
                                onChange={async (e) => {
                                  try {
                                    const res = await fetch(`/api/roles/${r.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ view_logs: e.target.checked })
                                    });
                                    if (res.ok) {
                                      fetchRoles();
                                    } else {
                                      const data = await res.json();
                                      setError(data.error || "Nepodarilo sa zmeniť oprávnenia");
                                    }
                                  } catch (err) {
                                    setError("Chyba pripojenia k serveru");
                                  }
                                }}
                                style={{ width: '18px', height: '18px', cursor: permissions.edit_roles ? 'pointer' : 'default' }}
                              />
                            </div>

                            {/* Delete X Button */}
                            <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                              {permissions.edit_roles && r.name !== 'admin' && !isEditing && (
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
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Add Role Form */}
                {permissions.edit_roles && (
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
                )}
              </>
            )}

            {activeTab === "logs" && permissions.view_logs && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Log zmien portov</h3>
                    <select
                      value={logSwitchId}
                      onChange={e => { setLogSwitchId(e.target.value); fetchLogs(e.target.value); }}
                      style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', padding: '6px 12px', color: '#f1f5f9', fontSize: '1.3rem', cursor: 'pointer' }}
                    >
                      <option value="">-- Vybrať switch --</option>
                      {switches.map(sw => (
                        <option key={sw.id} value={sw.id}>{sw.name} ({sw.ip_address})</option>
                      ))}
                    </select>
                    {logSwitchId && (
                      <button
                        onClick={() => fetchLogs(logSwitchId)}
                        style={{ background: 'transparent', border: '1px solid #475569', borderRadius: '6px', padding: '6px 12px', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                      >↻ Obnoviť</button>
                    )}
                    {logSwitchId && logEntries.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        style={{ 
                          backgroundColor: '#22c55e', 
                          border: 'none', 
                          borderRadius: '6px', 
                          padding: '6px 12px', 
                          color: '#fff', 
                          fontSize: '1.3rem', 
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Exportovať do Excelu
                      </button>
                    )}
                  </div>

                  {logLoading && <div style={{ color: '#64748b', fontSize: '1.3rem' }}>Načítavam...</div>}

                  {!logLoading && logSwitchId && logEntries.length === 0 && (
                    <div style={{ color: '#64748b', fontSize: '1.3rem', padding: '20px', textAlign: 'center', border: '1px dashed #334155', borderRadius: '8px' }}>Žiadne záznamy pre tento switch.</div>
                  )}

                  {!logLoading && logEntries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden', flex: 1, minHeight: 0 }}>
                      {/* Table Header */}
                      <div style={{ display: 'flex', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', padding: '10px 16px', fontWeight: '600', fontSize: '1.25rem', color: '#94a3b8' }}>
                        <div style={{ width: '160px', flexShrink: 0 }}>Čas</div>
                        <div style={{ width: '75px', flexShrink: 0 }}>Port</div>
                        <div style={{ width: '100px', flexShrink: 0 }}>Pole</div>
                        <div style={{ flex: 1 }}>Zmena</div>
                        <div style={{ width: '77px', flexShrink: 0 }}>Zmenil</div>
                        <div style={{ width: '60px', flexShrink: 0, textAlign: 'center' }}>Zdroj</div>
                      </div>
                      {/* Table Body */}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', minHeight: 0 }}>
                        {logEntries.map((entry, idx) => {
                          const isExternal = entry.source === 'external';
                          return (
                            <div
                              key={entry.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '9px 16px',
                                backgroundColor: isExternal
                                  ? (idx % 2 === 0 ? 'rgba(251,146,60,0.07)' : 'rgba(251,146,60,0.04)')
                                  : (idx % 2 === 0 ? '#1e293b' : '#1b2537'),
                                borderBottom: idx === logEntries.length - 1 ? 'none' : '1px solid #334155',
                                fontSize: '1.0rem'
                              }}
                            >
                              <div style={{ width: '160px', flexShrink: 0, color: '#64748b', fontFamily: 'monospace', fontSize: '0.9rem' }}>{entry.changed_at}</div>
                              <div style={{ width: '75px', flexShrink: 0, color: '#38bdf8', fontWeight: '600' }}>{entry.port_name}</div>
                              <div style={{ width: '100px', flexShrink: 0, color: '#94a3b8' }}>{entry.field}</div>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <span style={{ color: '#f87171', fontSize: '0.9rem' }}>{entry.old_value || '—'}</span>
                                <span style={{ color: '#475569' }}>→</span>
                                <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>{entry.new_value || '—'}</span>
                              </div>
                              <div style={{ width: '77px', flexShrink: 0, color: '#f1f5f9' }}>{entry.changed_by}</div>
                              <div style={{ width: '60px', flexShrink: 0, textAlign: 'center' }}>
                                {isExternal ? (
                                  <span title="Externá zmena" style={{ color: '#fb923c', fontSize: '1.05rem' }}>⚠️</span>
                                ) : (
                                  <span title="Zmena cez aplikáciu" style={{ color: '#4ade80', fontSize: '0.9rem' }}>✓</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
