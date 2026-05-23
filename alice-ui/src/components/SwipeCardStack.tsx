
import { useMemo, useRef, useState } from "react";

const cards = [
  {
    role: "Creative Systems Strategist",
    company: "Nova Dynamics",
    location: "Remote",
    salary: "$110k - $145k",
    alignment: "94%",
    description:
      "Lead immersive customer experience initiatives, systems integration, and strategic operational innovation.",
    why:
      "Strong alignment with systems-thinking and creative production experience.",
  },
  {
    role: "Experiential Product Designer",
    company: "Aether Labs",
    location: "Phoenix, AZ",
    salary: "$95k - $132k",
    alignment: "91%",
    description:
      "Design interactive digital systems blending storytelling, interface design, and emerging technology.",
    why:
      "Strong overlap with AR/VR and experiential design strengths.",
  },
  {
    role: "Technical Operations Lead",
    company: "Helix Industries",
    location: "Hybrid",
    salary: "$120k - $155k",
    alignment: "89%",
    description:
      "Lead operational troubleshooting, systems optimization, and technical coordination.",
    why:
      "Strong fit for leadership and process optimization background.",
  },
];

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
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [exitX, setExitX] = useState<number | null>(null);

  const startX = useRef(0);

  const active = useMemo(() => cards[index], [index]);
  const next = useMemo(() => cards[(index + 1) % cards.length], [index]);

  const activeTheme = themes[index % 2];
  const nextTheme = themes[(index + 1) % 2];

  const finishSwipe = (direction: number) => {
    setExitX(direction * window.innerWidth * 1.6);

    setTimeout(() => {
      setIndex((prev) => (prev + 1) % cards.length);
      setDragX(0);
      setExitX(null);
    }, 240);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const currentX = e.touches[0].clientX;
    setDragX(currentX - startX.current);
  };

  const handleTouchEnd = () => {
    if (dragX > 120) {
      finishSwipe(1);
    } else if (dragX < -120) {
      finishSwipe(-1);
    } else {
      setDragX(0);
    }
  };

  const renderCard = (card: any, theme: any, isBackground = false) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        borderRadius: "30px",
        background: theme.bg,
        border: "2px solid rgba(148,163,184,0.24)",
        backdropFilter: "blur(18px)",
        boxShadow: theme.glow,
        padding: "24px",
        color: "#f8fafc",
        overflowY: "auto",
        boxSizing: "border-box",
        zIndex: isBackground ? 1 : 2,
        opacity: isBackground ? 1 : 1,
        transform: isBackground
          ? "translateX(0px)"
          : exitX !== null
          ? `translateX(${exitX}px) rotate(${exitX / 30}deg)`
          : `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
        transition:
          exitX !== null || dragX === 0
            ? "transform 0.24s ease"
            : "none",
      }}
    >
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
        {card.role}
      </div>

      <div
        style={{
          marginTop: "10px",
          color: "#93c5fd",
          fontSize: "22px",
          fontWeight: 600,
        }}
      >
        {card.company}
      </div>

      <div
        style={{
          marginTop: "24px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "14px",
          color: "#94a3b8",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>{card.location}</div>
        <div>{card.salary}</div>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "12px 16px",
          borderRadius: "16px",
          background: "rgba(59,130,246,0.12)",
          color: "#dbeafe",
          fontWeight: 700,
          display: "inline-block",
        }}
      >
        Alignment Score: {card.alignment}
      </div>

      <div
        style={{
          marginTop: "26px",
          fontSize: "17px",
          lineHeight: 1.7,
          color: "#cbd5e1",
        }}
      >
        {card.description}
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
          {card.why}
        </div>
      </div>

      {!isBackground && (
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
            onClick={() => finishSwipe(-1)}
            style={{
              flex: 1,
              padding: "18px",
              borderRadius: "20px",
              border: "none",
              background: "rgba(239,68,68,0.16)",
              color: "#fecaca",
              fontSize: "17px",
            }}
          >
            Pass
          </button>

          <button
            onClick={() => finishSwipe(1)}
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
            Pursue
          </button>
        </div>
      )}
    </div>
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
        {renderCard(next, nextTheme, true)}

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
          }}
        >
          {renderCard(active, activeTheme)}
        </div>
      </div>
    </div>
  );
}
