export type ResumeProfile = {
  name: string;
  title: string;
  summarySeed: string;
  strengths: string[];
  experiences: {
    company: string;
    title: string;
    years: string;
    highlights: string[];
    tags: string[];
  }[];
};

export type JobData = {
  title: string;
  company: string;
  description?: string;
  requirements?: string;
  domain?: string;
  tags?: string[];
};

export function buildTailoredSummary(
  job: JobData,
  profile: ResumeProfile
) {
  const title = job.title.toLowerCase();

  if (title.includes("technician")) {
    return `I naturally gravitate toward understanding how systems work, troubleshooting issues quickly, and improving processes that slow production down. My background ranges from military aircraft systems to HP Indigo production environments, and I enjoy solving technical problems in fast-moving environments.`;
  }

  if (title.includes("design")) {
    return `My background blends creative design, technology integration, and hands-on production experience. I enjoy building experiences that connect creativity with practical execution, especially in environments where adaptability and problem solving matter.`;
  }

  return profile.summarySeed;
}

export function buildTailoredHighlights(
  job: JobData,
  profile: ResumeProfile
) {
  const tags = (job.tags || []).join(" ").toLowerCase();

  return profile.strengths.filter((strength) =>
    tags.includes(strength.toLowerCase()) ||
    job.title.toLowerCase().includes(strength.toLowerCase())
  );
}

export function rankExperiences(
  job: JobData,
  experiences: ResumeProfile["experiences"]
) {
  const title = job.title.toLowerCase();

  return [...experiences].sort((a, b) => {
    const aScore =
      a.tags.filter((t) => title.includes(t.toLowerCase())).length;

    const bScore =
      b.tags.filter((t) => title.includes(t.toLowerCase())).length;

    return bScore - aScore;
  });
}

export function generateResumeDraft(
  job: JobData,
  profile: ResumeProfile
) {
  const summary = buildTailoredSummary(job, profile);
  const highlights = buildTailoredHighlights(job, profile);
  const ranked = rankExperiences(job, profile.experiences);

  return {
    summary,
    highlights,
    experiences: ranked,
  };
}
