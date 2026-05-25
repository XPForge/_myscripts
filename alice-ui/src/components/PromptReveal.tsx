import type { DirectionOption, PromptOption } from "../services/onboardingEngine";

type PromptRevealProps = {
  prompts: PromptOption[];
  directions: DirectionOption[];
  selectedPrompts: string[];
  selectedDirections: string[];
  onPromptToggle: (id: string) => void;
  onDirectionToggle: (id: string) => void;
  onContinue: () => void;
  onExploreAnonymously: () => void;
};

export default function PromptReveal({
  prompts,
  directions,
  selectedPrompts,
  selectedDirections,
  onPromptToggle,
  onDirectionToggle,
  onContinue,
  onExploreAnonymously,
}: PromptRevealProps) {
  const hasSelection = selectedPrompts.length > 0 || selectedDirections.length > 0;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "720px",
        margin: "0 auto",
        padding: "0 24px 36px",
        color: "#cbd5e1",
      }}
    >
      <div
        style={{
          opacity: 1,
          transform: "translateY(0)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.78)",
            marginBottom: "12px",
          }}
        >
          Guided prompts
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          {prompts.map((item) => {
            const active = selectedPrompts.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPromptToggle(item.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: "18px",
                  padding: "16px 18px",
                  border: active
                    ? "1px solid rgba(96,165,250,0.55)"
                    : "1px solid rgba(148,163,184,0.16)",
                  background: active ? "rgba(59,130,246,0.16)" : "rgba(15,23,42,0.8)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>{item.label}</div>
                <div style={{ fontSize: "0.9rem", color: "rgba(203,213,225,0.72)" }}>
                  {item.description}
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: "0.95rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.78)",
            marginBottom: "12px",
          }}
        >
          Exploration directions
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "28px" }}>
          {directions.map((direction) => {
            const active = selectedDirections.includes(direction.id);
            return (
              <button
                type="button"
                onClick={() => onDirectionToggle(direction.id)}
                key={direction.id}
                style={{
                  borderRadius: "999px",
                  border: active
                    ? "1px solid rgba(96,165,250,0.6)"
                    : "1px solid rgba(148,163,184,0.2)",
                  background: active ? "rgba(59,130,246,0.16)" : "rgba(15,23,42,0.78)",
                  color: active ? "#e2e8f0" : "rgba(203,213,225,0.84)",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                {direction.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onContinue}
            disabled={!hasSelection}
            style={{
              flex: 1,
              minWidth: "180px",
              borderRadius: "18px",
              padding: "14px 18px",
              border: "1px solid rgba(96,165,250,0.35)",
              background: hasSelection ? "rgba(59,130,246,0.22)" : "rgba(15,23,42,0.45)",
              color: hasSelection ? "#dbeafe" : "rgba(148,163,184,0.56)",
              fontWeight: 700,
              cursor: hasSelection ? "pointer" : "not-allowed",
            }}
          >
            Continue with this path
          </button>
          <button
            type="button"
            onClick={onExploreAnonymously}
            style={{
              flex: 1,
              minWidth: "180px",
              borderRadius: "18px",
              padding: "14px 18px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(15,23,42,0.72)",
              color: "rgba(203,213,225,0.84)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Explore anonymously
          </button>
        </div>
      </div>
    </div>
  );
}
