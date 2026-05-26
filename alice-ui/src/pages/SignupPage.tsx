import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords must match.");
      return;
    }
    const result = auth.register(email, name, password);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(180deg, #020617 0%, #07102b 100%)",
        color: "#e2e8f0",
      }}
    >
      <div
        style={{
          width: "min(540px, 100%)",
          borderRadius: "22px",
          padding: "36px 28px",
          background: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 28px 70px rgba(2,6,23,0.55)",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc" }}>
            Create a Member Account
          </div>
          <div style={{ marginTop: "10px", color: "rgba(148,163,184,0.9)", lineHeight: 1.6 }}>
            Set up your account and unlock customized ALICE guidance.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "14px" }}>
            <div style={{ marginBottom: "8px", fontSize: "0.9rem", color: "rgba(226,232,240,0.82)" }}>
              Name
            </div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              required
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

          <label style={{ display: "block", marginBottom: "14px" }}>
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

          <label style={{ display: "block", marginBottom: "14px" }}>
            <div style={{ marginBottom: "8px", fontSize: "0.9rem", color: "rgba(226,232,240,0.82)" }}>
              Password
            </div>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              autoComplete="new-password"
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
              Confirm password
            </div>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              required
              autoComplete="new-password"
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

          {message ? (
            <div
              style={{
                marginBottom: "18px",
                color: "#fecdd3",
                fontSize: "0.92rem",
              }}
            >
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            style={{
              width: "100%",
              borderRadius: "16px",
              border: "none",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              padding: "14px 16px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Create account
          </button>
        </form>

        <div
          style={{
            marginTop: "22px",
            color: "rgba(148,163,184,0.9)",
            fontSize: "0.92rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => auth.setAuthMode("login")}
            style={{
              border: "none",
              background: "transparent",
              color: "#93c5fd",
              cursor: "pointer",
              textDecoration: "underline",
              fontWeight: 700,
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
