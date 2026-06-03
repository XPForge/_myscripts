import type { AgentDefinition } from "../core";
import type {
  AgentPattern,
  AgentObservation,
  ConfidenceAssessment,
  CoverageAssessment,
  EvidenceReference,
  IntelligenceSnapshot,
  UnderstandingAssessment,
} from "../intelligence";
import type {
  DiscoveryBehaviorRequest,
} from "../prompt/discovery/DiscoveryBehaviorRequests";

export type AgentLifecycleStatus =
  | "created"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "archived";

export type AgentRuntimeMode = "realtimeVoice" | "text" | "hybrid";

export type AgentEventType =
  | "participant.input"
  | "assistant.response"
  | "agent.response"
  | "transcript.update"
  | "observation.created"
  | "evidence.added"
  | "confidence.updated"
  | "pattern.created"
  | "coverage.updated"
  | "understanding.updated"
  | "open_question.created"
  | "reflection_opportunity.created"
  | "decision.selected"
  | "decision.rejected"
  | "decision.reprioritized"
  | "decision.executed"
  | "completion.readiness.updated"
  | "session.completed"
  | "error";

export interface AgentSessionMetadata {
  sessionId: string;
  runtimeMode: AgentRuntimeMode;
  startedAt?: string;
  endedAt?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentParticipantMetadata {
  participantId?: string;
  subjectId?: string;
  displayName?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTranscriptTurn {
  id: string;
  role: "participant" | "agent" | "system";
  text: string;
  isFinal: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTranscriptState {
  transcriptId: string;
  turns: AgentTranscriptTurn[];
  latestTurnId?: string;
  updatedAt: string;
}

export interface AgentInstance {
  instanceId: string;
  agentDefinitionId: string;
  agentVersion: string;
  sessionId: string;
  participantId?: string;
  subjectId?: string;
  status: AgentLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  intelligenceSnapshot: IntelligenceSnapshot;
  metadata?: Record<string, unknown>;
}

export interface AgentRuntimeContext {
  agentDefinition: AgentDefinition;
  instance: AgentInstance;
  session: AgentSessionMetadata;
  participant: AgentParticipantMetadata;
  runtimeMode: AgentRuntimeMode;
  transcript: AgentTranscriptState;
  metadata?: Record<string, unknown>;
}

export interface AgentEventBase {
  eventId: string;
  instanceId: string;
  agentDefinitionId: string;
  sessionId: string;
  type: AgentEventType;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ParticipantInputEvent extends AgentEventBase {
  type: "participant.input";
  input: AgentTranscriptTurn;
}

export interface AgentResponseEvent extends AgentEventBase {
  type: "agent.response";
  response: AgentTranscriptTurn;
}

export interface AssistantResponseEvent extends AgentEventBase {
  type: "assistant.response";
  response: AgentTranscriptTurn;
}

export interface TranscriptUpdateEvent extends AgentEventBase {
  type: "transcript.update";
  transcript: AgentTranscriptState;
}

export interface ObservationCreatedEvent extends AgentEventBase {
  type: "observation.created";
  observation: AgentObservation;
}

export interface EvidenceAddedEvent extends AgentEventBase {
  type: "evidence.added";
  evidence: EvidenceReference;
  observationId: string;
}

export interface ConfidenceUpdatedEvent extends AgentEventBase {
  type: "confidence.updated";
  targetId: string;
  confidence: ConfidenceAssessment;
}

export interface PatternCreatedEvent extends AgentEventBase {
  type: "pattern.created";
  pattern: AgentPattern;
}

export interface CoverageUpdatedEvent extends AgentEventBase {
  type: "coverage.updated";
  coverage: CoverageAssessment;
}

export interface UnderstandingUpdatedEvent extends AgentEventBase {
  type: "understanding.updated";
  understanding: UnderstandingAssessment[];
}

export interface OpenQuestionCreatedEvent extends AgentEventBase {
  type: "open_question.created";
  question: {
    id: string;
    areaId?: string;
    question: string;
    sourceId?: string;
    createdAt: string;
    status: "open" | "answered" | "retired";
  };
}

export interface ReflectionOpportunityCreatedEvent extends AgentEventBase {
  type: "reflection_opportunity.created";
  opportunity: {
    id: string;
    sourceType: "observation" | "pattern" | "coverage" | "participant-correction" | "tension";
    sourceId: string;
    reason: string;
    createdAt: string;
    status: "open" | "used" | "retired";
  };
}

export interface BehaviorDecisionSelectedEvent extends AgentEventBase {
  type: "decision.selected";
  decision: {
    id: string;
    selectedRequest: DiscoveryBehaviorRequest;
    confidence: "low" | "medium" | "high";
    rationale: string;
    supportingEvidenceIds: string[];
    candidateAlternatives: {
      request: DiscoveryBehaviorRequest;
      confidence: "low" | "medium" | "high";
      rationale: string;
    }[];
    createdAt: string;
    metadata?: Record<string, unknown>;
  };
}

export interface BehaviorDecisionRejectedEvent extends AgentEventBase {
  type: "decision.rejected";
  decisionId: string;
  alternative: {
    request: DiscoveryBehaviorRequest;
    confidence: "low" | "medium" | "high";
    rationale: string;
  };
}

export interface BehaviorDecisionReprioritizedEvent extends AgentEventBase {
  type: "decision.reprioritized";
  decisionId: string;
  alternative: {
    request: DiscoveryBehaviorRequest;
    confidence: "low" | "medium" | "high";
    rationale: string;
  };
}

export interface BehaviorDecisionExecutedEvent extends AgentEventBase {
  type: "decision.executed";
  action: {
    id: string;
    type: string;
    decisionId: string;
    instruction: string;
    participantFacingGoal: string;
    sourceIds: string[];
    createdAt: string;
    promptContext: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

export interface CompletionReadinessUpdatedEvent extends AgentEventBase {
  type: "completion.readiness.updated";
  readiness: {
    status: "not-ready" | "summarization-ready" | "completion-ready";
    score: number;
    rationale: string;
    exploredDomainCount: number;
    underexploredDomainCount: number;
    openQuestionCount: number;
    supportedPatternCount: number;
    participantConfirmationCount: number;
  };
}

export interface SessionCompletedEvent extends AgentEventBase {
  type: "session.completed";
  completedAt: string;
  finalStatus: AgentLifecycleStatus;
}

export interface AgentErrorEvent extends AgentEventBase {
  type: "error";
  error: {
    message: string;
    code?: string;
    cause?: unknown;
  };
}

export type AgentEvent =
  | ParticipantInputEvent
  | AssistantResponseEvent
  | AgentResponseEvent
  | TranscriptUpdateEvent
  | ObservationCreatedEvent
  | EvidenceAddedEvent
  | ConfidenceUpdatedEvent
  | PatternCreatedEvent
  | CoverageUpdatedEvent
  | UnderstandingUpdatedEvent
  | OpenQuestionCreatedEvent
  | ReflectionOpportunityCreatedEvent
  | BehaviorDecisionSelectedEvent
  | BehaviorDecisionRejectedEvent
  | BehaviorDecisionReprioritizedEvent
  | BehaviorDecisionExecutedEvent
  | CompletionReadinessUpdatedEvent
  | SessionCompletedEvent
  | AgentErrorEvent;
