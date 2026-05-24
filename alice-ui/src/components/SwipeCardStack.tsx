
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchJobs, type JobCard } from "../services/jobService";

type MatchTier = "A+" | "A" | "B" | "C";

function parseAlignmentPercent(alignment: string): number {
  const parsed = parseInt(alignment.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getTier(alignment: string): MatchTier {
  const pct = parseAlignmentPercent(alignment);
  if (pct >= 92) return "A+";
  if (pct >= 84) return "A";
  if (pct >= 74) return "B";
  return "C";
}

const tierVisuals: Record<
  MatchTier,
  {
    bg: string;
    border: string;
    glow: string;
    gradeColor: string;
    percentColor: string;
    matchColor: string;
    textShadow: string;
  }
> = {
  "A+": {
    bg: "linear-gradient(145deg, rgba(22,163,74,0.82), rgba(5,46,22,0.92))",
    border: "rgba(134,239,172,0.65)",
    glow: "0 0 26px rgba(34,197,94,0.65), 0 0 52px rgba(34,197,94,0.32)",
    gradeColor: "#ecfdf5",
    percentColor: "#ffffff",
    matchColor: "rgba(236,253,245,0.95)",
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  A: {
    bg: "linear-gradient(145deg, rgba(34,197,94,0.72), rgba(6,78,59,0.9))",
    border: "rgba(110,231,183,0.58)",
    glow: "0 0 20px rgba(52,211,153,0.55), 0 0 44px rgba(52,211,153,0.26)",
    gradeColor: "#d1fae5",
    percentColor: "#ffffff",
    matchColor: "rgba(236,253,245,0.92)",
    textShadow: "0 1px 4px rgba(0,0,0,0.48)",
  },
  B: {
    bg: "linear-gradient(145deg, rgba(37,99,235,0.78), rgba(15,23,42,0.92))",
    border: "rgba(147,197,253,0.62)",
    glow: "0 0 18px rgba(59,130,246,0.55), 0 0 38px rgba(59,130,246,0.26)",
    gradeColor: "#eff6ff",
    percentColor: "#ffffff",
    matchColor: "rgba(239,246,255,0.94)",
    textShadow: "0 1px 4px rgba(0,0,0,0.52)",
  },
  C: {
    bg: "linear-gradient(145deg, rgba(124,58,237,0.8), rgba(46,16,101,0.94))",
    border: "rgba(196,181,253,0.62)",
    glow: "0 0 16px rgba(139,92,246,0.58), 0 0 36px rgba(139,92,246,0.28)",
    gradeColor: "#f5f3ff",
    percentColor: "#ffffff",
    matchColor: "rgba(245,243,255,0.94)",
    textShadow: "0 1px 4px rgba(0,0,0,0.55)",
  },
};

function TacticalMatchBadge({ alignment }: { alignment: string }) {
  const tier = getTier(alignment);
  const visuals = tierVisuals[tier];
  const percent = parseAlignmentPercent(alignment);

  return (
    <div
      aria-label={`Match score ${percent} percent, tier ${tier}`}
      style={{
        position: "absolute",
        top: "14px",
        right: "14px",
        width: "90px",
        height: "90px",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        background: visuals.bg,
        border: `1px solid ${visuals.border}`,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: visuals.glow,
        zIndex: 5,
        pointerEvents: "none",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: visuals.gradeColor,
          lineHeight: 1,
          textShadow: visuals.textShadow,
        }}
      >
        {tier}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 800,
          lineHeight: 1,
          color: visuals.percentColor,
          textShadow: visuals.textShadow,
        }}
      >
        {percent}%
      </div>
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: visuals.matchColor,
          lineHeight: 1,
          textShadow: visuals.textShadow,
        }}
      >
        MATCH
      </div>
    </div>
  );
}

const themes = [
  {
    bg: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
    glow: "0 0 42px rgba(59,130,246,0.12)",
  },
  {
    bg: "linear-gradient(180deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98))",
    glow: "0 0 56px rgba(96,165,250,0.18)",
  },
];

export default function SwipeCardStack() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const startX = useRef(0);

  useEffect(() => {
    fetchJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const active = useMemo(() => jobs[index], [jobs, index]);

  const underlay = useMemo(() => {
    if (index >= jobs.length - 1) return null;
    return jobs[index + 1];
  }, [jobs, index]);

  const activeTheme = themes[index % 2];
  const underlayTheme = themes[(index + 1) % 2];

  const isAtEnd = jobs.length > 0 && index >= jobs.length - 1;

  const finishSwipe = (direction: number) => {
    if (isLeaving || isAtEnd) return;

    if (direction > 0 && active?.applyUrl) {
      console.log("Saved job:", active.role);
    }

    setIsLeaving(true);

    requestAnimationFrame(() => {
      setDragX(direction * window.innerWidth * 1.8);
    });

    setTimeout(() => {
      setIndex((prev) => Math.min(prev + 1, jobs.length - 1));
      setDragX(0);
      setIsLeaving(false);
    }, 260);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLeaving || isAtEnd) return;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLeaving || isAtEnd) return;
    const currentX = e.touches[0].clientX;
    setDragX(currentX - startX.current);
  };

  const handleTouchEnd = () => {
    if (isLeaving || isAtEnd) return;

    if (dragX > 120) {
      finishSwipe(1);
    } else if (dragX < -120) {
      finishSwipe(-1);
    } else {
      setDragX(0);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #0f172a 0%, #020617 75%)",
          color: "#dbeafe",
          fontSize: "22px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        Initializing strategic opportunities...
      </div>
    );
  }

  if (!active) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #0f172a 0%, #020617 75%)",
          color: "#dbeafe",
          fontSize: "22px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        No opportunities were found.
      </div>
    );
  }

  const cardStyles = (theme: any, isBackground = false) => ({
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    borderRadius: "30px",
    background: theme.bg,
    border: "2px solid rgba(148,163,184,0.24)",
    backdropFilter: "blur(18px)",
    boxShadow: theme.glow,
    color: "#f8fafc",
    overflow: "hidden" as const,
    boxSizing: "border-box" as const,
    zIndex: isBackground ? 1 : 2,
    display: "flex" as const,
    flexDirection: "column" as const,
  });

  const cardScrollStyles = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto" as const,
    padding: "24px",
    boxSizing: "border-box" as const,
  };

  const renderCard = (job: JobCard, theme: any, isBackground = false) => (
    <div style={cardStyles(theme, isBackground)}>
      <TacticalMatchBadge alignment={job.alignment} />
      <div style={cardScrollStyles}>{renderContent(job)}</div>
    </div>
  );

  const renderContent = (job: JobCard) => (
    <>
      <div style={{ paddingRight: "98px" }}>
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "0.12em",
            opacity: 0.62,
          }}
        >
          STRATEGIC OPPORTUNITY MATCH
        </div>

        <div
          style={{
            marginTop: "14px",
            fontSize: "clamp(30px, 8vw, 42px)",
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          {job.role}
        </div>

        <div
          style={{
            marginTop: "10px",
            color: "#93c5fd",
            fontSize: "22px",
            fontWeight: 600,
          }}
        >
          {job.company}
        </div>
      </div>

      <div
        style={{
          marginTop: "32px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "14px",
          color: "#94a3b8",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>{job.location}</div>
        <div>{job.salary}</div>
      </div>

      <div
        style={{
          marginTop: "26px",
          fontSize: "17px",
          lineHeight: 1.7,
          color: "#cbd5e1",
        }}
      >
        {job.description}
      </div>

      <div
        style={{
          marginTop: "28px",
          padding: "20px",
          borderRadius: "22px",
          background: "rgba(30,41,59,0.72)",
          border: "1px solid rgba(148,163,184,0.08)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            opacity: 0.6,
            letterSpacing: "0.08em",
            marginBottom: "10px",
          }}
        >
          WHY THIS FITS YOU
        </div>

        <div
          style={{
            fontSize: "16px",
            lineHeight: 1.7,
            color: "#e2e8f0",
          }}
        >
          {job.why}
        </div>
      </div>

      {isAtEnd && (
        <div
          style={{
            marginTop: "28px",
            padding: "22px",
            borderRadius: "22px",
            background: "rgba(59,130,246,0.10)",
            border: "1px solid rgba(148,163,184,0.12)",
            textAlign: "center",
            color: "#dbeafe",
            fontSize: "18px",
            fontWeight: 600,
          }}
        >
          End of strategic opportunities reached.
        </div>
      )}
    </>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 75%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(100%, 440px)",
          height: "calc(100dvh - 20px)",
        }}
      >
        {underlay && renderCard(underlay, underlayTheme, true)}

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            ...cardStyles(activeTheme),
            transform: `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
            transition: isLeaving ? "transform 0.26s ease-out" : "none",
            zIndex: 3,
          }}
        >
          <TacticalMatchBadge alignment={active.alignment} />
          <div style={cardScrollStyles}>
            {renderContent(active)}

            {!isAtEnd && (
              <div
                style={{
                  marginTop: "28px",
                  display: "flex",
                  gap: "12px",
                  paddingBottom: "10px",
                  position: "sticky",
                  bottom: 0,
                  background:
                    "linear-gradient(to top, rgba(15,23,42,1), rgba(15,23,42,0.0))",
                  paddingTop: "18px",
                }}
              >
                <button
                  onClick={() => window.open(active.applyUrl, "_blank")}
                  style={{
                    flex: 1,
                    padding: "18px",
                    borderRadius: "20px",
                    border: "none",
                    background: "rgba(59,130,246,0.22)",
                    color: "#dbeafe",
                    fontSize: "17px",
                    fontWeight: 700,
                  }}
                >
                  Pursue Opportunity
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
