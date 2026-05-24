export const COMMAND_BAR_HEIGHT = 52;

type TopCommandBarProps = {
  savedCount: number;
  onSavedClick: () => void;
  isSavedPanelOpen?: boolean;
};

export default function TopCommandBar({
  savedCount,
  onSavedClick,
  isSavedPanelOpen = false,
}: TopCommandBarProps) {
  return (
    <header
      style={{
        position: "relative",
        flexShrink: 0,
        width: "100%",
        height: `calc(${COMMAND_BAR_HEIGHT}px + env(safe-area-inset-top, 0px))`,
        paddingTop: "env(safe-area-inset-top, 0px)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "14px",
        paddingRight: "14px",
        boxSizing: "border-box",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(148,163,184,0.28)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.08), 0 10px 36px rgba(2,6,23,0.55), inset 0 1px 0 rgba(96,165,250,0.12)",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#f8fafc",
            lineHeight: 1,
          }}
        >
          ALICE
        </div>
        <div
          style={{
            marginTop: "2px",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: "rgba(148,163,184,0.78)",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Strategic Opportunities
        </div>
      </div>

      <button
        type="button"
        onClick={onSavedClick}
        aria-expanded={isSavedPanelOpen}
        aria-label={`Saved jobs, ${savedCount} saved`}
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginLeft: "10px",
          padding: "5px 10px",
          borderRadius: "999px",
          border: `1px solid ${
            isSavedPanelOpen
              ? "rgba(147,197,253,0.45)"
              : "rgba(148,163,184,0.22)"
          }`,
          background: isSavedPanelOpen
            ? "rgba(59,130,246,0.22)"
            : "rgba(30,41,59,0.55)",
          color: "#e2e8f0",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          cursor: "pointer",
          boxShadow: isSavedPanelOpen
            ? "0 0 20px rgba(59,130,246,0.2)"
            : "0 0 12px rgba(15,23,42,0.35)",
          transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{ opacity: 0.9 }}
        >
          <path
            d="M6 4h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V6a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
        <span>SAVED</span>
        <span
          style={{
            minWidth: "18px",
            padding: "1px 5px",
            borderRadius: "999px",
            background: "rgba(59,130,246,0.28)",
            color: "#dbeafe",
            fontSize: "10px",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {savedCount}
        </span>
      </button>
    </header>
  );
}
