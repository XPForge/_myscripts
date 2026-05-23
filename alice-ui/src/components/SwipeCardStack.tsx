
import { useMemo, useState } from "react";

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

  const activeCard = useMemo(() => cards[index], [index]);

  const advance = () => {
    setDragX(0);
    setIndex((prev) => (prev + 1) % cards.length);
  };

  const handleTouchStart = (e: any) => {
    const startX = e.touches[0].clientX;

    const move = (ev: any) => {
      const currentX = ev.touches[0].clientX;
      setDragX(currentX - startX);
    };

    const end = () => {
      if (Math.abs(dragX) > 120) {
        advance();
      } else {
        setDragX(0);
      }

      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };

    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", end);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 75%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "18px",
      }}
    >
      <div
        onTouchStart={handleTouchStart}
        style={{
          width: "100%",
          maxWidth: "430px",
          height: "88dvh",
          borderRadius: "34px",
          background: "rgba(15,23,42,0.82)",
          border: "1px solid rgba(148,163,184,0.14)",
          backdropFilter: "blur(20px)",
          boxShadow:
            "0 0 42px rgba(59,130,246,0.14)",
          padding: "28px",
          color: "#f8fafc",
          overflowY: "auto",
          transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`,
          transition:
            dragX === 0
              ? "transform 0.25s ease"
              : "none",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            letterSpacing: "0.1em",
            opacity: 0.65,
          }}
        >
          STRATEGIC OPPORTUNITY MATCH
        </div>

        <div
          style={{
            marginTop: "16px",
            fontSize: "38px",
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          {activeCard.role}
        </div>

        <div
          style={{
            marginTop: "12px",
            color: "#93c5fd",
            fontSize: "22px",
            fontWeight: 600,
          }}
        >
          {activeCard.company}
        </div>

        <div
          style={{
            marginTop: "26px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "15px",
            color: "#94a3b8",
          }}
        >
          <div>{activeCard.location}</div>
          <div>{activeCard.salary}</div>
        </div>

        <div
          style={{
            marginTop: "22px",
            padding: "14px 18px",
            borderRadius: "18px",
            background:
              "rgba(59,130,246,0.12)",
            color: "#dbeafe",
            fontWeight: 600,
            display: "inline-block",
          }}
        >
          Alignment Score: {activeCard.alignment}
        </div>

        <div
          style={{
            marginTop: "34px",
            fontSize: "18px",
            lineHeight: 1.8,
            color: "#cbd5e1",
          }}
        >
          {activeCard.description}
        </div>

        <div
          style={{
            marginTop: "34px",
            padding: "22px",
            borderRadius: "24px",
            background:
              "rgba(30,41,59,0.65)",
            border:
              "1px solid rgba(148,163,184,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              opacity: 0.6,
              letterSpacing: "0.08em",
              marginBottom: "12px",
            }}
          >
            WHY THIS FITS YOU
          </div>

          <div
            style={{
              fontSize: "17px",
              lineHeight: 1.7,
              color: "#e2e8f0",
            }}
          >
            {activeCard.why}
          </div>
        </div>

        <div
          style={{
            marginTop: "36px",
            display: "flex",
            gap: "14px",
            paddingBottom: "24px",
          }}
        >
          <button
            onClick={advance}
            style={{
              flex: 1,
              padding: "18px",
              borderRadius: "22px",
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
            onClick={advance}
            style={{
              flex: 1,
              padding: "18px",
              borderRadius: "22px",
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
