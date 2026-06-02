export type ExperienceLevel = "low" | "medium" | "high";

export type FormalityLevel = "casual" | "balanced" | "formal";

export type PacingStyle = "slow" | "steady" | "dynamic";

export type ChallengeStyle =
  | "none"
  | "gentle"
  | "direct"
  | "accountability-focused";

export type ExploratoryStyle =
  | "broad"
  | "focused"
  | "iterative"
  | "investigative";

export type ListeningStyle =
  | "reflective"
  | "analytical"
  | "supportive"
  | "directive";

export type InterruptionPolicy =
  | "never"
  | "clarification-only"
  | "redirect-when-needed"
  | "active-guidance";

export type FrequencyLevel = "rare" | "occasional" | "regular" | "frequent";

export type BranchingBehavior =
  | "linear"
  | "adaptive"
  | "participant-led"
  | "agent-led";

export interface ConversationStyle {
  tone: string;
  formality: FormalityLevel;
  warmth: ExperienceLevel;
  humor: ExperienceLevel;
  pacing: PacingStyle;
  metadata?: Record<string, unknown>;
}

export interface QuestionStrategy {
  openEndedTendency: ExperienceLevel;
  followUpDepth: ExperienceLevel;
  exploratoryStyle: ExploratoryStyle;
  challengeStyle: ChallengeStyle;
  metadata?: Record<string, unknown>;
}

export interface TrustStrategy {
  rapportBuilding: ExperienceLevel;
  safetyCreation: ExperienceLevel;
  transparencyLevel: ExperienceLevel;
  disclosureApproach: string;
  metadata?: Record<string, unknown>;
}

export interface InteractionStrategy {
  listeningStyle: ListeningStyle;
  interruptionPolicy: InterruptionPolicy;
  reflectionFrequency: FrequencyLevel;
  summarizationFrequency: FrequencyLevel;
  metadata?: Record<string, unknown>;
}

export interface CuriosityModel {
  curiosityIntensity: ExperienceLevel;
  explorationDepth: ExperienceLevel;
  branchingBehavior: BranchingBehavior;
  followUpBehavior: ExploratoryStyle;
  metadata?: Record<string, unknown>;
}

export interface ExperienceProfile {
  id: string;
  name: string;
  description: string;
  version: string;
  conversationStyle: ConversationStyle;
  questionStrategy: QuestionStrategy;
  trustStrategy: TrustStrategy;
  interactionStrategy: InteractionStrategy;
  curiosityModel: CuriosityModel;
  metadata?: Record<string, unknown>;
}
