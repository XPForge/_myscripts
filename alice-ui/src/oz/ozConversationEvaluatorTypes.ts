export type OzConversationRole = "assistant" | "user";

export type OzConversationTurn = {
  role: OzConversationRole;
  content: string;
  timestamp?: string;
};

export type OzConversationInput = {
  sessionId?: string;
  model?: string;
  discoveryModeId?: string;
  turns: OzConversationTurn[];
};

export type OzDesiredBehaviorTag =
  | "ASK_SINGLE"
  | "REFLECT_UNDERSTANDING"
  | "SYNTHESIS"
  | "GROUNDED_FOLLOWUP"
  | "RELATED_REDIRECT"
  | "PARTICIPANT_AUTHORITY_RESPECTED"
  | "NATURAL_MOVEMENT"
  | "PACE_CONTROL"
  | "ALIVE_DISCOVERY_FEEL"
  | "MEANING_OVER_MIRRORING";

export type OzUndesiredBehaviorTag =
  | "QUESTION_STACK"
  | "PREMATURE_EVALUATION"
  | "ROLE_RECOMMENDATION_DRIFT"
  | "PREMATURE_PROFILE_OUTPUT"
  | "MIRROR_ONLY"
  | "UNSUPPORTED_INFERENCE"
  | "SCRIPTED_INTAKE_FEEL"
  | "DISCOVERY_CUTOFF"
  | "ADVICE_DRIFT"
  | "LOOPING_OR_BEATING_DEAD_HORSE"
  | "PARTICIPANT_REDIRECT_IGNORED"
  | "OVERCONTROLLED_OR_NERFED_FEEL";

export type OzBehaviorTag = OzDesiredBehaviorTag | OzUndesiredBehaviorTag;

export type OzQualityBand =
  | "excellent"
  | "good"
  | "watch"
  | "degraded"
  | "failed-founder-feel-test";

export type OzTurnEvaluation = {
  turnIndex: number;
  role: OzConversationRole;
  score: -3 | -2 | -1 | 0 | 1 | 2;
  desired: OzDesiredBehaviorTag[];
  undesired: OzUndesiredBehaviorTag[];
  notes: string[];
};

export type OzNotableExample = {
  turnIndex: number;
  tag: OzBehaviorTag;
  excerpt: string;
};

export type OzEvaluationReport = {
  evaluationId: string;
  createdAt: string;
  sessionId?: string;
  model?: string;
  discoveryModeId?: string;
  totalTurns: number;
  assistantTurns: number;
  participantTurns: number;
  desiredBehaviorDetections: Record<OzDesiredBehaviorTag, number>;
  undesiredBehaviorDetections: Record<OzUndesiredBehaviorTag, number>;
  perTurnScores: OzTurnEvaluation[];
  aggregateBehaviorScore: number;
  qualityBand: OzQualityBand;
  notableExamples: OzNotableExample[];
  regressionWarnings: string[];
  recommendationForNextChangeOrTest: string;
};

