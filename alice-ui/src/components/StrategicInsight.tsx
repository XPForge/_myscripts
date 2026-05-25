import { useMemo, useState } from "react";
import InsightOverlay from "./InsightOverlay";
import {
  deriveStrategicInsights,
  type InsightDetailKey,
  type InsightDetails,
} from "./insightHelpers";

type StrategicInsightProps = Partial<InsightDetails> & {
  role: string;
  company: string;
  description: string;
  salary: string;
  alignment: string;
  interactive?: boolean;
};

const frameStyle = {
  borderRadius: "24px",
  border: "1px solid rgba(96,165,250,0.18)",
  background: "rgba(15,23,42,0.84)",
  boxShadow: "0 0 32px rgba(59,130,246,0.14)",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const chipStyle = {
  borderRadius: "999px",
  padding: "8px 14px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(255,255,255,0.04)",
  color: "#cbd5e1",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "transform 160ms ease, background 160ms ease, border-color 160ms ease",
};

const chipActiveStyle = {
  background: "rgba(59,130,246,0.18)",
  borderColor: "rgba(59,130,246,0.35)",
  color: "#e2e8f0",
};

function stopPointer(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export default function StrategicInsight({
  insight,
  risks,
  strengths,
  growthPotential,
  role,
  company,
  description,
  salary,
  alignment,
  interactive = true,
}: StrategicInsightProps) {
  const fallback = useMemo(
    () => deriveStrategicInsights({ title: role, company, description, salary, alignment }),
    [role, company, description, salary, alignment]
  );

  const details = {
    risks: risks || fallback.risks,
    strengths: strengths || fallback.strengths,
    growth: growthPotential || fallback.growthPotential,
  };

  const summary = insight || fallback.insight;
  const [activeKey, setActiveKey] = useState<InsightDetailKey | null>(null);
  const isEnabled = interactive && Boolean(summary);

  const chips: Array<{ key: InsightDetailKey; label: string }> = [
    { key: "risks", label: "Risks" },
    { key: "strengths", label: "Strengths" },
    { key: "growth", label: "Growth" },
  ];

  return (
    <div style={frameStyle}>
      <div
        style={{
          color: "#e2e8f0",
          lineHeight: 1.6,
          fontSize: "15px",
          fontWeight: 600,
          letterSpacing: "0.01em",
          minHeight: "44px",
        }}
      >
        {summary}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {chips.map((chip) => {
          const active = activeKey === chip.key;

          return (
            <button
              key={chip.key}
              type="button"
              onClick={(e) => {
                stopPointer(e);
                if (!isEnabled) return;
                setActiveKey((current) => (current === chip.key ? null : chip.key));
              }}
              onTouchStart={stopPointer}
              style={{
                ...chipStyle,
                ...(active ? chipActiveStyle : {}),
                opacity: isEnabled ? 1 : 0.45,
                cursor: isEnabled ? "pointer" : "default",
              }}
              disabled={!isEnabled}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <InsightOverlay
        label={activeKey === "growth" ? "Growth" : activeKey === "strengths" ? "Strengths" : "Risks"}
        text={activeKey ? details[activeKey] : ""}
        isOpen={Boolean(activeKey)}
      />
    </div>
  );
}
