"use client";
import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        window.location.href = "/";
        return;
      } 
      
      // Ak server vrati nieco, co nie je JSON (napr. Nginx HTML chybu)
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setError(data.error || "Prihlásenie zlyhalo");
      } else {
        const text = await res.text();
        console.error("Server error response:", text);
        setError(`Chyba servera (${res.status}): Pozrite konzolu prehliadača`);
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      setError("Nepodarilo sa spojiť so serverom. Skontrolujte pripojenie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg-color)" }}>
      <div className="pane" style={{ maxWidth: "400px", width: "90%", flex: "none", padding: "2rem" }}>
        <h2 style={{ textAlign: "center", color: "var(--accent)", marginBottom: "1.5rem" }}>Cisco Manager Login</h2>
        {error && <div style={{ color: "#ef4444", marginBottom: "1rem", textAlign: "center" }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input 
            type="text" 
            placeholder="Username" 
            style={{ background: "var(--input-bg)", color: "var(--text-main)", padding: "0.75rem", border: "1px solid var(--input-border)", outline: "none", borderRadius: "6px" }}
            value={username} onChange={(e) => setUsername(e.target.value)} required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            style={{ background: "var(--input-bg)", color: "var(--text-main)", padding: "0.75rem", border: "1px solid var(--input-border)", outline: "none", borderRadius: "6px" }}
            value={password} onChange={(e) => setPassword(e.target.value)} required 
          />
          <button type="submit" disabled={isLoading} className="btn-action btn-connect" style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem", borderRadius: "6px", opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}>
            {isLoading ? "Pripája sa..." : "Login"}
          </button>
        </form>
        <p style={{ marginTop: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Predvolené údaje: <strong>admin</strong> / <strong>admin</strong>
        </p>
      </div>
    </div>
  );
}
