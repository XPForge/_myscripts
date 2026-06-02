export type DiscoveryBehaviorRequestType =
  | "continueExploration"
  | "seekClarification"
  | "seekEvidence"
  | "reflectObservation"
  | "validateTheme"
  | "exploreDomain"
  | "investigateTension"
  | "summarizeProgress"
  | "prepareCompletion";

export type DiscoveryBehaviorRequestPriority = "low" | "medium" | "high";

export interface DiscoveryBehaviorRequestBase {
  id: string;
  type: DiscoveryBehaviorRequestType;
  priority: DiscoveryBehaviorRequestPriority;
  reason: string;
  createdAt: string;
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ContinueExplorationRequest extends DiscoveryBehaviorRequestBase {
  type: "continueExploration";
  areaId?: string;
}

export interface SeekClarificationRequest extends DiscoveryBehaviorRequestBase {
  type: "seekClarification";
  targetId: string;
  targetType: "observation" | "pattern" | "understanding" | "open-question";
}

export interface SeekEvidenceRequest extends DiscoveryBehaviorRequestBase {
  type: "seekEvidence";
  areaId?: string;
  targetId?: string;
  evidenceNeed: string;
}

export interface ReflectObservationRequest extends DiscoveryBehaviorRequestBase {
  type: "reflectObservation";
  observationId: string;
  requiresParticipantValidation: true;
}

export interface ValidateThemeRequest extends DiscoveryBehaviorRequestBase {
  type: "validateTheme";
  themeId: string;
  themeType: "pattern" | "understanding" | "participant-confirmed-theme";
}

export interface ExploreDomainRequest extends DiscoveryBehaviorRequestBase {
  type: "exploreDomain";
  domainId: string;
  explorationPurpose: string;
}

export interface InvestigateTensionRequest extends DiscoveryBehaviorRequestBase {
  type: "investigateTension";
  tensionId?: string;
  relatedObservationIds: string[];
}

export interface SummarizeProgressRequest extends DiscoveryBehaviorRequestBase {
  type: "summarizeProgress";
  includeOpenQuestions: boolean;
  includeUncertainty: boolean;
}

export interface PrepareCompletionRequest extends DiscoveryBehaviorRequestBase {
  type: "prepareCompletion";
  requiredArtifacts: string[];
  unresolvedQuestionIds: string[];
}

export type DiscoveryBehaviorRequest =
  | ContinueExplorationRequest
  | SeekClarificationRequest
  | SeekEvidenceRequest
  | ReflectObservationRequest
  | ValidateThemeRequest
  | ExploreDomainRequest
  | InvestigateTensionRequest
  | SummarizeProgressRequest
  | PrepareCompletionRequest;
