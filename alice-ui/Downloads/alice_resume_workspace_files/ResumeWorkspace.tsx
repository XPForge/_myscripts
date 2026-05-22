import { useMemo } from "react";
import {
  generateResumeDraft,
  JobData,
} from "./ResumeEngine";

import { paulProfile } from "./profile";

type Props = {
  selectedJob: JobData;
};

export default function ResumeWorkspace({
  selectedJob,
}: Props) {
  const draft = useMemo(() => {
    return generateResumeDraft(
      selectedJob,
      paulProfile
    );
  }, [selectedJob]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "20px",
      }}
    >
      <div>
        <h2>Tailored Resume Draft</h2>
        <div>{selectedJob.title}</div>
        <div>{selectedJob.company}</div>
      </div>

      <section>
        <h3>Summary</h3>
        <p>{draft.summary}</p>
      </section>

      <section>
        <h3>Top Strengths</h3>

        <ul>
          {draft.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Experience</h3>

        {draft.experiences.map((exp) => (
          <div
            key={exp.company}
            style={{
              marginBottom: "18px",
              paddingBottom: "12px",
              borderBottom: "1px solid #333",
            }}
          >
            <strong>
              {exp.title} — {exp.company}
            </strong>

            <div>{exp.years}</div>

            <ul>
              {exp.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
