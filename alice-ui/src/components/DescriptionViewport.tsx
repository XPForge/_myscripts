import { useEffect, useRef, useState } from "react";

const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = 320;
const EXPAND_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

type DescriptionViewportProps = {
  description: string;
  interactive?: boolean;
};

export default function DescriptionViewport({
  description,
  interactive = true,
}: DescriptionViewportProps) {
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didMove = useRef(false);

  useEffect(() => {
    setExpanded(false);
  }, [description]);

  const height = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

  const toggle = () => {
    if (!interactive) return;
    setExpanded((value) => !value);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!interactive) return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    didMove.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dx > 8 || dy > 8) didMove.current = true;
  };

  const handleTouchEnd = () => {
    if (!interactive || didMove.current) {
      touchStart.current = null;
      return;
    }
    toggle();
    touchStart.current = null;
  };

  const handleClick = () => {
    if (!interactive || didMove.current) return;
    toggle();
  };

  return (
    <div
      style={{
        marginTop: "20px",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: "10px",
          letterSpacing: "0.1em",
          color: "rgba(148,163,184,0.7)",
          marginBottom: "8px",
          fontWeight: 600,
        }}
      >
        OPPORTUNITY BRIEF
      </div>

      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-expanded={interactive ? expanded : undefined}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        style={{
          position: "relative",
          height: `${height}px`,
          borderRadius: "18px",
          border: "1px solid rgba(148,163,184,0.16)",
          background:
            "linear-gradient(180deg, rgba(30,41,59,0.55), rgba(15,23,42,0.42))",
          boxShadow: expanded
            ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 28px rgba(2,6,23,0.35)"
            : "inset 0 1px 0 rgba(255,255,255,0.04)",
          overflow: "hidden",
          transition: `height 0.42s ${EXPAND_EASING}, box-shadow 0.42s ${EXPAND_EASING}`,
          cursor: interactive ? "pointer" : "default",
        }}
      >
        <div
          style={{
            height: "100%",
            overflowY: expanded ? "auto" : "hidden",
            overflowX: "hidden",
            padding: "14px 16px 36px",
            fontSize: "16px",
            lineHeight: 1.65,
            color: "#cbd5e1",
            WebkitOverflowScrolling: "touch",
            touchAction: expanded ? "pan-y" : "manipulation",
          }}
        >
          {description}
        </div>

        {!expanded && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "64px",
              background:
                "linear-gradient(to bottom, rgba(15,23,42,0), rgba(15,23,42,0.94) 68%)",
              pointerEvents: "none",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            left: "16px",
            right: "16px",
            bottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: expanded
              ? "rgba(148,163,184,0.75)"
              : "rgba(147,197,253,0.85)",
            pointerEvents: "none",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: `transform 0.42s ${EXPAND_EASING}`,
              fontSize: "11px",
            }}
          >
            ▾
          </span>
          {expanded ? "Collapse" : "More"}
        </div>
      </div>
    </div>
  );
}
