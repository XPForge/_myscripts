import { useState } from "react";
import {
  clearDiscoveryIdentity,
  clearSavedDiscoverySession,
  hasSavedDiscoverySession,
  loadDiscoveryIdentity,
  saveDiscoveryIdentity,
} from "../services/discoveryIdentity";

const cardWrapperStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: "linear-gradient(180deg, #020617 0%, #07102b 100%)",
  color: "#e2e8f0",
};

const cardStyle: React.CSSProperties = {
  width: "min(480px, 100%)",
  borderRadius: "22px",
  padding: "36px 28px",
  background: "rgba(15,23,42,0.96)",
  border: "1px solid rgba(148,163,184,0.12)",
  boxShadow: "0 28px 70px rgba(2,6,23,0.55)",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#ffffff",
  padding: "14px 16px",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.24)",
  background: "rgba(255,255,255,0.03)",
  color: "#cbd5e1",
  padding: "14px 16px",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
};

export default function DiscoveryEmailGatePage({ onEnter }: { onEnter: () => void }) {
  const [identity, setIdentity] = useState(() => loadDiscoveryIdentity());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    saveDiscoveryIdentity(name, email);
    onEnter();
  };

  if (identity) {
    const hasSession = hasSavedDiscoverySession();
    return (
      <div style={cardWrapperStyle}>
        <div style={cardStyle}>
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc" }}>
              Welcome back{identity.name ? `, ${identity.name}` : ""}
            </div>
            <div style={{ marginTop: "10px", color: "rgba(148,163,184,0.9)", lineHeight: 1.6 }}>
              {hasSession
                ? "Pick up where you left off, or start a fresh Discovery session."
                : "Ready to begin your Discovery session?"}
            </div>
          </div>
          <div style={{ display: "grid", gap: "12px" }}>
            {hasSession && (
              <button type="button" onClick={onEnter} style={primaryButtonStyle}>
                Continue Discovery
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                // A full new start: clear the conversation AND the identity, so
                // this goes all the way back to the name/email form below,
                // rather than skipping straight into a "blank" Discovery page.
                clearSavedDiscoverySession();
                clearDiscoveryIdentity();
                setName("");
                setEmail("");
                setIdentity(null);
              }}
              style={hasSession ? secondaryButtonStyle : primaryButtonStyle}
            >
              {hasSession ? "Start New Discovery Session" : "Start Discovery"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={cardWrapperStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc" }}>
            Lighthouse Discovery
          </div>
          <div style={{ marginTop: "10px", color: "rgba(148,163,184,0.9)", lineHeight: 1.6 }}>
            Enter your email to begin. We'll use it to create your profile.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "14px" }}>
            <div style={{ marginBottom: "8px", fontSize: "0.9rem", color: "rgba(226,232,240,0.82)" }}>
              Your name (optional)
            </div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              autoComplete="name"
              style={{
                width: "100%",
                borderRadius: "14px",
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(255,255,255,0.02)",
                color: "#eef2ff",
                padding: "14px 16px",
                fontSize: "0.95rem",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "18px" }}>
            <div style={{ marginBottom: "8px", fontSize: "0.9rem", color: "rgba(226,232,240,0.82)" }}>
              Email address
            </div>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              autoComplete="email"
              style={{
                width: "100%",
                borderRadius: "14px",
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(255,255,255,0.02)",
                color: "#eef2ff",
                padding: "14px 16px",
                fontSize: "0.95rem",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={!email.trim()}
            style={{
              width: "100%",
              borderRadius: "16px",
              border: "none",
              background: email.trim()
                ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                : "rgba(71,85,105,0.4)",
              color: "#ffffff",
              padding: "14px 16px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: email.trim() ? "pointer" : "not-allowed",
            }}
          >
            Start Discovery
          </button>
        </form>
      </div>
    </div>
  );
}
