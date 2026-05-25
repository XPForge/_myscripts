type ArrivalScreenProps = {
  showWelcome: boolean;
  showQuestion: boolean;
  showHint: boolean;
};

export default function ArrivalScreen({
  showWelcome,
  showQuestion,
  showHint,
}: ArrivalScreenProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, rgba(59,130,246,0.1), transparent 28%), #020617",
        overflow: "hidden",
        color: "#e2e8f0",
      }}
    >
      <style>{`
        @keyframes ambientPulse {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.08); opacity: 0.34; }
        }
        @keyframes glowFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.12), transparent 18%), radial-gradient(circle at 80% 15%, rgba(59,130,246,0.08), transparent 12%), radial-gradient(circle at 50% 75%, rgba(147,197,253,0.05), transparent 20%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 60%)",
          filter: "blur(26px)",
          animation: "ambientPulse 12s ease-in-out infinite",
        }}
      />

      <div
        style={{
          zIndex: 2,
          width: "100%",
          maxWidth: "720px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "clamp(5rem, 10vw, 8rem)",
            fontWeight: 900,
            letterSpacing: "0.24em",
            color: "#f8fafc",
            textShadow: "0 20px 90px rgba(2,6,23,0.18)",
            marginBottom: "18px",
            opacity: 0.95,
          }}
        >
          ALICE
        </div>

        <div
          style={{
            opacity: showWelcome ? 1 : 0,
            transition: "opacity 1s ease",
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#eef2ff",
            marginBottom: "16px",
          }}
        >
          Welcome.
        </div>

        <div
          style={{
            opacity: showQuestion ? 1 : 0,
            transition: "opacity 1s ease 0.4s",
            fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
            color: "rgba(226,232,240,0.92)",
            marginBottom: "12px",
          }}
        >
          What can I help you find here?
        </div>

        <div
          style={{
            opacity: showHint ? 1 : 0,
            transition: "opacity 1s ease 0.7s",
            color: "rgba(148,163,184,0.78)",
            fontSize: "0.95rem",
          }}
        >
          Answer naturally or wait for the prompts.
        </div>
      </div>
    </div>
  );
}
