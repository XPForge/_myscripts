
type OpportunityCardProps = {
  role: string;
  company: string;
  fit: string;
  salary: string;
  location: string;
};

const sampleCards: OpportunityCardProps[] = [
  {
    role: "Creative Systems Strategist",
    company: "Nova Dynamics",
    fit: "Strong alignment with your systems-thinking and creative problem solving.",
    salary: "$110k - $145k",
    location: "Remote",
  },
  {
    role: "Experiential Product Designer",
    company: "Aether Labs",
    fit: "High overlap with immersive design and innovation strengths.",
    salary: "$95k - $132k",
    location: "Phoenix, AZ",
  },
  {
    role: "Technical Operations Lead",
    company: "Helix Industries",
    fit: "Leadership, troubleshooting, and production optimization strongly aligned.",
    salary: "$120k - $155k",
    location: "Hybrid",
  },
];

export default function SwipeCardStack() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 18px 120px",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 75%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {sampleCards.map((card, index) => (
          <div
            key={index}
            style={{
              background: "rgba(15,23,42,0.82)",
              border: "1px solid rgba(148,163,184,0.14)",
              borderRadius: "28px",
              padding: "26px",
              backdropFilter: "blur(18px)",
              boxShadow:
                "0 0 28px rgba(59,130,246,0.10)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                opacity: 0.65,
                marginBottom: "8px",
                letterSpacing: "0.08em",
              }}
            >
              OPPORTUNITY MATCH
            </div>

            <div
              style={{
                fontSize: "30px",
                fontWeight: 800,
                lineHeight: 1.1,
                color: "#f8fafc",
              }}
            >
              {card.role}
            </div>

            <div
              style={{
                marginTop: "10px",
                fontSize: "18px",
                color: "#93c5fd",
                fontWeight: 600,
              }}
            >
              {card.company}
            </div>

            <div
              style={{
                marginTop: "24px",
                fontSize: "17px",
                lineHeight: 1.6,
                color: "#cbd5e1",
              }}
            >
              {card.fit}
            </div>

            <div
              style={{
                marginTop: "28px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "15px",
                color: "#94a3b8",
              }}
            >
              <div>{card.salary}</div>
              <div>{card.location}</div>
            </div>

            <div
              style={{
                marginTop: "32px",
                display: "flex",
                gap: "12px",
              }}
            >
              <button
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "18px",
                  border: "none",
                  background: "rgba(239,68,68,0.14)",
                  color: "#fecaca",
                  fontSize: "16px",
                }}
              >
                Pass
              </button>

              <button
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "18px",
                  border: "none",
                  background: "rgba(59,130,246,0.18)",
                  color: "#dbeafe",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                Pursue
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
