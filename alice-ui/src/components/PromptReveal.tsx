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
        padding: "0 24px 16px",
        color: "#cbd5e1",
        maxHeight: "46vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
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
                  borderRadius: "14px",
                  padding: "14px 18px",
                  border: active
                    ? "1px solid rgba(96,165,250,0.55)"
                    : "1px solid rgba(148,163,184,0.08)",
                  background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.01)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  boxShadow: active ? "0 12px 30px rgba(2,6,23,0.42)" : "0 6px 18px rgba(2,6,23,0.38)",
                  transition: "transform 160ms cubic-bezier(.2,.9,.2,1), box-shadow 180ms",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px) scale(0.998)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "")}
              >
                <div style={{ fontWeight: 800, marginBottom: "6px", fontSize: "1rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.92rem", color: "rgba(203,213,225,0.7)" }}>
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
                  borderRadius: "12px",
                  border: active
                    ? "1px solid rgba(96,165,250,0.6)"
                    : "1px solid rgba(148,163,184,0.08)",
                  background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.01)",
                  color: active ? "#e2e8f0" : "rgba(203,213,225,0.86)",
                  padding: "10px 14px",
                  cursor: "pointer",
                  boxShadow: active ? "0 10px 26px rgba(2,6,23,0.42)" : "0 6px 18px rgba(2,6,23,0.36)",
                  transition: "transform 140ms, box-shadow 160ms",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px) scale(0.997)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "")}
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
              borderRadius: "14px",
              padding: "12px 18px",
              border: "1px solid rgba(96,165,250,0.35)",
              background: hasSelection ? "linear-gradient(180deg, rgba(59,130,246,0.18), rgba(59,130,246,0.12))" : "rgba(255,255,255,0.01)",
              color: hasSelection ? "#dbeafe" : "rgba(148,163,184,0.56)",
              fontWeight: 800,
              cursor: hasSelection ? "pointer" : "not-allowed",
              boxShadow: hasSelection ? "0 14px 40px rgba(2,6,23,0.45)" : "0 6px 18px rgba(2,6,23,0.34)",
              transition: "transform 160ms, box-shadow 180ms",
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
              borderRadius: "14px",
              padding: "12px 18px",
              border: "1px solid rgba(148,163,184,0.12)",
              background: "rgba(255,255,255,0.01)",
              color: "rgba(203,213,225,0.86)",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 26px rgba(2,6,23,0.36)",
            }}
          >
            Explore anonymously
          </button>
        </div>
      </div>
    </div>
  );
}
