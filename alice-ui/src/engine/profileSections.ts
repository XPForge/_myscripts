export const profileSectionTitles = [
  "Executive Summary",
  "Core Themes",
  "Natural Strengths",
  "Thinking Style",
  "Learning Style",
  "Creative Profile",
  "Collaboration Profile",
  "Environmental Fit",
  "Unique Contributions",
  "Opportunity Alignment",
  "Potential Blind Spots",
  "Lighthouse Summary",
  "Open Questions",
] as const;

export type ProfileSectionTitle = (typeof profileSectionTitles)[number];

