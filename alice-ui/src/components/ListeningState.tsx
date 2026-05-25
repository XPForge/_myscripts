export default function ListeningState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
        marginTop: "28px",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "rgba(59,130,246,0.12)",
          border: "1px solid rgba(59,130,246,0.22)",
          boxShadow: "0 0 50px rgba(59,130,246,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(59,130,246,0.16)",
            animation: "pulseGlow 2.8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#93c5fd",
            boxShadow: "0 0 20px rgba(59,130,246,0.45)",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 8px)",
          gap: "6px",
          alignItems: "flex-end",
          height: "26px",
        }}
      >
        <span style={barStyle(1)} />
        <span style={barStyle(0.75)} />
        <span style={barStyle(1)} />
        <span style={barStyle(0.55)} />
        <span style={barStyle(0.85)} />
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.16); opacity: 0.56; }
        }
        @keyframes waveformMove {
          0% { transform: scaleY(0.72); }
          50% { transform: scaleY(1); }
          100% { transform: scaleY(0.72); }
        }
      `}</style>
    </div>
  );
}

function barStyle(multiplier: number) {
  return {
    display: "block",
    width: "100%",
    height: `${12 + multiplier * 18}px`,
    borderRadius: "999px",
    background: "rgba(148,163,184,0.55)",
    animation: `waveformMove ${1.1 + multiplier * 0.4}s ease-in-out ${Math.random() * 0.2}s infinite`,
  } as const;
}
