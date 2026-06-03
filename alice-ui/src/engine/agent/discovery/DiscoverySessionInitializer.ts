import type { AgentEvent, AgentEventBase } from "../instance";
import type { DiscoveryBehaviorRequest } from "../prompt";
import { executeDiscoveryDecision } from "./DiscoveryDecisionExecutor";
import type {
  DiscoveryBehaviorDecision,
  DiscoverySessionState,
} from "./DiscoverySessionState";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEventBase(
  state: DiscoverySessionState,
  type: AgentEvent["type"]
): AgentEventBase {
  return {
    eventId: createId("event"),
    instanceId: state.instance.instanceId,
    agentDefinitionId: state.agentId,
    sessionId: state.sessionId,
    type,
    createdAt: new Date().toISOString(),
  };
}

function createInitialBehaviorRequest(): DiscoveryBehaviorRequest {
  return {
    id: createId("behavior-request"),
    type: "continueExploration",
    priority: "high",
    reason:
      "Discovery is starting and needs a participant-authorized opening before any evidence, observations, or conclusions exist.",
    createdAt: new Date().toISOString(),
    sourceIds: ["discovery-session-start"],
    areaId: "identity-narrative",
    metadata: {
      startupObjective: "openDiscoverySession",
      participantAuthorityRequired: true,
      uncertaintyPreserved: true,
      createsUnderstanding: false,
      generatesLanguage: false,
      profileOutputAllowed: false,
    },
  };
}

function createInitialBehaviorDecision(
  state: DiscoverySessionState
): DiscoveryBehaviorDecision {
  const request = createInitialBehaviorRequest();

  return {
    id: createId("decision"),
    selectedRequest: request,
    confidence: "high",
    rationale:
      "Startup initialization must open Discovery before participant input while preserving authority and avoiding any profile output or conclusions.",
    supportingEvidenceIds: [],
    candidateAlternatives: [],
    sessionMetadata: {
      sessionId: state.sessionId,
      runtimeMode: "realtimeVoice",
      startedAt: state.createdAt,
      source: "discovery-session-initializer",
    },
    createdAt: new Date().toISOString(),
    metadata: {
      startupObjective: "openDiscoverySession",
      participantAuthorityPreserved: true,
      provisionalObservationsPreserved: true,
      createsObservations: false,
      createsEvidence: false,
      createsPatterns: false,
      createsUnderstanding: false,
      profileOutputAllowed: false,
    },
  };
}

export function initializeDiscoverySessionState(
  state: DiscoverySessionState
): DiscoverySessionState {
  if (state.latestBehaviorDecision || state.behaviorDecisionHistory.length > 0) {
    return state;
  }

  const decision = createInitialBehaviorDecision(state);
  const selectedEvent: AgentEvent = {
    ...createEventBase(state, "decision.selected"),
    type: "decision.selected",
    decision,
  };

  return executeDiscoveryDecision({
    ...state,
    latestBehaviorDecision: decision,
    behaviorDecisionHistory: [decision],
    eventLog: [...state.eventLog, selectedEvent],
    updatedAt: new Date().toISOString(),
  });
}
