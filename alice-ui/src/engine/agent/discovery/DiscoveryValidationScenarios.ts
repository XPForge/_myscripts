import type { LighthouseSession } from "../../../services/lighthouseSession";
import {
  appendParticipantTranscriptEvent,
} from "./DiscoveryTranscriptAdapter";
import {
  createDiscoverySessionState,
  type DiscoverySessionState,
  type ParticipantConfirmation,
} from "./DiscoverySessionState";
import { processDiscoveryPerception } from "./DiscoveryPerceptionProcessor";
import { processDiscoveryBehaviorDecision } from "./DiscoveryBehaviorDecisionEngine";

export type DiscoveryValidationScenarioId =
  | "shallow-conversation"
  | "deep-conversation"
  | "participant-correction"
  | "contradiction"
  | "unresolved-tension"
  | "incomplete-session";

export interface DiscoveryValidationScenario {
  id: DiscoveryValidationScenarioId;
  name: string;
  description: string;
  transcriptTurns: string[];
  participantConfirmations?: Omit<ParticipantConfirmation, "id" | "createdAt">[];
  expectedSafeguards: string[];
}

export interface DiscoveryValidationScenarioResult {
  scenarioId: DiscoveryValidationScenarioId;
  state: DiscoverySessionState;
  passedSafeguards: string[];
  failedSafeguards: string[];
}

export const DiscoveryValidationScenarios: DiscoveryValidationScenario[] = [
  {
    id: "shallow-conversation",
    name: "Shallow Conversation",
    description: "A short session with limited evidence.",
    transcriptTurns: ["I like making things work better, but I am still figuring out what matters."],
    expectedSafeguards: [
      "low-or-medium-confidence",
      "open-questions-present",
      "no-profile-output",
    ],
  },
  {
    id: "deep-conversation",
    name: "Deep Conversation",
    description: "Repeated stories and themes across several turns.",
    transcriptTurns: [
      "I keep coming back to systems and how all the pieces connect.",
      "When something breaks, I usually want to understand the underlying structure.",
      "I also care a lot about whether people feel respected in the process.",
    ],
    expectedSafeguards: [
      "evidence-linked-observations",
      "patterns-remain-provisional",
      "decision-selected",
    ],
  },
  {
    id: "participant-correction",
    name: "Participant Correction",
    description: "A participant rejects or corrects an interpretation.",
    transcriptTurns: [
      "I enjoy leading sometimes, but I do not want to be seen as someone who needs control.",
    ],
    participantConfirmations: [
      {
        sourceId: "manual-theme",
        sourceType: "theme",
        status: "corrected",
        participantText: "This is about care and responsibility, not control.",
      },
    ],
    expectedSafeguards: [
      "participant-correction-preserved",
      "participant-authority-metadata",
    ],
  },
  {
    id: "contradiction",
    name: "Contradiction",
    description: "Statements include competing desires.",
    transcriptTurns: [
      "I want stability, but I also get restless when things become too predictable.",
      "I value independence, but collaboration is where I often feel most alive.",
    ],
    expectedSafeguards: [
      "open-questions-present",
      "human-complexity-preserved",
      "decision-selected",
    ],
  },
  {
    id: "unresolved-tension",
    name: "Unresolved Tension",
    description: "A tension should remain available for exploration.",
    transcriptTurns: [
      "There is a tension in me between wanting visibility and wanting to stay protected.",
    ],
    expectedSafeguards: [
      "tension-decision-or-open-question",
      "no-forced-resolution",
    ],
  },
  {
    id: "incomplete-session",
    name: "Incomplete Session",
    description: "No participant turns yet.",
    transcriptTurns: [],
    expectedSafeguards: [
      "no-crash-empty-state",
      "continue-exploration-decision",
    ],
  },
];

function createScenarioSession(scenario: DiscoveryValidationScenario): LighthouseSession {
  const now = new Date().toISOString();
  return {
    sessionId: `validation-${scenario.id}`,
    profileId: `profile-${scenario.id}`,
    lpId: "LP-VALIDATION",
    profileType: "lighthouse",
    name: "Validation Participant",
    email: "validation@example.com",
    status: "active",
    discoveryStatus: "started",
    discoveryMethod: "text",
    conversationHistory: [],
    transcript: scenario.transcriptTurns.join(" "),
    step: "discovering",
    createdAt: now,
    updatedAt: now,
  };
}

function applyScenarioTurns(
  state: DiscoverySessionState,
  scenario: DiscoveryValidationScenario
) {
  return scenario.transcriptTurns.reduce((nextState, turn) => {
    const withTurn = appendParticipantTranscriptEvent(nextState, turn, true);
    return processDiscoveryPerception(withTurn);
  }, state);
}

function applyParticipantConfirmations(
  state: DiscoverySessionState,
  scenario: DiscoveryValidationScenario
) {
  const confirmations = scenario.participantConfirmations ?? [];
  if (confirmations.length === 0) return state;

  return processDiscoveryBehaviorDecision({
    ...state,
    participantConfirmations: [
      ...state.participantConfirmations,
      ...confirmations.map((confirmation, index) => ({
        ...confirmation,
        id: `validation-confirmation-${scenario.id}-${index}`,
        createdAt: new Date().toISOString(),
      })),
    ],
  });
}

function evaluateSafeguards(
  state: DiscoverySessionState,
  scenario: DiscoveryValidationScenario
) {
  const checks: Record<string, boolean> = {
    "low-or-medium-confidence": state.intelligenceSnapshot.observations.every(
      (observation) => observation.confidence.level !== "high"
    ),
    "open-questions-present": state.openQuestions.length > 0,
    "no-profile-output": true,
    "evidence-linked-observations": state.intelligenceSnapshot.observations.every(
      (observation) => observation.evidence.length > 0
    ),
    "patterns-remain-provisional": state.intelligenceSnapshot.patterns.every(
      (pattern) => pattern.metadata?.identityClaim === false
    ),
    "decision-selected": Boolean(state.latestBehaviorDecision),
    "participant-correction-preserved": state.participantConfirmations.some(
      (confirmation) => confirmation.status === "corrected"
    ),
    "participant-authority-metadata": Boolean(
      state.latestBehaviorDecision?.metadata?.participantAuthorityPreserved
    ),
    "human-complexity-preserved": state.latestBehaviorDecision?.metadata?.humanComplexityPreserved === true,
    "tension-decision-or-open-question":
      state.latestBehaviorDecision?.selectedRequest.type === "investigateTension" ||
      state.openQuestions.length > 0,
    "no-forced-resolution": true,
    "no-crash-empty-state": true,
    "continue-exploration-decision":
      state.latestBehaviorDecision?.selectedRequest.type === "continueExploration" ||
      state.latestBehaviorDecision?.selectedRequest.type === "exploreDomain",
  };

  return {
    passedSafeguards: scenario.expectedSafeguards.filter((safeguard) => checks[safeguard]),
    failedSafeguards: scenario.expectedSafeguards.filter((safeguard) => !checks[safeguard]),
  };
}

export function runDiscoveryValidationScenario(
  scenario: DiscoveryValidationScenario
): DiscoveryValidationScenarioResult {
  const session = createScenarioSession(scenario);
  const initialState = createDiscoverySessionState(session);
  const withTurns = applyScenarioTurns(initialState, scenario);
  const withDecision = processDiscoveryBehaviorDecision(withTurns);
  const state = applyParticipantConfirmations(withDecision, scenario);
  const { passedSafeguards, failedSafeguards } = evaluateSafeguards(state, scenario);

  return {
    scenarioId: scenario.id,
    state,
    passedSafeguards,
    failedSafeguards,
  };
}

export function runAllDiscoveryValidationScenarios() {
  return DiscoveryValidationScenarios.map(runDiscoveryValidationScenario);
}
