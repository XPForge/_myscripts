import { buildJobIntelligence } from "./JobIntelligence";

type Props = {
  job: {
    title: string;
    company: string;
    description?: string;
  };
};

export default function IntelligencePanel({
  job,
}: Props) {
  const data = buildJobIntelligence(job);

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
      }}
    >
      <section
        style={{
          borderRadius: "18px",
          padding: "16px",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          Strategic Strengths
        </div>

        <ul style={{ lineHeight: 1.6 }}>
          {data.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section
        style={{
          borderRadius: "18px",
          padding: "16px",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          Positioning Guidance
        </div>

        <ul style={{ lineHeight: 1.6 }}>
          {data.positioning.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {data.concerns.length > 0 && (
        <section
          style={{
            borderRadius: "18px",
            padding: "16px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            Recruiter Concerns
          </div>

          <ul style={{ lineHeight: 1.6 }}>
            {data.concerns.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
