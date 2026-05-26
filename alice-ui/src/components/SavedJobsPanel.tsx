import type { JobCard } from "../services/jobService";
import { COMMAND_BAR_HEIGHT } from "./TopCommandBar";

type SavedJobsPanelProps = {
  isOpen: boolean;
  jobs: JobCard[];
  onClose: () => void;
};

export default function SavedJobsPanel({
  isOpen,
  jobs,
  onClose,
}: SavedJobsPanelProps) {
  const panelTop = `calc(${COMMAND_BAR_HEIGHT}px + env(safe-area-inset-top, 0px))`;

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          top: panelTop,
          zIndex: 180,
          background: "rgba(2,6,23,0.55)",
          backdropFilter: "blur(2px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label="Saved jobs"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: panelTop,
          zIndex: 190,
          maxHeight: "min(52vh, 420px)",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.94))",
          borderBottom: "1px solid rgba(148,163,184,0.16)",
          boxShadow: "0 18px 48px rgba(2,6,23,0.55)",
          transform: isOpen ? "translateY(0)" : "translateY(-108%)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px 10px",
            borderBottom: "1px solid rgba(148,163,184,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: "rgba(148,163,184,0.85)",
            }}
          >
            SAVED OPPORTUNITIES
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close saved jobs"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(30,41,59,0.6)",
              color: "#cbd5e1",
              fontSize: "18px",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 12px 16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {jobs.length === 0 ? (
            <div
              style={{
                padding: "28px 16px",
                textAlign: "center",
                color: "rgba(148,163,184,0.75)",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              Swipe right on a card to save an opportunity.
            </div>
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => {
                  if (job.applyUrl) {
                    window.open(job.applyUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                style={{
                  width: "100%",
                  marginBottom: "8px",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  border: "1px solid rgba(148,163,184,0.12)",
                  background: "rgba(30,41,59,0.45)",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "block",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#f8fafc",
                        lineHeight: 1.3,
                      }}
                    >
                      {job.role}
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        color: "#93c5fd",
                        fontWeight: 500,
                      }}
                    >
                      {job.company}
                    </div>
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: "rgba(59,130,246,0.18)",
                      border: "1px solid rgba(96,165,250,0.28)",
                      color: "#dbeafe",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {job.alignment}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
