
import { useMemo, useRef, useState } from "react";

const cards = [
  {
    role: "Creative Systems Strategist",
    company: "Nova Dynamics",
    location: "Remote",
    salary: "$110k - $145k",
    alignment: "94%",
    description:
      "Lead cross-functional innovation initiatives focused on immersive customer experiences, systems integration, and operational creativity. This role values people who can bridge creative thinking with technical execution and improve processes at scale.",
    why:
      "Your systems-thinking, troubleshooting background, and creative production experience strongly align with this opportunity.",
  },
  {
    role: "Experiential Product Designer",
    company: "Aether Labs",
    location: "Phoenix, AZ",
    salary: "$95k - $132k",
    alignment: "91%",
    description:
      "Design interactive product experiences blending visual storytelling, interface design, and emerging technology. Collaborate closely with engineering and strategy teams to prototype and launch immersive digital systems.",
    why:
      "Strong overlap with your AR/VR background, experiential design mindset, and multimedia systems experience.",
  },
  {
    role: "Technical Operations Lead",
    company: "Helix Industries",
    location: "Hybrid",
    salary: "$120k - $155k",
    alignment: "89%",
    description:
      "Oversee operational systems, production efficiency, troubleshooting strategy, and team coordination across multiple technology-driven environments. Requires leadership, adaptability, and rapid systems analysis.",
    why:
      "Your production optimization, military leadership, and technical troubleshooting experience make this a strong strategic fit.",
  },
];

export default function SwipeCardStack() {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);

  const startX = useRef(0);

  const activeCard = useMemo(() => cards[index], [index]);

  const advance = () => {
    setIndex((prev) => (prev + 1) % cards.length);
    setDragX(0);
    setAnimating(false);
  };

  const completeSwipe = (direction: number) => {
    setAnimating(true);
    setDragX(direction * window.innerWidth);

    setTimeout(() => {
      advance();
    }, 260);
  };

  const handleTouchStart = (e: any) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: any) => {
    const currentX = e.touches[0].clientX;
    setDragX(currentX - startX.current);
  };

  const handleTouchEnd = () => {
    if (dragX > 120) {
      completeSwipe(1);
    } else if (dragX < -120) {
      completeSwipe(-1);
    } else {
      setDragX(0);
    }
  };

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
        padding: "12px",
      }}
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: "100%",
          maxWidth: "440px",
          height: "calc(100dvh - 24px)",
          borderRadius: "30px",
          background: "rgba(15,23,42,0.88)",
          border: "1px solid rgba(148,163,184,0.14)",
          backdropFilter: "blur(18px)",
          boxShadow:
            "0 0 42px rgba(59,130,246,0.14)",
          padding: "24px",
          color: "#f8fafc",
          overflowY: "auto",
          transform: `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
          transition: animating || dragX === 0
            ? "transform 0.26s ease"
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
            fontSize: "clamp(30px, 6vw, 42px)",
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          {activeCard.role}
        </div>

        <div
          style={{
            marginTop: "10px",
            color: "#93c5fd",
            fontSize: "22px",
            fontWeight: 600,
          }}
        >
          {activeCard.company}
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
          <div>{activeCard.location}</div>
          <div>{activeCard.salary}</div>
        </div>

        <div
          style={{
            marginTop: "20px",
            padding: "12px 16px",
            borderRadius: "16px",
            background:
              "rgba(59,130,246,0.12)",
            color: "#dbeafe",
            fontWeight: 700,
            display: "inline-block",
          }}
        >
          Alignment Score: {activeCard.alignment}
        </div>

        <div
          style={{
            marginTop: "26px",
            fontSize: "17px",
            lineHeight: 1.7,
            color: "#cbd5e1",
          }}
        >
          {activeCard.description}
        </div>

        <div
          style={{
            marginTop: "28px",
            padding: "20px",
            borderRadius: "22px",
            background:
              "rgba(30,41,59,0.72)",
            border:
              "1px solid rgba(148,163,184,0.08)",
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
            {activeCard.why}
          </div>
        </div>

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
            onClick={() => completeSwipe(-1)}
            style={{
              flex: 1,
              padding: "18px",
              borderRadius: "20px",
              border: "none",
              background:
                "rgba(239,68,68,0.16)",
              color: "#fecaca",
              fontSize: "17px",
            }}
          >
            Pass
          </button>

          <button
            onClick={() => completeSwipe(1)}
            style={{
              flex: 1,
              padding: "18px",
              borderRadius: "20px",
              border: "none",
              background:
                "rgba(59,130,246,0.22)",
              color: "#dbeafe",
              fontSize: "17px",
              fontWeight: 700,
            }}
          >
            Pursue
          </button>
        </div>
      </div>
    </div>
  );
}
