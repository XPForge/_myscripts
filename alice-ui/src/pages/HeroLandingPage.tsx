// Recreated from the published Framer page (https://fun-one-628793.framer.app/)
// so it's a real, editable part of this app rather than an iframe embed.
// Background photo and hero copy are pulled directly from that page's source;
// the image is stored locally in public/ so this page has no runtime
// dependency on Framer's hosting.
import { useState } from "react";
import {
  clearDiscoveryIdentity,
  clearSavedDiscoverySession,
  hasSavedDiscoverySession,
  loadDiscoveryIdentity,
  saveDiscoveryIdentity,
} from "../services/discoveryIdentity";

const LIGHTHOUSE_BACKGROUND_IMAGE = "/lighthouse-hero-background.jpg";
const CONTENT_MAX_WIDTH = "520px";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  padding: "12px 14px",
  fontSize: "0.92rem",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#ffffff",
  padding: "13px 16px",
  fontSize: "0.95rem",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(37,99,235,0.4)",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.28)",
  background: "rgba(255,255,255,0.06)",
  color: "#f1f5f9",
  padding: "13px 16px",
  fontSize: "0.95rem",
  fontWeight: 700,
  cursor: "pointer",
};

function DiscoveryCapture() {
  const [identity, setIdentity] = useState(() => loadDiscoveryIdentity());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const enterDiscovery = () => {
    window.location.href = "/discovery";
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    saveDiscoveryIdentity(name, email);
    enterDiscovery();
  };

  if (identity) {
    const hasSession = hasSavedDiscoverySession();
    return (
      <div style={{ display: "grid", gap: "14px", maxWidth: CONTENT_MAX_WIDTH }}>
        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
          Welcome back{identity.name ? `, ${identity.name}` : ""}
        </div>
        <div style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
          {hasSession
            ? "Pick up where you left off, or start a fresh Discovery session."
            : "Ready to begin your Discovery session?"}
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          {hasSession && (
            <button type="button" onClick={enterDiscovery} style={primaryButtonStyle}>
              Continue Discovery
            </button>
          )}
          <button
            type="button"
            onClick={() => {
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
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px", maxWidth: CONTENT_MAX_WIDTH }}>
      <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
        Your name (optional)
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          type="text"
          autoComplete="name"
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
        Email address
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          autoComplete="email"
          style={inputStyle}
        />
      </label>
      <button
        type="submit"
        disabled={!email.trim()}
        style={{ ...primaryButtonStyle, opacity: email.trim() ? 1 : 0.5, cursor: email.trim() ? "pointer" : "not-allowed", marginTop: "4px" }}
      >
        Start Discovery
      </button>
    </form>
  );
}

export default function HeroLandingPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "auto",
        backgroundImage: `linear-gradient(115deg, rgba(2,6,23,0.75) 20%, rgba(2,6,23,0.35) 55%, rgba(2,6,23,0.7) 100%), url(${LIGHTHOUSE_BACKGROUND_IMAGE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Tauri&display=swap" rel="stylesheet" />

      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px clamp(24px, 6vw, 96px) 64px clamp(32px, 10vw, 140px)",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "22px",
            color: "#ffffff",
            fontFamily: "'Google Sans', 'Inter', system-ui, sans-serif",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 400,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,221,150,0.86)",
              lineHeight: 1.2,
            }}
          >
            Project Lighthouse
            <br />
            Human discovery and alignment
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: "'Tauri', sans-serif",
              fontWeight: 400,
              fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              color: "#f6faff",
            }}
          >
            Welcome to Lighthouse
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.92)",
              fontWeight: 500,
              maxWidth: CONTENT_MAX_WIDTH,
            }}
          >
            Lighthouse turns guided conversation into a clearer picture of how a person thinks, learns, solves
            problems, and creates value.
          </p>

          <p
            style={{
              margin: 0,
              maxWidth: CONTENT_MAX_WIDTH,
              fontSize: "0.92rem",
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            Resumes show where someone worked. Applications show what they answered. Lighthouse helps reveal what
            those tools usually miss: patterns, capability, motivation, working style, environmental fit, and the
            conditions where someone can do their best work.
          </p>

          <div style={{ marginTop: "8px" }}>
            <DiscoveryCapture />
          </div>
        </div>
      </div>
    </div>
  );
}
