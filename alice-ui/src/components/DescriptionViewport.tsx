import { useEffect, useState, type CSSProperties } from "react";

const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = 320;
const EXPAND_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const frameStyle: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(148,163,184,0.16)",
  background:
    "linear-gradient(180deg, rgba(30,41,59,0.55), rgba(15,23,42,0.42))",
};

type DescriptionViewportProps = {
  description: string;
  interactive?: boolean;
};

export default function DescriptionViewport({
  description,
  interactive = true,
}: DescriptionViewportProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [description]);

  const height = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

  const stopCardTap = (e: React.SyntheticEvent) => {
    e.stopPropagation();
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
        style={{
          position: "relative",
          height: `${height}px`,
          overflow: "hidden",
          transition: `height 0.42s ${EXPAND_EASING}, box-shadow 0.42s ${EXPAND_EASING}`,
          boxShadow: expanded
            ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 28px rgba(2,6,23,0.35)"
            : "inset 0 1px 0 rgba(255,255,255,0.04)",
          ...frameStyle,
        }}
      >
        {!expanded ? (
          <button
            type="button"
            disabled={!interactive}
            aria-expanded={false}
            aria-label="Expand opportunity brief"
            onClick={(e) => {
              stopCardTap(e);
              if (!interactive) return;
              setExpanded(true);
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              margin: 0,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: interactive ? "pointer" : "default",
              textAlign: "left",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                boxSizing: "border-box",
                padding: "14px 16px 40px",
                fontSize: "16px",
                lineHeight: 1.65,
                color: "#cbd5e1",
                overflow: "hidden",
              }}
            >
              {description}
            </span>

            <span
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

            <span
              aria-hidden
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
                color: "rgba(147,197,253,0.85)",
                textTransform: "uppercase",
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: "11px" }}>▾</span>
              More
            </span>
          </button>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "14px 16px 8px",
                fontSize: "16px",
                lineHeight: 1.65,
                color: "#cbd5e1",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
              }}
            >
              {description}
            </div>

            <button
              type="button"
              disabled={!interactive}
              aria-expanded
              aria-label="Collapse opportunity brief"
              onClick={(e) => {
                stopCardTap(e);
                if (!interactive) return;
                setExpanded(false);
              }}
              style={{
                flexShrink: 0,
                width: "100%",
                margin: 0,
                padding: "10px 16px 12px",
                border: "none",
                borderTop: "1px solid rgba(148,163,184,0.12)",
                background: "rgba(15,23,42,0.35)",
                cursor: interactive ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "rgba(148,163,184,0.82)",
                textTransform: "uppercase",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <span style={{ fontSize: "11px", transform: "rotate(180deg)" }}>
                ▾
              </span>
              Collapse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
