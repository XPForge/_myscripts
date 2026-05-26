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
    height: reserveBottom ? `calc(100vh - ${reserveBottom}px)` : "100vh",
    minHeight: reserveBottom ? undefined : "100vh",
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
            "radial-gradient(circle at 12% 18%, rgba(59,130,246,0.12), transparent 16%), radial-gradient(circle at 82% 14%, rgba(96,165,250,0.08), transparent 12%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          ...glassCard,
          padding: "38px 34px",
          border: "1px solid rgba(148,163,184,0.14)",
          boxShadow: "0 36px 90px rgba(2,6,23,0.42)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div
            aria-hidden
            style={{
              width: "82px",
              height: "82px",
              borderRadius: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 900,
              color: "#eef2ff",
              background: "linear-gradient(180deg, rgba(59,130,246,0.16), rgba(59,130,246,0.08))",
              boxShadow: "0 12px 34px rgba(2,6,23,0.36)",
            }}
          >
            ALICE
          </div>
        </div>

        <div
          style={{
            opacity: showWelcome ? 1 : 0,
            fontSize: "clamp(1.9rem, 4.2vw, 2.8rem)",
            fontWeight: 900,
            color: "#f8fafc",
            marginBottom: "14px",
            lineHeight: 1.05,
          }}
        >
          Build your adaptive profile.
        </div>

        <div
          style={{
            opacity: showQuestion ? 1 : 0,
            fontSize: "1rem",
            color: "rgba(226,232,240,0.9)",
            marginBottom: "18px",
            lineHeight: 1.8,
            maxWidth: "720px",
            margin: "0 auto",
          }}
        >
          ALICE will guide you through a short series of dynamically generated questions. Every answer is weighed and routed to decide the next best question, not just a fixed form.
        </div>

        <div
          style={{
            opacity: showHint ? 1 : 0,
            display: "grid",
            gap: "12px",
            marginTop: "12px",
            fontSize: "0.92rem",
            color: "rgba(148,163,184,0.82)",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#38bdf8",
                marginTop: "6px",
              }}
            />
            <span>Adaptive questions are chosen based on your responses.</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#34d399",
                marginTop: "6px",
              }}
            />
            <span>Answers are used to estimate your confidence, interests, and strategic direction.</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#fbbf24",
                marginTop: "6px",
              }}
            />
            <span>The flow adapts in real time, so you only answer what matters most today.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
