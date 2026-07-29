// Recreated from the published Framer page (https://fun-one-628793.framer.app/)
// so it's a real, editable part of this app rather than an iframe embed.
// Background photo and hero copy are pulled directly from that page's source;
// the image is stored locally in public/ so this page has no runtime
// dependency on Framer's hosting.
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  clearDiscoveryIdentity,
  clearSavedDiscoverySession,
  hasSavedDiscoverySession,
  saveDiscoveryIdentity,
} from "../services/discoveryIdentity";
import { getCurrentUser, signIn, signOut, signUp, type AuthUser } from "../services/authClient";
import { clearLastVisitedPage, loadLastVisitedPage } from "../services/lastVisitedPage";

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
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser().then((current) => {
      // Already signed in and dropped here from somewhere else (a shared
      // link, a stale bookmark, session expiry recovery, etc.) — send them
      // straight back to whatever page they were last on rather than making
      // them click through the landing page again.
      if (current) {
        const lastPage = loadLastVisitedPage();
        if (lastPage) {
          window.location.href = lastPage;
          return;
        }
      }
      setUser(current);
      setChecking(false);
    });
  }, []);

  const enterDiscovery = () => {
    window.location.href = "/discovery";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const account = mode === "signup" ? await signUp(name, email, password) : await signIn(email, password);
      saveDiscoveryIdentity(account.name, account.email);
      enterDiscovery();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut().catch(() => undefined);
    clearSavedDiscoverySession();
    clearDiscoveryIdentity();
    clearLastVisitedPage();
    setUser(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  if (checking) {
    return <div style={{ maxWidth: CONTENT_MAX_WIDTH, minHeight: "160px" }} />;
  }

  if (user) {
    const hasSession = hasSavedDiscoverySession();
    return (
      <div style={{ display: "grid", gap: "14px", maxWidth: CONTENT_MAX_WIDTH }}>
        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
          Welcome back{user.name ? `, ${user.name}` : ""}
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
              enterDiscovery();
            }}
            style={hasSession ? secondaryButtonStyle : primaryButtonStyle}
          >
            {hasSession ? "Start New Discovery Session" : "Start Discovery"}
          </button>
          <button type="button" onClick={() => void handleSignOut()} style={{ ...secondaryButtonStyle, background: "transparent", border: "none", fontWeight: 500, fontSize: "0.82rem", opacity: 0.7 }}>
            Not you? Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "grid", gap: "12px", maxWidth: CONTENT_MAX_WIDTH }}>
      <div style={{ display: "flex", gap: "18px", fontSize: "0.85rem", fontWeight: 700 }}>
        <button
          type="button"
          onClick={() => { setMode("signup"); setError(""); }}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: mode === "signup" ? "#ffffff" : "rgba(255,255,255,0.5)", borderBottom: mode === "signup" ? "2px solid #60a5fa" : "2px solid transparent", paddingBottom: "4px" }}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: mode === "login" ? "#ffffff" : "rgba(255,255,255,0.5)", borderBottom: mode === "login" ? "2px solid #60a5fa" : "2px solid transparent", paddingBottom: "4px" }}
        >
          Log in
        </button>
      </div>
      {mode === "signup" && (
        <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
          Your name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            required
            autoComplete="name"
            style={inputStyle}
          />
        </label>
      )}
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
      <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
        Password
        <div style={{ position: "relative" }}>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            style={{ ...inputStyle, paddingRight: "40px" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              display: "flex",
            }}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      {error && <div style={{ fontSize: "0.82rem", color: "#fca5a5" }}>{error}</div>}
      <button
        type="submit"
        disabled={submitting || !email.trim() || password.length < 8 || (mode === "signup" && !name.trim())}
        style={{
          ...primaryButtonStyle,
          opacity: submitting ? 0.7 : 1,
          cursor: submitting ? "wait" : "pointer",
          marginTop: "4px",
        }}
      >
        {submitting ? "Please wait…" : mode === "signup" ? "Create account & start Discovery" : "Log in"}
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
