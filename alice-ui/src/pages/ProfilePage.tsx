import type { AuthMember } from "../services/authService";

type ProfilePageProps = {
  user: AuthMember;
  onClose: () => void;
  onLogout: () => void;
};

export default function ProfilePage({ user, onClose, onLogout }: ProfilePageProps) {
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
          width: "min(680px, 100%)",
          borderRadius: "22px",
          padding: "36px 32px",
          background: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 28px 70px rgba(2,6,23,0.55)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc" }}>
              Member profile
            </div>
            <div style={{ marginTop: "8px", color: "rgba(148,163,184,0.9)", lineHeight: 1.6 }}>
              Your ALICE member session and account settings.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.04)",
              color: "#e2e8f0",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>

        <div style={{ display: "grid", gap: "18px" }}>
          <section
            style={{
              borderRadius: "20px",
              padding: "22px",
              background: "rgba(7,18,42,0.9)",
              border: "1px solid rgba(148,163,184,0.1)",
            }}
          >
            <div style={{ fontSize: "0.85rem", letterSpacing: "0.12em", color: "rgba(148,163,184,0.85)", marginBottom: "12px" }}>
              ACCOUNT DETAILS
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                <span style={{ color: "rgba(148,163,184,0.9)" }}>Name</span>
                <strong>{user.name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                <span style={{ color: "rgba(148,163,184,0.9)" }}>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                <span style={{ color: "rgba(148,163,184,0.9)" }}>Member since</span>
                <strong>{new Date(user.createdAt).toLocaleDateString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                <span style={{ color: "rgba(148,163,184,0.9)" }}>Last login</span>
                <strong>{new Date(user.lastLogin).toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                <span style={{ color: "rgba(148,163,184,0.9)" }}>Sessions</span>
                <strong>{user.sessionCount}</strong>
              </div>
            </div>
          </section>

          <section
            style={{
              borderRadius: "20px",
              padding: "22px",
              background: "rgba(7,18,42,0.9)",
              border: "1px solid rgba(148,163,184,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ color: "rgba(226,232,240,0.92)", fontSize: "1rem", fontWeight: 700 }}>
              Member base controls
            </div>
            <div style={{ color: "rgba(148,163,184,0.92)", lineHeight: 1.7 }}>
              This account is stored locally for the current browser. All member settings, saved opportunities and onboarding preferences will be tied to your account session.
            </div>
            <button
              type="button"
              onClick={onLogout}
              style={{
                alignSelf: "flex-start",
                borderRadius: "16px",
                border: "none",
                background: "#dc2626",
                color: "#ffffff",
                padding: "12px 18px",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
