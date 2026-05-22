import { useMemo } from "react";

export type ApplicationStage =
  | "Saved"
  | "Researching"
  | "Tailoring"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected";

export type ApplicationRecord = {
  id: string;
  company: string;
  title: string;
  stage: ApplicationStage;
  notes?: string;
  createdAt: string;
};

type Props = {
  applications: ApplicationRecord[];
};

const stageOrder: ApplicationStage[] = [
  "Saved",
  "Researching",
  "Tailoring",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
];

export default function ApplicationTracker({
  applications,
}: Props) {
  const grouped = useMemo(() => {
    return stageOrder.map((stage) => ({
      stage,
      items: applications.filter((a) => a.stage === stage),
    }));
  }, [applications]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: "14px",
      }}
    >
      {grouped.map((group) => (
        <div
          key={group.stage}
          style={{
            borderRadius: "18px",
            padding: "14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(148,163,184,0.14)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            {group.stage} ({group.items.length})
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {group.items.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: "14px",
                  padding: "10px",
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {item.title}
                </div>

                <div
                  style={{
                    opacity: 0.75,
                    fontSize: "13px",
                    marginTop: "2px",
                  }}
                >
                  {item.company}
                </div>

                {item.notes && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "13px",
                      lineHeight: 1.45,
                    }}
                  >
                    {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
