"use client";
import { useState, useEffect } from "react";

export default function SettingsModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setError("");
      setNewUsername("");
      setNewPassword("");
      setEditingUserId(null);
      setEditPassword("");
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
        body: JSON.stringify({ username: newUsername, password: newPassword })
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

  const handleUpdatePassword = async (id) => {
    setError("");
    if (!editPassword) {
      setError("Nové heslo nemôže byť prázdne");
      return;
    }
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: editPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingUserId(null);
        setEditPassword("");
        fetchUsers();
      } else {
        setError(data.error || "Nepodarilo sa zmeniť heslo");
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

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ width: '450px', backgroundColor: '#1e293b', border: '2px solid #475569', color: '#f1f5f9' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #475569', paddingBottom: '12px' }}>
          <h2 style={{ color: 'var(--accent)', fontSize: '1.8rem', fontWeight: 'bold' }}>Manažment používateľov</h2>
          <button className="btn-close" style={{ color: '#ef4444' }} onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '4px', color: '#f87171', fontSize: '1.3rem' }}>
              {error}
            </div>
          )}

          {/* User List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#94a3b8' }}>Aktuálni používatelia</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: '500', color: '#f1f5f9' }}>{u.username}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {editingUserId === u.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="password"
                          placeholder="Nové heslo"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '4px 8px', color: '#f1f5f9', fontSize: '1.2rem', width: '120px' }}
                        />
                        <button
                          onClick={() => handleUpdatePassword(u.id)}
                          style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '1.2rem' }}
                        >
                          Uložiť
                        </button>
                        <button
                          onClick={() => { setEditingUserId(null); setEditPassword(""); }}
                          style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '1.2rem' }}
                        >
                          Zrušiť
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingUserId(u.id)}
                          style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', padding: '4px 8px', cursor: 'pointer', fontSize: '1.2rem', transition: 'background 0.2s' }}
                          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          Zmeniť heslo
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', padding: '4px 8px', cursor: 'pointer', fontSize: '1.2rem', transition: 'background 0.2s' }}
                          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          Vymazať
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add User Form */}
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#94a3b8' }}>Pridať nového používateľa</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Meno"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '6px 10px', color: '#f1f5f9', fontSize: '1.3rem' }}
              />
              <input
                type="password"
                placeholder="Heslo"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '6px 10px', color: '#f1f5f9', fontSize: '1.3rem' }}
              />
            </div>
            <button
              type="submit"
              style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 12px', cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600', marginTop: '4px' }}
            >
              + Pridať používateľa
            </button>
          </form>
        </div>
        <div className="modal-footer" style={{ borderTop: '1px solid #475569', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-modal btn-ok" onClick={onClose}>Hotovo</button>
        </div>
      </div>
    </div>
  );
}
