export type ResumeProfile = {
  name: string;
  title: string;
  location: string;
  summarySeed: string;
  voiceRules: string[];
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

const clean = (value: string | undefined) => String(value || "").toLowerCase();

const readableTag = (tag: string) => {
  if (!tag.includes(":")) return tag.replaceAll("_", " ");
  return tag.split(":")[1].replaceAll("_", " ");
};

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
    (job.tags || []).map(readableTag).join(" "),
  ]
    .join(" ")
    .toLowerCase();

const hasAny = (text: string, words: string[]) =>
  words.some((word) => text.includes(word));

export function buildTailoredSummary(job: JobData, profile: ResumeProfile) {
  const text = jobText(job);

  if (
    hasAny(text, [
      "print",
      "printing",
      "press",
      "indigo",
      "prepress",
      "production",
      "manufacturing",
      "operator",
    ])
  ) {
    return "A lot of my background has lived right where creativity, production, and technical problem-solving overlap. I’ve worked in high-volume print environments, handled HP Indigo production work, and usually end up being the person trying to understand why something is slowing down, breaking rhythm, or not working the way it should. I’m strongest in roles where the work is real, the systems matter, and there is room to improve how things get done.";
  }

  if (
    hasAny(text, [
      "technician",
      "equipment",
      "maintenance",
      "troubleshooting",
      "mechanical",
      "repair",
      "diagnostic",
      "systems",
    ])
  ) {
    return "I tend to understand systems by getting close to them, watching how they behave, and figuring out where the problem is actually coming from. That mindset started with F-16 aircraft maintenance and has carried into production, print, workflow, and creative technology work. I’m not someone who needs everything handed to me step by step; I’m usually the one digging in until the pattern starts to make sense.";
  }

  if (
    hasAny(text, [
      "design",
      "creative",
      "branding",
      "adobe",
      "graphics",
      "multimedia",
      "interactive",
      "prototype",
    ])
  ) {
    return "I’ve spent much of my career turning rough ideas into finished, usable creative work. That has included graphic design, branding, production art, interactive media, AR projects, prototypes, presentations, and whatever else had to be figured out along the way. I’m at my best when a role needs someone who can think creatively, understand the technical side, and still get the work across the finish line.";
  }

  if (
    hasAny(text, [
      "workflow",
      "process",
      "operations",
      "efficiency",
      "documentation",
      "sop",
    ])
  ) {
    return "I naturally notice where work gets slowed down, where people are fighting the process, and where a better system would make the whole thing easier. I’ve built workflows, created SOPs, and improved production processes by looking closely at how the work really happens instead of how it is supposed to happen on paper.";
  }

  return profile.summarySeed;
}

export function buildTailoredHighlights(job: JobData) {  
  const text = jobText(job);

  const highlights: string[] = [];

  if (hasAny(text, ["print", "printing", "press", "indigo", "prepress"])) {
    highlights.push(
      "Hands-on HP Indigo and print production experience, including high-volume production environments.",
      "Strong understanding of how design, prepress, color, production flow, and equipment behavior connect.",
    );
  }

  if (hasAny(text, ["technician", "equipment", "maintenance", "mechanical", "troubleshooting", "diagnostic"])) {
    highlights.push(
      "Troubleshooting mindset shaped by F-16 aircraft maintenance and years of hands-on technical work.",
      "Usually becomes the person people call when something complicated stops working or stops making sense.",
    );
  }

  if (hasAny(text, ["workflow", "process", "operations", "efficiency", "sop"])) {
    highlights.push(
      "Looks for the bottlenecks in a workflow and finds practical ways to make the process easier, faster, or more reliable.",
      "Created production workflows and SOPs that made work easier to repeat accurately.",
    );
  }

  if (hasAny(text, ["design", "creative", "branding", "adobe", "graphics", "multimedia"])) {
    highlights.push(
      "20+ years of creative production experience across design, branding, multimedia, Adobe tools, and production execution.",
      "Able to move between creative thinking and technical execution without losing sight of the finished product.",
    );
  }

  if (highlights.length === 0) {
    return [
      "Blends creative experience, technical reasoning, production knowledge, and hands-on troubleshooting.",
      "Learns unfamiliar systems quickly by watching how they behave and figuring out how the pieces connect.",
      "Strong at turning rough ideas, broken workflows, or unclear problems into something usable and practical.",
      "Brings a real-world background that crosses design, production, military maintenance, process improvement, and technology.",
    ];
  }

  return highlights.slice(0, 6);
}

export function rankExperiences(
  job: JobData,
  experiences: ResumeProfile["experiences"]
) {
  const text = jobText(job);

  return [...experiences].sort((a, b) => {
    const aScore = a.tags.filter((tag) => text.includes(clean(tag))).length;
    const bScore = b.tags.filter((tag) => text.includes(clean(tag))).length;
    return bScore - aScore;
  });
}

export function generateResumeDraft(job: JobData, profile: ResumeProfile) {
  return {
    summary: buildTailoredSummary(job, profile),
    highlights: buildTailoredHighlights(job),
    experiences: rankExperiences(job, profile.experiences),
  };
}
