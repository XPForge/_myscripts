import { useMemo, useState, useEffect } from "react";
import { generateResumeDraft, type JobData } from "./ResumeEngine";
import { paulProfile } from "./profile";

type Props = {
  selectedJob: JobData;
};

export default function ResumeWorkspace({ selectedJob }: Props) {
  const draft = useMemo(() => {
    return generateResumeDraft(selectedJob, paulProfile);
  }, [selectedJob]);

  const [summary, setSummary] = useState(draft.summary);

  useEffect(() => {
    setSummary(draft.summary);
  }, [draft.summary]);

  const resumeText = [
    paulProfile.name,
    paulProfile.location,
    paulProfile.title,
    "",
    "SUMMARY",
    summary,
    "",
    "TAILORED STRENGTHS",
    ...draft.highlights.map((item) => `• ${item}`),
    "",
    "RELEVANT EXPERIENCE",
    ...draft.experiences.flatMap((exp) => [
      `${exp.title} — ${exp.company}`,
      exp.years,
      ...exp.highlights.map((h) => `• ${h}`),
      "",
    ]),
  ].join("\\n");

  const downloadTextFile = () => {
    const blob = new Blob([resumeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeCompany = selectedJob.company.replace(/[^a-z0-9]+/gi, "_");
    const safeTitle = selectedJob.title.replace(/[^a-z0-9]+/gi, "_");
    a.href = url;
    a.download = `Tailored_Resume_${safeCompany}_${safeTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "18px" }}>
      <div style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: "18px", padding: "16px", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>
          Job Target
        </div>
        <div style={{ fontSize: "14px", opacity: 0.9 }}>
          {selectedJob.title} at {selectedJob.company}
        </div>
        <div style={{ fontSize: "13px", opacity: 0.7, marginTop: "6px" }}>
          Domain: {selectedJob.domain || "Not specified"}
        </div>
      </div>

      <div style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: "18px", padding: "16px", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>
          Tailored Summary
        </div>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          style={{
            width: "100%",
            minHeight: "170px",
            borderRadius: "14px",
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(0,0,0,0.22)",
            color: "inherit",
            padding: "12px",
            lineHeight: 1.55,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: "18px", padding: "16px", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>
          Tailored Strengths
        </div>
        <ul style={{ marginTop: "8px", lineHeight: 1.65 }}>
          {draft.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: "18px", padding: "16px", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "12px" }}>
          Prioritized Experience
        </div>

        {draft.experiences.map((exp) => (
          <div
            key={`${exp.company}-${exp.title}`}
            style={{
              marginBottom: "18px",
              paddingBottom: "14px",
              borderBottom: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {exp.title} — {exp.company}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.65, marginTop: "2px" }}>
              {exp.years}
            </div>

            <ul style={{ marginTop: "8px", lineHeight: 1.6 }}>
              {exp.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={downloadTextFile}
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(96,165,250,0.35)",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Download Resume Draft
        </button>

        <button
          onClick={() => navigator.clipboard.writeText(resumeText)}
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(255,255,255,0.04)",
            color: "inherit",
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Copy Resume Text
        </button>
      </div>
    </div>
  );
}
