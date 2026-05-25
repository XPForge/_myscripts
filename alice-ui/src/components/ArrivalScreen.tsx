import type { CSSProperties } from "react";

type ArrivalScreenProps = {
  showWelcome: boolean;
  showQuestion: boolean;
  showHint: boolean;
  reserveBottom?: number; // pixels to reserve at bottom when onboarding panels show
};

const glassCard: CSSProperties = {
  width: "min(820px, 94%)",
  padding: "48px 36px",
  borderRadius: "20px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
  border: "1px solid rgba(255,255,255,0.03)",
  boxShadow: "0 30px 80px rgba(2,6,23,0.6)",
  backdropFilter: "blur(8px)",
  textAlign: "center",
};

export default function ArrivalScreen({ showWelcome, showQuestion, showHint, reserveBottom = 0 }: ArrivalScreenProps) {
  const dynamicContainer: CSSProperties = {
    position: "relative",
    width: "100%",
    minHeight: reserveBottom ? `calc(100vh - ${reserveBottom}px)` : "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #021026 0%, #020617 60%)",
    overflow: "hidden",
    color: "#e2e8f0",
  };

  return (
    <div style={dynamicContainer} role="region" aria-label="Welcome to ALICE">
      <style>{`
        @keyframes ambientPulse { 0%,100%{ transform: scale(1); opacity: 0.18 } 50%{ transform: scale(1.06); opacity: 0.28 } }
        .fadeIn { transition: opacity 900ms cubic-bezier(.22,1,.36,1) }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.08), transparent 14%), radial-gradient(circle at 85% 12%, rgba(59,130,246,0.05), transparent 10%)",
          pointerEvents: "none",
        }}
      />

      <div style={glassCard}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <div
            aria-hidden
            style={{
              width: "92px",
              height: "92px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "34px",
              fontWeight: 900,
              color: "#eef2ff",
              background: "linear-gradient(180deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06))",
              boxShadow: "0 10px 36px rgba(2,6,23,0.5)",
            }}
          >
            ALICE
          </div>
        </div>

        <div
          className="fadeIn"
          style={{
            opacity: showWelcome ? 1 : 0,
            fontSize: "clamp(2rem, 4.4vw, 3rem)",
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: "10px",
          }}
        >
          Welcome.
        </div>

        <div
          className="fadeIn"
          style={{
            opacity: showQuestion ? 1 : 0,
            transitionDelay: showQuestion ? "240ms" : undefined,
            fontSize: "clamp(1rem, 1.9vw, 1.25rem)",
            color: "rgba(226,232,240,0.92)",
            marginBottom: "8px",
            fontWeight: 600,
          }}
        >
          What can I help you find here?
        </div>

        <div
          className="fadeIn"
          style={{
            opacity: showHint ? 1 : 0,
            transitionDelay: showHint ? "520ms" : undefined,
            color: "rgba(148,163,184,0.78)",
            fontSize: "0.95rem",
            marginTop: "6px",
          }}
        >
          Answer naturally or wait for the prompts.
        </div>
      </div>
    </div>
  );
}
