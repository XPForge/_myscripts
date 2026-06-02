import type {
  AgentEvent,
  AgentEventBase,
  AgentTranscriptTurn,
} from "../instance";
import type {
  AgentObservation,
  ConfidenceAssessment,
  EvidenceReference,
  EvidenceStrength,
} from "../intelligence";
import type { DiscoverySessionState } from "./DiscoverySessionState";
import { processDiscoveryBehaviorDecision } from "./DiscoveryBehaviorDecisionEngine";
import { processDiscoveryUnderstanding } from "./DiscoveryUnderstandingProcessor";

type DiscoveryObservationVisibility =
  | "private-observation"
  | "provisional-observation"
  | "reflection-eligible-observation"
  | "participant-confirmed-theme";

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

function summarizeParticipantText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177)}...`;
}

function countRepeatedParticipantText(
  turn: AgentTranscriptTurn,
  turns: AgentTranscriptTurn[]
) {
  const words = new Set(
    turn.text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length >= 5)
  );

  if (words.size === 0) return 0;

  return turns.filter((candidate) => {
    if (candidate.id === turn.id || candidate.role !== "participant" || !candidate.isFinal) {
      return false;
    }
    const candidateWords = new Set(
      candidate.text
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length >= 5)
    );
    let overlap = 0;
    words.forEach((word) => {
      if (candidateWords.has(word)) overlap += 1;
    });
    return overlap >= 2;
  }).length;
}

function assessEvidenceStrength(evidenceCount: number, repeatedSignals: number): EvidenceStrength {
  if (evidenceCount >= 3 || repeatedSignals >= 2) return "strong";
  if (evidenceCount >= 2 || repeatedSignals >= 1) return "moderate";
  return "weak";
}

function createConfidenceAssessment(
  evidenceCount: number,
  repeatedSignals: number
): ConfidenceAssessment {
  const evidenceStrength = assessEvidenceStrength(evidenceCount, repeatedSignals);
  const level = evidenceStrength === "strong" ? "medium" : evidenceStrength === "moderate" ? "medium" : "low";

  return {
    level,
    rationale:
      evidenceStrength === "weak"
        ? "Initial provisional observation from a single participant transcript turn."
        : "Provisional observation with repeated transcript support. Participant confirmation is still required before treating it as a confirmed theme.",
    evidenceCount,
    evidenceStrength,
    unresolvedQuestions: [
      "Does this observation reflect the participant's intended meaning?",
    ],
    metadata: {
      repeatedSignals,
      identityInferenceAllowed: false,
    },
  };
}

function determineVisibility(
  confidence: ConfidenceAssessment
): DiscoveryObservationVisibility {
  if (confidence.evidenceCount <= 0) return "private-observation";
  if (confidence.level === "medium") return "reflection-eligible-observation";
  return "provisional-observation";
}

function createEvidenceReference(
  state: DiscoverySessionState,
  turn: AgentTranscriptTurn
): EvidenceReference {
  return {
    id: createId("evidence"),
    sourceType: "transcript",
    sourceId: turn.id,
    description: "Participant transcript turn supporting a provisional Discovery observation.",
    strength: "weak",
    transcriptSegment: {
      transcriptId: state.transcript.transcriptId,
      segmentId: turn.id,
      speaker: "participant",
      text: turn.text,
      startedAt: turn.createdAt,
      endedAt: turn.createdAt,
    },
    capturedAt: new Date().toISOString(),
    metadata: {
      sourceTurnId: turn.id,
    },
  };
}

function createObservation(
  state: DiscoverySessionState,
  turn: AgentTranscriptTurn,
  evidence: EvidenceReference,
  confidence: ConfidenceAssessment,
  visibility: DiscoveryObservationVisibility
): AgentObservation {
  const now = new Date().toISOString();

  return {
    id: createId("observation"),
    agentId: state.agentId,
    subjectId: state.participant.subjectId,
    areaId: "identity-narrative",
    statement: "Participant shared a discovery-relevant statement in their own words.",
    description: summarizeParticipantText(turn.text),
    status: visibility === "reflection-eligible-observation" ? "supported" : "developing",
    evidence: [evidence],
    confidence,
    createdAt: now,
    updatedAt: now,
    metadata: {
      inferenceLevel: "observation",
      visibility,
      participantCorrectable: true,
      sourceTurnId: turn.id,
      provisional: visibility !== "participant-confirmed-theme",
      identityClaim: false,
      patternCreated: false,
    },
  };
}

function createObservationEvents(
  state: DiscoverySessionState,
  observation: AgentObservation,
  evidence: EvidenceReference
): AgentEvent[] {
  return [
    {
      ...createEventBase(state, "observation.created"),
      type: "observation.created",
      observation,
    },
    {
      ...createEventBase(state, "evidence.added"),
      type: "evidence.added",
      evidence,
      observationId: observation.id,
    },
    {
      ...createEventBase(state, "confidence.updated"),
      type: "confidence.updated",
      targetId: observation.id,
      confidence: observation.confidence,
    },
  ];
}

export function processDiscoveryPerception(
  state: DiscoverySessionState
): DiscoverySessionState {
  const processedTurnIds = new Set(state.processedTranscriptTurnIds ?? []);
  const finalParticipantTurns = state.transcript.turns.filter(
    (turn) =>
      turn.role === "participant" &&
      turn.isFinal &&
      turn.text.trim().length > 0 &&
      !processedTurnIds.has(turn.id)
  );

  if (finalParticipantTurns.length === 0) return state;

  let nextState = {
    ...state,
    processedTranscriptTurnIds: [...(state.processedTranscriptTurnIds ?? [])],
    evidence: [...state.evidence],
    eventLog: [...state.eventLog],
    intelligenceSnapshot: {
      ...state.intelligenceSnapshot,
      observations: [...state.intelligenceSnapshot.observations],
    },
  };

  finalParticipantTurns.forEach((turn) => {
    const evidence = createEvidenceReference(nextState, turn);
    const repeatedSignals = countRepeatedParticipantText(turn, nextState.transcript.turns);
    const confidence = createConfidenceAssessment(1, repeatedSignals);
    evidence.strength = confidence.evidenceStrength;
    const visibility = determineVisibility(confidence);
    const observation = createObservation(nextState, turn, evidence, confidence, visibility);
    const events = createObservationEvents(nextState, observation, evidence);

    nextState = {
      ...nextState,
      evidence: [...nextState.evidence, evidence],
      processedTranscriptTurnIds: [...nextState.processedTranscriptTurnIds, turn.id],
      eventLog: [...nextState.eventLog, ...events],
      intelligenceSnapshot: {
        ...nextState.intelligenceSnapshot,
        observations: [...nextState.intelligenceSnapshot.observations, observation],
        updatedAt: new Date().toISOString(),
      },
    };
  });

  return processDiscoveryBehaviorDecision(processDiscoveryUnderstanding(nextState));
}
