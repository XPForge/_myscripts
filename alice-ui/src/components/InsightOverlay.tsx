import type { CSSProperties } from "react";

type InsightOverlayProps = {
  label: string;
  text: string;
  isOpen: boolean;
};

const overlayStyle: CSSProperties = {
  borderRadius: "20px",
  border: "1px solid rgba(147,197,253,0.18)",
  background: "rgba(15,23,42,0.92)",
  boxShadow: "0 20px 40px rgba(8,18,38,0.42)",
  padding: "16px 18px",
  overflow: "hidden",
  transition: "opacity 220ms ease, transform 220ms ease",
};

export default function InsightOverlay({ label, text, isOpen }: InsightOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        ...overlayStyle,
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? "translateY(0)" : "translateY(8px)",
      }}
      role="region"
      aria-live="polite"
      aria-label={label}
    >
      <div
        style={{
          fontSize: "10px",
          color: "rgba(148,163,184,0.78)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#e2e8f0",
          lineHeight: 1.75,
          fontSize: "14px",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
    </div>
  );
}
