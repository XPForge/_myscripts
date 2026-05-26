import { useMemo } from "react";
import type { SignalProbe } from "../services/signalProbeEngine";

type SignalProbePanelProps = {
  probe: SignalProbe;
  response: string;
  onResponseChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
};

export default function SignalProbePanel({
  probe,
  response,
  onResponseChange,
  onSubmit,
  onSkip,
}: SignalProbePanelProps) {
  const hasValue = response.trim().length > 0;

  const optionButtons = useMemo(() => {
    if (!probe.options) return null;
    return probe.options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onResponseChange(option.id)}
        style={{
          width: "100%",
          borderRadius: "14px",
          border: response === option.id ? "1px solid rgba(96,165,250,0.9)" : "1px solid rgba(148,163,184,0.12)",
          background: response === option.id ? "rgba(59,130,246,0.14)" : "rgba(255,255,255,0.03)",
          color: "#e2e8f0",
          padding: "12px 14px",
          textAlign: "left",
          cursor: "pointer",
          boxShadow: response === option.id ? "0 8px 22px rgba(59,130,246,0.18)" : "0 4px 16px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "6px" }}>{option.label}</div>
      </button>
    ));
  }, [probe.options, response, onResponseChange]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "760px",
        margin: "20px auto 0",
        padding: "20px",
        borderRadius: "22px",
        background: "rgba(15,23,42,0.94)",
        border: "1px solid rgba(96,165,250,0.16)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
      }}
    >
      <div style={{ fontSize: "1rem", fontWeight: 800, color: "#eef2ff", marginBottom: "10px" }}>
        {probe.title}
      </div>
      <div style={{ color: "rgba(203,213,225,0.85)", marginBottom: "18px", lineHeight: 1.6 }}>
        {probe.prompt}
      </div>
      <div style={{ display: "grid", gap: "12px" }}>
        {probe.options ? (
          optionButtons
        ) : (
          <textarea
            value={response}
            onChange={(event) => onResponseChange(event.target.value)}
            placeholder={probe.type === "keyword" ? "e.g. product design, systems, creative strategy" : "Type a short answer here..."}
            rows={4}
            style={{
              width: "100%",
              borderRadius: "16px",
              border: "1px solid rgba(148,163,184,0.14)",
              background: "rgba(255,255,255,0.02)",
              color: "#e2e8f0",
              padding: "14px",
              resize: "vertical",
              fontSize: "0.94rem",
              outline: "none",
            }}
          />
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!response || !hasValue}
            style={{
              flex: 1,
              minWidth: "140px",
              borderRadius: "14px",
              padding: "12px 16px",
              border: "1px solid rgba(96,165,250,0.35)",
              background: hasValue ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.04)",
              color: hasValue ? "#dbeafe" : "rgba(203,213,225,0.5)",
              cursor: hasValue ? "pointer" : "not-allowed",
              fontWeight: 700,
            }}
          >
            Submit signal
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{
              flex: 1,
              minWidth: "140px",
              borderRadius: "14px",
              padding: "12px 16px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(203,213,225,0.9)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
