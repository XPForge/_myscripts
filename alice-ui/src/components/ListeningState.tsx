import type { CSSProperties } from "react";

type ListeningStateProps = {
  compact?: boolean;
};

export default function ListeningState({ compact = false }: ListeningStateProps) {
  const bars = [0.9, 0.75, 0.95, 0.6, 0.82];
  const circleSize = compact ? 56 : 72;
  const innerSize = compact ? 36 : 46;
  const gap = compact ? "10px" : "14px";
  const barsHeight = compact ? 18 : 26;

  return (
    <div
      aria-hidden={compact ? "false" : "true"}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap,
        marginTop: compact ? "12px" : "28px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: "50%",
          background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.12)",
          boxShadow: "0 8px 30px rgba(2,6,23,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: `${innerSize}px`,
            height: `${innerSize}px`,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.12)",
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
          height: `${barsHeight}px`,
        }}
      >
        {bars.map((b, i) => (
          <span key={i} style={barStyle(b)} />
        ))}
      </div>

    </div>
  );
}

function barStyle(multiplier: number): CSSProperties {
  return {
    display: "block",
    width: "100%",
    height: `${10 + multiplier * 18}px`,
    borderRadius: "999px",
    background: "rgba(148,163,184,0.5)",
  } as const;
}
