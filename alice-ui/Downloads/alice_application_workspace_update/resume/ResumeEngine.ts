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
  responsibilities?: string;
  preferred?: string;
  tools?: string;
  domain?: string;
  tags?: string[];
};

const normalize = (value: string | undefined) => String(value || "").toLowerCase();

const jobText = (job: JobData) =>
  [
    job.title,
    job.company,
    job.domain,
    job.description,
    job.requirements,
    job.responsibilities,
    job.preferred,
    job.tools,
    (job.tags || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();

export function buildTailoredSummary(job: JobData, profile: ResumeProfile) {
  const text = jobText(job);

  if (
    text.includes("technician") ||
    text.includes("equipment") ||
    text.includes("maintenance") ||
    text.includes("troubleshooting") ||
    text.includes("mechanical")
  ) {
    return "I naturally gravitate toward figuring out how systems work, finding the source of problems, and getting equipment or processes back on track. My background has crossed military aircraft systems, production environments, and hands-on troubleshooting, so I tend to look at a problem from both the mechanical side and the workflow side.";
  }

  if (
    text.includes("print") ||
    text.includes("press") ||
    text.includes("production") ||
    text.includes("manufacturing")
  ) {
    return "My strongest work tends to happen in production environments where quality, speed, and problem solving all matter at the same time. I understand how small issues in a process can slow everything down, and I’m comfortable jumping in, learning the system, and helping keep work moving.";
  }

  if (
    text.includes("design") ||
    text.includes("creative") ||
    text.includes("branding") ||
    text.includes("adobe")
  ) {
    return "My background blends creative production, technology, and hands-on execution. I’ve spent years turning ideas into real working experiences, from design and media production to interactive and augmented reality projects. I’m strongest when creativity has to connect with practical execution.";
  }

  return profile.summarySeed;
}

export function buildTailoredHighlights(job: JobData, profile: ResumeProfile) {
  const text = jobText(job);

  const matched = profile.strengths.filter((strength) =>
    text.includes(strength.toLowerCase())
  );

  const fallback = [
    "Systems thinking and troubleshooting mindset",
    "Hands-on production and technical problem solving",
    "Ability to learn unfamiliar tools and processes quickly",
    "Creative and technical experience across multiple environments",
  ];

  return matched.length > 0 ? matched : fallback;
}

export function rankExperiences(
  job: JobData,
  experiences: ResumeProfile["experiences"]
) {
  const text = jobText(job);

  return [...experiences].sort((a, b) => {
    const aScore = a.tags.filter((tag) => text.includes(normalize(tag))).length;
    const bScore = b.tags.filter((tag) => text.includes(normalize(tag))).length;

    return bScore - aScore;
  });
}

export function generateResumeDraft(job: JobData, profile: ResumeProfile) {
  return {
    summary: buildTailoredSummary(job, profile),
    highlights: buildTailoredHighlights(job, profile),
    experiences: rankExperiences(job, profile.experiences),
  };
}
