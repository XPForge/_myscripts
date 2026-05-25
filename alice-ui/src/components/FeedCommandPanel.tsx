import { useState } from "react";

type FeedCommandPanelProps = {
  onRefresh: () => void;
  onResetDismissed: () => void;
  onFullReset: () => void;
  onClose: () => void;
};

const panelStyle = {
  position: "absolute" as const,
  top: "calc(100% + 8px)",
  right: "14px",
  width: "280px",
  borderRadius: "20px",
  border: "1px solid rgba(96,165,250,0.22)",
  background: "rgba(15,23,42,0.96)",
  boxShadow: "0 20px 36px rgba(2,6,23,0.44)",
  padding: "16px",
  zIndex: 30,
};

const actionButtonStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "18px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(30,41,59,0.78)",
  color: "#e2e8f0",
  fontSize: "13px",
  fontWeight: 700,
  textAlign: "left" as const,
  cursor: "pointer",
  transition: "background 0.18s ease, border-color 0.18s ease, transform 0.18s ease",
};

const confirmButtonStyle = {
  ...actionButtonStyle,
  borderColor: "rgba(248,113,113,0.32)",
  background: "rgba(185,28,28,0.18)",
  color: "#fee2e2",
};

const descriptionStyle = {
  fontSize: "11px",
  lineHeight: 1.6,
  color: "rgba(203,213,225,0.78)",
  marginTop: "8px",
};

export default function FeedCommandPanel({
  onRefresh,
  onResetDismissed,
  onFullReset,
  onClose,
}: FeedCommandPanelProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(148,163,184,0.9)",
          marginBottom: "12px",
        }}
      >
        Tactical Feed Controls
      </div>

      <button
        type="button"
        onClick={() => {
          onRefresh();
          onClose();
        }}
        style={actionButtonStyle}
      >
        Refresh Opportunities
      </button>
      <div style={descriptionStyle}>
        Refetch the feed from source while preserving saved and dismissed state.
      </div>

      <button
        type="button"
        onClick={() => {
          onResetDismissed();
          onClose();
        }}
        style={{ ...actionButtonStyle, marginTop: "12px" }}
      >
        Reset Dismissed Jobs
      </button>
      <div style={descriptionStyle}>
        Restore previously dismissed opportunities without losing saved jobs.
      </div>

      <div style={{ marginTop: "18px" }}>
        <button
          type="button"
          onClick={() => setConfirmReset((value) => !value)}
          style={{
            ...actionButtonStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <span>Full Strategic Reset</span>
          <span style={{ opacity: 0.8 }}>{confirmReset ? "Cancel" : "Confirm"}</span>
        </button>
        {confirmReset ? (
          <button
            type="button"
            onClick={() => {
              onFullReset();
              onClose();
              setConfirmReset(false);
            }}
            style={confirmButtonStyle}
          >
            Execute Full Reset
          </button>
        ) : null}
      </div>

      <div style={descriptionStyle}>
        Clear dismissed and saved jobs plus adaptive state to restore first-launch discovery.
      </div>
    </div>
  );
}
