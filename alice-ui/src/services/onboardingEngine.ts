export type PromptOption = {
  id: string;
  label: string;
  description: string;
};

export type DirectionOption = {
  id: string;
  label: string;
};

export const promptOptions: PromptOption[] = [
  {
    id: "exact",
    label: "I know exactly what I want",
    description: "I have a clear target and want ALICE to match it precisely.",
  },
  {
    id: "exploring",
    label: "I’m exploring new directions",
    description: "I want fresh ideas and a broader opportunity map.",
  },
  {
    id: "burned",
    label: "I’m burned out and need a change",
    description: "I need a more sustainable direction with less friction.",
  },
  {
    id: "discover",
    label: "Help me discover what I’d be great at",
    description: "Reveal strengths and roles I may not have considered.",
  },
  {
    id: "browse",
    label: "I want to explore several industries",
    description: "Open multiple lanes and hybrid career pathways.",
  },
];

export const directionOptions: DirectionOption[] = [
  { id: "creative-tech", label: "Creative Technology" },
  { id: "systems-engineering", label: "Systems & Engineering" },
  { id: "experiential-design", label: "Experiential Design" },
  { id: "process-improvement", label: "Process Improvement" },
];

export function buildOnboardingObservation(
  prompts: string[],
  directions: string[]
): string {
  if (directions.includes("Systems & Engineering") && prompts.includes("I know exactly what I want")) {
    return "You appear strongly drawn toward high-autonomy technical roles.";
  }

  if (directions.includes("Creative Technology") && prompts.includes("Help me discover what I’d be great at")) {
    return "You seem most engaged when creativity and systems-thinking overlap.";
  }

  if (directions.includes("Experiential Design")) {
    return "Your appetite for experience-led work suggests a premium design and product path.";
  }

  if (prompts.includes("I’m burned out and need a change")) {
    return "ALICE senses that sustainable, lower-friction work will help you reset strategically.";
  }

  return "ALICE is building an early sense of your strategic focus and will keep refining the path.";
}

export function buildAdaptiveArchetype(prompts: string[], directions: string[]): string {
  if (directions.includes("Creative Technology")) {
    return "Creative Technology Pathfinder";
  }
  if (directions.includes("Systems & Engineering")) {
    return "Autonomous Systems Strategist";
  }
  if (directions.includes("Experiential Design")) {
    return "Experience Innovation Architect";
  }
  if (directions.includes("Process Improvement")) {
    return "Operational Rebuilder";
  }
  if (prompts.includes("I’m burned out and need a change")) {
    return "Resilient Career Rebuilder";
  }
  return "Strategic Explorer";
}
