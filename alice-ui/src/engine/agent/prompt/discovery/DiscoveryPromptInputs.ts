import type {
  AgentDefinition,
  AgentPersonality,
  AgentPrinciples,
  AgentSchema,
} from "../../core";
import type { AgentBoundaryPolicySet } from "../../boundary";
import type { ExperienceProfile } from "../../experience";
import type { AgentRuntimeContext, AgentSessionMetadata } from "../../instance";
import type {
  AgentObservation,
  AgentPattern,
  ConfidenceAssessment,
  CoverageAssessment,
  EvidenceReference,
  IntelligenceSnapshot,
  UnderstandingAssessment,
} from "../../intelligence";
import type {
  DiscoverySessionState,
  OpenQuestion,
  ParticipantConfirmation,
  ReflectionOpportunity,
} from "../../discovery";

export type DiscoveryArchitectureConfig = Readonly<Record<string, unknown>>;

export interface DiscoveryConversationArchitectureInputs {
  conversationFramework: DiscoveryArchitectureConfig;
  questionTypes: DiscoveryArchitectureConfig;
  curiosityRules: DiscoveryArchitectureConfig;
  reflectionRules: DiscoveryArchitectureConfig;
  tensionRules: DiscoveryArchitectureConfig;
  coverageStrategy: DiscoveryArchitectureConfig;
  completionStrategy: DiscoveryArchitectureConfig;
}

export interface DiscoveryBehaviorArchitectureInputs {
  behaviorFramework: DiscoveryArchitectureConfig;
  observationStrategy: DiscoveryArchitectureConfig;
  evidenceStrategy: DiscoveryArchitectureConfig;
  understandingStrategy: DiscoveryArchitectureConfig;
  curiosityEngine: DiscoveryArchitectureConfig;
  coverageEngine: DiscoveryArchitectureConfig;
  reflectionEngine: DiscoveryArchitectureConfig;
  participantAuthorityRules: DiscoveryArchitectureConfig;
  completionEngine: DiscoveryArchitectureConfig;
  inferenceLadder: DiscoveryArchitectureConfig;
  patternThresholdRules: DiscoveryArchitectureConfig;
  observationVisibilityRules: DiscoveryArchitectureConfig;
  conclusionGuardrails: DiscoveryArchitectureConfig;
}

export interface DiscoveryPromptInputs {
  agentDefinition: AgentDefinition;
  schema: AgentSchema;
  principles: AgentPrinciples;
  personality: AgentPersonality;
  experienceProfile: ExperienceProfile;
  boundaryPolicies: AgentBoundaryPolicySet;
  conversationArchitecture: DiscoveryConversationArchitectureInputs;
  behaviorArchitecture: DiscoveryBehaviorArchitectureInputs;
  currentIntelligenceSnapshot: IntelligenceSnapshot;
  observations: AgentObservation[];
  evidence: EvidenceReference[];
  confidence: ConfidenceAssessment[];
  patterns: AgentPattern[];
  coverage: CoverageAssessment;
  understanding: UnderstandingAssessment[];
  openQuestions: OpenQuestion[];
  reflectionOpportunities: ReflectionOpportunity[];
  participantConfirmations: ParticipantConfirmation[];
  sessionMetadata: AgentSessionMetadata;
  runtimeContext?: AgentRuntimeContext;
  discoveryState?: DiscoverySessionState;
  metadata?: Record<string, unknown>;
}
