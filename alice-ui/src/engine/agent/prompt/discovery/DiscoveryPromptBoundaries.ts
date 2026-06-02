export type DiscoveryPromptInfluenceArea =
  | "wording"
  | "tone"
  | "question-focus"
  | "reflection-framing"
  | "boundary-reminders"
  | "participant-authority-reminders"
  | "runtime-metadata";

export type DiscoveryPromptProhibitedInfluenceArea =
  | "observation-creation"
  | "evidence-creation"
  | "confidence-calculation"
  | "pattern-creation"
  | "coverage-calculation"
  | "understanding-creation"
  | "participant-authority-override"
  | "profile-generation"
  | "runtime-transport"
  | "model-execution";

export interface DiscoveryPromptBoundaryRule {
  id: string;
  title: string;
  description: string;
  area: DiscoveryPromptInfluenceArea | DiscoveryPromptProhibitedInfluenceArea;
}

export interface DiscoveryPromptBoundaries {
  id: string;
  name: string;
  description: string;
  mayInfluence: DiscoveryPromptBoundaryRule[];
  mayNotInfluence: DiscoveryPromptBoundaryRule[];
  requiredSafeguards: DiscoveryPromptBoundaryRule[];
  metadata?: Record<string, unknown>;
}
