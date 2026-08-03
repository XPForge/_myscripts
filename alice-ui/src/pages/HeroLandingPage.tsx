// Candidate-facing entrance page. Copy and layout are oriented around one
// promise -- "you are not invisible here" -- rather than a login/auth screen.
// Deeper explanations (recruiter workflows, business model, architecture,
// FAQs) live on the main informational site, not here.
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
import { LIGHTHOUSE_INFORMATION_SITE_URL } from "../config/lighthouseSiteConfig";
import "./HeroLandingPage.css";

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
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
  boxSizing: "border-box",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "rgba(255,255,255,0.6)",
  fontSize: "0.8rem",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};

type Step = "checking" | "returning" | "form" | "welcome";

function DiscoveryCapture() {
  const [step, setStep] = useState<Step>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
      setStep(current ? "returning" : "form");
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
      if (mode === "signup") {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const account = await signUp(fullName, email, password);
        saveDiscoveryIdentity(account.name, account.email);
        // First-time accounts get the "Welcome to Lighthouse" transition
        // before Discovery opens; returning users signing back in (below)
        // skip straight through, since they've already seen it.
        setStep("welcome");
      } else {
        const account = await signIn(email, password);
        saveDiscoveryIdentity(account.name, account.email);
        enterDiscovery();
      }
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
    setStep("form");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
  };

  if (step === "checking") {
    return <div style={{ minHeight: "160px" }} />;
  }

  if (step === "welcome") {
    return (
      <div style={{ display: "grid", gap: "14px" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>Welcome to Lighthouse</div>
        <div style={{ display: "grid", gap: "10px", fontSize: "0.88rem", lineHeight: 1.6, color: "rgba(255,255,255,0.82)" }}>
          <p style={{ margin: 0 }}>
            You are about to have a guided conversation about your experiences, capabilities, working patterns, and the
            conditions that help you do your best work.
          </p>
          <p style={{ margin: 0 }}>
            This is not a test, interview, assessment, or personality quiz. You do not need polished answers.
          </p>
          <p style={{ margin: 0 }}>
            Speak naturally. You can pause, think out loud, tell stories, change direction, or correct anything that
            does not feel right.
          </p>
          <p style={{ margin: 0 }}>What we discover may be organized into a capability profile for your review.</p>
        </div>
        <button type="button" onClick={enterDiscovery} style={primaryButtonStyle}>
          Begin My Discovery
        </button>
      </div>
    );
  }

  if (step === "returning" && user) {
    const hasSession = hasSavedDiscoverySession();
    return (
      <div style={{ display: "grid", gap: "14px" }}>
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
          <button type="button" onClick={() => void handleSignOut()} style={{ ...linkButtonStyle, opacity: 0.7 }}>
            Not you? Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div>
        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#ffffff" }}>
          {mode === "signup" ? "Start your free Discovery" : "Log in to continue"}
        </div>
        <div style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>
          {mode === "signup" ? "Enter your name and email to begin." : "Welcome back — enter your details to continue."}
        </div>
      </div>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: "grid", gap: "12px" }}>
        {mode === "signup" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
              First name
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} type="text" required autoComplete="given-name" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
              Last name
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} type="text" required autoComplete="family-name" style={inputStyle} />
            </label>
          </div>
        )}
        <label style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
          Email address
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" style={inputStyle} />
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
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex" }}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        {error && <div style={{ fontSize: "0.82rem", color: "#fca5a5" }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting || !email.trim() || password.length < 8 || (mode === "signup" && (!firstName.trim() || !lastName.trim()))}
          style={{ ...primaryButtonStyle, opacity: submitting ? 0.7 : 1, cursor: submitting ? "wait" : "pointer", marginTop: "4px" }}
        >
          {submitting ? "Please wait…" : mode === "signup" ? "Start Free Discovery" : "Log in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
        style={linkButtonStyle}
      >
        {mode === "signup" ? "Already have an account? Log in" : "New here? Start your free Discovery instead"}
      </button>
    </div>
  );
}

export default function HeroLandingPage() {
  return (
    <div className="lp-shell">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Tauri&display=swap" rel="stylesheet" />

      <div className="lp-nav">
        <img src="/lighthouse-logo-icon.png" alt="Project Lighthouse" />
      </div>

      <div className="lp-grid">
        <div className="lp-copy">
          <div className="lp-copy-inner">
            <div className="lp-eyebrow">Project Lighthouse</div>

            <h1 className="lp-headline">Free Discovery for people who feel invisible in hiring</h1>

            <div className="lp-body">
              <p>The hiring process has flattened too many capable people into résumés, keywords, forms, and silence.</p>
              <p>Lighthouse Discovery is a different starting point.</p>
              <p>
                You'll have a guided conversation designed to uncover what a résumé often misses—how you think, what
                you bring, what you need, and where you're most likely to thrive.
              </p>
              <p>
                After Discovery, you'll receive a capability profile you can use alongside your résumé, in interviews,
                on LinkedIn, or anywhere you want to be understood more clearly.
              </p>
            </div>

            <div className="lp-free-statement">
              <strong>Discovery is 100% free.</strong>
              <span>Not a free trial. Not temporary. Free.</span>
            </div>

            <p className="lp-future-statement">
              If you choose, your approved profile may later be included in the Lighthouse talent pool as recruiter
              and opportunity-discovery features become available.
              <br />
              <span className="lp-coming-soon">Coming soon — participant-approved recruiter discovery.</span>
            </p>

            <p className="lp-trust-statement">
              No scoring. No judgment. No personality test.
              <br />
              Just a better way to be seen.
            </p>

            <div className="lp-form-panel">
              <DiscoveryCapture />
            </div>

            <p className="lp-control-statement">
              You will be able to review your capability profile, correct what does not feel accurate, and decide what
              may be shared.
            </p>

            <div className="lp-learn-more">
              <span>Want to understand the mission first?</span>
              <a href={LIGHTHOUSE_INFORMATION_SITE_URL} target="_blank" rel="noopener noreferrer" style={secondaryButtonStyle}>
                Learn More About Lighthouse
              </a>
            </div>

            <div className="lp-footer">© {new Date().getFullYear()} Project Lighthouse</div>
          </div>
        </div>

        <div className="lp-visual" role="img" aria-label="A glowing lighthouse tower with an open doorway, standing over a dark sea under a starry sky" />
      </div>
    </div>
  );
}
