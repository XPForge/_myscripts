export type OnboardingMode =
  | "precision"
  | "exploration"
  | "discovery"
  | "reset"
  | "hybrid";

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
    id: "precision",
    label: "Narrow to a precise fit",
    description: "I know what I want and want ALICE to match it sharply.",
  },
  {
    id: "exploration",
    label: "Explore multiple industries",
    description: "Show me adjacent paths and broaden my opportunity map.",
  },
  {
    id: "discovery",
    label: "Discover new strengths",
    description: "Help me identify strengths and roles I may not yet see.",
  },
  {
    id: "reset",
    label: "Reset into sustainable work",
    description: "Surface lower-friction roles that support a strategic restart.",
  },
  {
    id: "hybrid",
    label: "Show hybrid creative/technical fit",
    description: "Reveal roles that blend technical depth with creative ownership.",
  },
];

export const directionOptions: DirectionOption[] = [
  { id: "creative-tech", label: "Creative Technology" },
  { id: "systems-engineering", label: "Systems & Engineering" },
  { id: "experiential-design", label: "Experiential Design" },
  { id: "process-improvement", label: "Process Improvement" },
];

export function inferOnboardingMode(prompts: string[]): OnboardingMode {
  if (prompts.includes("precision")) return "precision";
  if (prompts.includes("exploration")) return "exploration";
  if (prompts.includes("discovery")) return "discovery";
  if (prompts.includes("reset")) return "reset";
  if (prompts.includes("hybrid")) return "hybrid";
  return "exploration";
}

export function buildOnboardingObservation(
  prompts: string[],
  directions: string[]
): string {
  if (directions.includes("Systems & Engineering") && prompts.includes("precision")) {
    return "Your focus on systems and precision suggests strong fit for technical autonomy.";
  }

  if (directions.includes("Creative Technology") && prompts.includes("discovery")) {
    return "There is an emerging signal toward creative-technical roles and exploratory strength.";
  }

  if (directions.includes("Experiential Design")) {
    return "Your interest in experience-led work suggests a strategic product and design path.";
  }

  if (prompts.includes("reset")) {
    return "ALICE senses that sustainability and lower friction should shape your next move.";
  }

  return "ALICE is building a neutral, adaptive profile and will keep refining recommendations as you interact.";
}
