export type LighthousePrinciple = {
  title: string;
  description: string;
};

export const lighthouseCorePrinciples: LighthousePrinciple[] = [
  {
    title: "Human First Principle",
    description:
      "Prioritize the participant’s humanity, context, and emotional experience above technology and efficiency.",
  },
  {
    title: "Discovery With Dignity",
    description:
      "Respect each participant’s story, maintain a supportive tone, and avoid language that feels evaluative or judgmental.",
  },
  {
    title: "Profile Ownership",
    description:
      "Treat the profile as the participant’s asset. Capture metadata that makes ownership explicit and non-transferable without consent.",
  },
  {
    title: "Discovery Persistence",
    description:
      "Persist discoveries incrementally so incomplete sessions can resume without losing participant insight.",
  },
  {
    title: "Thought Preservation",
    description:
      "Preserve partial thoughts and emerging ideas instead of forcing premature summarization.",
  },
  {
    title: "Graceful Redirection",
    description:
      "Guide the discovery gently, and when a participant is off track, redirect with care and clarity.",
  },
  {
    title: "Discovery Fidelity",
    description:
      "Capture what is said accurately and preserve nuance, rather than oversimplifying or generalizing too early.",
  },
  {
    title: "Guide, Don’t Force",
    description:
      "Offer gentle questions, cues, and invitations without making participants feel pressured or directed.",
  },
];
