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
        maxWidth: "680px",
        margin: "0 auto",
        padding: "0 16px 12px",
        color: "#cbd5e1",
        maxHeight: "42vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "contain",
      }}
      id="prompt-reveal"
      role="region"
      aria-label="Onboarding prompts"
    >
      <div
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <div
          style={{
            fontSize: "0.88rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.78)",
            marginBottom: "10px",
          }}
        >
          Guided prompts
        </div>

        <div
          style={{
            display: "grid",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          {prompts.map((item) => {
            const active = selectedPrompts.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPromptToggle(item.id)}
                aria-pressed={active}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  border: active
                    ? "1px solid rgba(96,165,250,0.55)"
                    : "1px solid rgba(148,163,184,0.08)",
                  background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.01)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  boxShadow: active ? "0 10px 24px rgba(2,6,23,0.38)" : "0 4px 14px rgba(2,6,23,0.32)",
                  outline: "none",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: "4px", fontSize: "0.96rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.4, color: "rgba(203,213,225,0.7)" }}>
                  {item.description}
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: "0.85rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.78)",
            marginBottom: "10px",
          }}
        >
          Exploration directions
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
          {directions.map((direction) => {
            const active = selectedDirections.includes(direction.id);
            return (
              <button
                type="button"
                onClick={() => onDirectionToggle(direction.id)}
                key={direction.id}
                aria-pressed={active}
                style={{
                  borderRadius: "12px",
                  border: active
                    ? "1px solid rgba(96,165,250,0.6)"
                    : "1px solid rgba(148,163,184,0.08)",
                  background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.01)",
                  color: active ? "#e2e8f0" : "rgba(203,213,225,0.86)",
                  padding: "8px 12px",
                  cursor: "pointer",
                  boxShadow: active ? "0 8px 22px rgba(2,6,23,0.35)" : "0 4px 12px rgba(2,6,23,0.28)",
                  outline: "none",
                  fontSize: "0.88rem",
                }}
              >
                {direction.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onContinue}
            disabled={!hasSelection}
            style={{
              flex: 1,
              minWidth: "150px",
              borderRadius: "14px",
              padding: "10px 14px",
              border: "1px solid rgba(96,165,250,0.35)",
              background: hasSelection ? "linear-gradient(180deg, rgba(59,130,246,0.18), rgba(59,130,246,0.12))" : "rgba(255,255,255,0.01)",
              color: hasSelection ? "#dbeafe" : "rgba(148,163,184,0.56)",
              fontWeight: 800,
              cursor: hasSelection ? "pointer" : "not-allowed",
              boxShadow: hasSelection ? "0 10px 28px rgba(2,6,23,0.35)" : "0 5px 16px rgba(2,6,23,0.3)",
              fontSize: "0.92rem",
            }}
          >
            Continue with this path
          </button>
          <button
            type="button"
            onClick={onExploreAnonymously}
            style={{
              flex: 1,
              minWidth: "150px",
              borderRadius: "14px",
              padding: "10px 14px",
              border: "1px solid rgba(148,163,184,0.12)",
              background: "rgba(255,255,255,0.01)",
              color: "rgba(203,213,225,0.86)",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(2,6,23,0.32)",
              fontSize: "0.92rem",
            }}
          >
            Explore anonymously
          </button>
        </div>
      </div>
    </div>
  );
}
