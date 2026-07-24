"use client";
import { useState, useEffect } from "react";

export default function ConnectModal({ isOpen, onClose, onConnect, ipAddress, prefilledUsername }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [enablePassword, setEnablePassword] = useState("");
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(prefilledUsername || "");
      setPassword("");
      setEnablePassword("");
      setRemember(false);
    }
  }, [isOpen, prefilledUsername]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConnect({ username, password, enablePassword, remember });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "400px" }}>
        <div className="modal-header">
          <h2>Connect to {ipAddress}</h2>
          <button className="btn-close" type="button" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input 
              type="text" 
              placeholder="SSH Username" 
              className="modal-input" 
              value={username} onChange={(e) => setUsername(e.target.value)} required 
            />
            <input 
              type="password" 
              placeholder="SSH Password" 
              className="modal-input" 
              value={password} onChange={(e) => setPassword(e.target.value)} required 
            />
            <input 
              type="password" 
              placeholder="Enable Password (Optional)" 
              className="modal-input" 
              value={enablePassword} onChange={(e) => setEnablePassword(e.target.value)} 
            />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember credentials
            </label>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn-modal btn-connect" style={{ width: "100%", padding: "0.75rem", borderRadius: "6px" }}>Connect</button>
          </div>
        </form>
      </div>
    </div>
  );
}
