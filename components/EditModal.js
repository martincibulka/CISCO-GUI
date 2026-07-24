"use client";
import { useState, useEffect } from "react";

export default function EditModal({ isOpen, onClose, switches, onRefresh }) {
  const [localSwitches, setLocalSwitches] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setLocalSwitches(switches);
    }
  }, [isOpen, switches]);

  if (!isOpen) return null;

  const handleUpdateField = (id, field, value) => {
    setLocalSwitches(prev => prev.map(sw => 
      sw.id === id ? { ...sw, [field]: value } : sw
    ));
  };

  const handleSave = async (id) => {
    const sw = localSwitches.find(s => s.id === id);
    if (!sw) return;

    try {
      const res = await fetch(`/api/switches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sw.name, ip_address: sw.ip_address, username: sw.username, password: sw.password, enable_password: sw.enable_password }),
      });
      if (res.ok) {
        onRefresh();
        // Option to show success feedback here
      }
    } catch (e) {
      console.error("Failed to update", e);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/switches/${id}`, { method: "DELETE" });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const handleAdd = async () => {
    try {
      const res = await fetch("/api/switches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Switch", ip_address: "192.168.1.1", username: "", password: "", enable_password: "" }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to add", e);
    }
  };

  const handleSaveAllAndClose = async () => {
    const promises = localSwitches.map(async (sw) => {
      const original = switches.find(s => s.id === sw.id);
      if (
        !original ||
        original.name !== sw.name ||
        original.ip_address !== sw.ip_address ||
        original.username !== sw.username ||
        original.password !== sw.password ||
        original.enable_password !== sw.enable_password
      ) {
        try {
          await fetch(`/api/switches/${sw.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: sw.name, ip_address: sw.ip_address, username: sw.username, password: sw.password, enable_password: sw.enable_password }),
          });
        } catch (e) {
          console.error("Failed to update", e);
        }
      }
    });

    await Promise.all(promises);
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Saved Switches</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {localSwitches.length === 0 ? (
            <p>No saved switches found.</p>
          ) : (
            <div className="switch-list">
              {localSwitches.map((sw) => (
                <div key={sw.id} className="switch-item">
                  <input 
                    type="text" 
                    value={sw.name} 
                    onChange={(e) => handleUpdateField(sw.id, "name", e.target.value)}
                    className="modal-input"
                    placeholder="Name"
                  />
                  <input 
                    type="text" 
                    value={sw.ip_address} 
                    onChange={(e) => handleUpdateField(sw.id, "ip_address", e.target.value)}
                    className="modal-input"
                    placeholder="IP Address"
                  />
                  <input 
                    type="text" 
                    value={sw.username || ""} 
                    onChange={(e) => handleUpdateField(sw.id, "username", e.target.value)}
                    className="modal-input"
                    placeholder="Username"
                  />
                  <input 
                    type="password" 
                    value={sw.password || ""} 
                    onChange={(e) => handleUpdateField(sw.id, "password", e.target.value)}
                    className="modal-input"
                    placeholder="Password"
                  />
                  <div className="modal-actions">
                    <button className="icon-btn btn-save" title="Save" onClick={() => handleSave(sw.id)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button className="icon-btn btn-delete" title="Delete" onClick={() => handleDelete(sw.id)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-modal btn-add" onClick={handleAdd}>Add switch</button>
          <button className="btn-modal btn-ok" onClick={handleSaveAllAndClose}>Ok</button>
        </div>
      </div>
    </div>
  );
}
