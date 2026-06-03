import type {
  AgentEvent,
  AgentInstance,
  AgentParticipantMetadata,
  AgentSessionMetadata,
  AgentTranscriptState,
} from "../instance";
import type {
  DiscoveryBehaviorRequest,
} from "../prompt";
import type {
  CoverageAssessment,
  EvidenceReference,
  IntelligenceSnapshot,
} from "../intelligence";
import type { LighthouseSession } from "../../../services/lighthouseSession";
import { DiscoveryAgentDefinition } from "./DiscoveryAgentDefinition";
import { DiscoverySchema } from "./DiscoverySchema";
import { createDiscoveryAgentInstance } from "./DiscoveryAgentInstance";

const DISCOVERY_STATE_KEY_PREFIX = "alice.discovery.agentState";

export type ParticipantConfirmation = {
  id: string;
  sourceId: string;
  sourceType: "observation" | "pattern" | "reflection" | "theme";
  status: "confirmed" | "corrected" | "rejected" | "refined";
  participantText: string;
  createdAt: string;
};

export type OpenQuestion = {
  id: string;
  areaId?: string;
  question: string;
  sourceId?: string;
  createdAt: string;
  status: "open" | "answered" | "retired";
};

export type ReflectionOpportunity = {
  id: string;
  sourceType: "observation" | "pattern" | "coverage" | "participant-correction" | "tension";
  sourceId: string;
  reason: string;
  createdAt: string;
  status: "open" | "used" | "retired";
};

export type DiscoveryBehaviorDecision = {
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
  sessionMetadata?: AgentSessionMetadata;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type DiscoveryConversationActionType =
  | "exploreDomain"
  | "seekClarification"
  | "reflectObservation"
  | "investigateTension"
  | "validateUnderstanding"
  | "prepareCompletion";

export type DiscoveryPromptContext = {
  contextId: string;
  decisionId: string;
  primaryObjective: string;
  participantAuthorityReminder: string;
  provisionalityReminder: string;
  evidenceGatheringPriority: string;
  selectedOpenQuestion?: OpenQuestion;
  selectedCoverageGap?: {
    areaId: string;
    status: string;
    needsExploration: string[];
    unknown: string[];
  };
  selectedObservationIds: string[];
  selectedPatternIds: string[];
  selectedUnderstandingAreaIds: string[];
  reflectionOpportunity?: ReflectionOpportunity;
  completionGuardrail: string;
  createdAt: string;
};

export type DiscoveryConversationAction = {
  id: string;
  type: DiscoveryConversationActionType;
  decisionId: string;
  promptContext: DiscoveryPromptContext;
  instruction: string;
  participantFacingGoal: string;
  sourceIds: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type DiscoverySessionState = {
  stateId: string;
  agentId: string;
  sessionId: string;
  participant: AgentParticipantMetadata;
  instance: AgentInstance;
  transcript: AgentTranscriptState;
  intelligenceSnapshot: IntelligenceSnapshot;
  evidence: EvidenceReference[];
  processedTranscriptTurnIds: string[];
  participantConfirmations: ParticipantConfirmation[];
  openQuestions: OpenQuestion[];
  reflectionOpportunities: ReflectionOpportunity[];
  latestBehaviorDecision?: DiscoveryBehaviorDecision;
  behaviorDecisionHistory: DiscoveryBehaviorDecision[];
  latestConversationAction?: DiscoveryConversationAction;
  conversationActionHistory: DiscoveryConversationAction[];
  eventLog: AgentEvent[];
  createdAt: string;
  updatedAt: string;
};

function storageKey(sessionId: string) {
  return `${DISCOVERY_STATE_KEY_PREFIX}.${sessionId}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function createEmptyCoverage(agentId: string): CoverageAssessment {
  const now = new Date().toISOString();
  return {
    agentId,
    overallStatus: "unexplored",
    updatedAt: now,
    areas: DiscoverySchema.sections.map((section) => ({
      areaId: section.id,
      status: "unexplored",
      known: [],
      unknown: [],
      needsExploration: [],
      observationIds: [],
      patternIds: [],
    })),
  };
}

export function createEmptyDiscoveryIntelligenceSnapshot(
  subjectId?: string
): IntelligenceSnapshot {
  const now = new Date().toISOString();
  return {
    agentId: DiscoveryAgentDefinition.id,
    subjectId,
    observations: [],
    patterns: [],
    understanding: [],
    coverage: createEmptyCoverage(DiscoveryAgentDefinition.id),
    reflections: [],
    updatedAt: now,
  };
}

export function createDiscoveryParticipantMetadata(
  session: LighthouseSession
): AgentParticipantMetadata {
  return {
    participantId: session.profileId,
    subjectId: session.profileId,
    displayName: session.name,
    email: session.email,
    metadata: {
      lpId: session.lpId,
      profileType: session.profileType,
    },
  };
}

export function createDiscoverySessionState(
  session: LighthouseSession
): DiscoverySessionState {
  const now = new Date().toISOString();
  const participant = createDiscoveryParticipantMetadata(session);
  const instance = createDiscoveryAgentInstance(session, participant);
  const transcript: AgentTranscriptState = {
    transcriptId: `transcript-${session.sessionId}`,
    turns: [],
    updatedAt: now,
  };

  return {
    stateId: `discovery-state-${session.sessionId}`,
    agentId: DiscoveryAgentDefinition.id,
    sessionId: session.sessionId,
    participant,
    instance,
    transcript,
    intelligenceSnapshot: instance.intelligenceSnapshot,
    evidence: [],
    processedTranscriptTurnIds: [],
    participantConfirmations: [],
    openQuestions: [],
    reflectionOpportunities: [],
    behaviorDecisionHistory: [],
    conversationActionHistory: [],
    eventLog: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function loadDiscoverySessionState(
  sessionId: string
): DiscoverySessionState | null {
  try {
    return safeParse<DiscoverySessionState>(localStorage.getItem(storageKey(sessionId)));
  } catch {
    return null;
  }
}

export function persistDiscoverySessionState(state: DiscoverySessionState): void {
  try {
    localStorage.setItem(storageKey(state.sessionId), JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function clearDiscoverySessionState(sessionId: string): void {
  try {
    localStorage.removeItem(storageKey(sessionId));
  } catch {
    // ignore storage errors
  }
}

export function loadOrCreateDiscoverySessionState(
  session: LighthouseSession
): DiscoverySessionState {
  const existing = loadDiscoverySessionState(session.sessionId);
  if (existing) return existing;
  const created = createDiscoverySessionState(session);
  persistDiscoverySessionState(created);
  return created;
}

export function updateDiscoverySessionState(
  sessionId: string,
  update: (state: DiscoverySessionState) => DiscoverySessionState
): DiscoverySessionState | null {
  const existing = loadDiscoverySessionState(sessionId);
  if (!existing) return null;
  const next = {
    ...update(existing),
    updatedAt: new Date().toISOString(),
  };
  persistDiscoverySessionState(next);
  return next;
}
