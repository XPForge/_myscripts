import type { AgentDefinition } from "../core";
import type {
  AgentObservation,
  ConfidenceAssessment,
  CoverageAssessment,
  IntelligenceSnapshot,
} from "../intelligence";

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
  | "confidence.updated"
  | "coverage.updated"
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

export interface ConfidenceUpdatedEvent extends AgentEventBase {
  type: "confidence.updated";
  targetId: string;
  confidence: ConfidenceAssessment;
}

export interface CoverageUpdatedEvent extends AgentEventBase {
  type: "coverage.updated";
  coverage: CoverageAssessment;
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
  | ConfidenceUpdatedEvent
  | CoverageUpdatedEvent
  | SessionCompletedEvent
  | AgentErrorEvent;
