type ProfileSignalItem = {
  label: string;
  value: number;
  hint?: string;
};

type ProfileSignalGroupProps = {
  title: string;
  items: ProfileSignalItem[];
};

export default function ProfileSignalGroup({ title, items }: ProfileSignalGroupProps) {
  return (
    <section
      style={{
        display: "grid",
        gap: "12px",
        padding: "18px",
        borderRadius: "18px",
        background: "rgba(15,23,42,0.94)",
        border: "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <div
        style={{
          fontSize: "0.88rem",
          letterSpacing: "0.12em",
          color: "rgba(148,163,184,0.82)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: "12px" }}>
        {items.map((item) => (
          <div key={item.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                color: "#e2e8f0",
                fontSize: "0.95rem",
              }}
            >
              <span>{item.label}</span>
              <span style={{ color: "rgba(148,163,184,0.9)" }}>
                {(item.value * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                marginTop: "6px",
                height: "8px",
                borderRadius: "999px",
                background: "rgba(148,163,184,0.14)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(Math.max(item.value, 0), 1) * 100}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, rgba(59,130,246,0.9), rgba(34,211,153,0.78))",
                }}
              />
            </div>
            {item.hint ? (
              <div style={{ marginTop: "6px", color: "rgba(148,163,184,0.72)", fontSize: "0.82rem" }}>
                {item.hint}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
