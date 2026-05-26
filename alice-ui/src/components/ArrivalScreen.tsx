import type { CSSProperties } from "react";

type ArrivalScreenProps = {
  showWelcome: boolean;
  showQuestion: boolean;
  showHint: boolean;
  reserveBottom?: number; // pixels to reserve at bottom when onboarding panels show
};

const glassCard: CSSProperties = {
  width: "min(760px, 94%)",
  padding: "32px 24px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
  border: "1px solid rgba(255,255,255,0.03)",
  boxShadow: "0 26px 70px rgba(2,6,23,0.52)",
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
          <div
            aria-hidden
            style={{
              width: "78px",
              height: "78px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 900,
              color: "#eef2ff",
              background: "linear-gradient(180deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06))",
              boxShadow: "0 8px 28px rgba(2,6,23,0.42)",
            }}
          >
            ALICE
          </div>
        </div>

        <div
          style={{
            opacity: showWelcome ? 1 : 0,
            fontSize: "clamp(1.7rem, 3.8vw, 2.4rem)",
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: "8px",
          }}
        >
          Welcome.
        </div>

        <div
          style={{
            opacity: showQuestion ? 1 : 0,
            fontSize: "clamp(0.95rem, 1.7vw, 1.15rem)",
            color: "rgba(226,232,240,0.92)",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          What can I help you find here?
        </div>

        <div
          style={{
            opacity: showHint ? 1 : 0,
            color: "rgba(148,163,184,0.78)",
            fontSize: "0.88rem",
            marginTop: "4px",
          }}
        >
          Answer naturally or wait for the prompts.
        </div>
      </div>
    </div>
  );
}
