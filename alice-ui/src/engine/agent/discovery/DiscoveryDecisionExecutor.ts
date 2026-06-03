import type { AgentEvent, AgentEventBase } from "../instance";
import type {
  DiscoveryBehaviorDecision,
  DiscoveryConversationAction,
  DiscoveryConversationActionType,
  DiscoveryPromptContext,
  DiscoverySessionState,
  ReflectionOpportunity,
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

function findOpenQuestion(state: DiscoverySessionState, sourceIds: string[]) {
  const sourceIdSet = new Set(sourceIds);
  return (
    state.openQuestions.find((question) => question.status === "open" && sourceIdSet.has(question.id)) ??
    state.openQuestions.find((question) => question.status === "open")
  );
}

function findCoverageGap(state: DiscoverySessionState, areaId?: string) {
  const coverage = state.intelligenceSnapshot.coverage;
  return (
    coverage.areas.find((area) => area.areaId === areaId) ??
    coverage.areas.find((area) => area.status === "needs-follow-up") ??
    coverage.areas.find((area) => area.status === "unexplored")
  );
}

function findReflectionOpportunity(
  state: DiscoverySessionState,
  sourceIds: string[]
): ReflectionOpportunity | undefined {
  const sourceIdSet = new Set(sourceIds);
  return (
    state.reflectionOpportunities.find(
      (opportunity) =>
        opportunity.status === "open" &&
        (sourceIdSet.has(opportunity.id) || sourceIdSet.has(opportunity.sourceId))
    ) ?? state.reflectionOpportunities.find((opportunity) => opportunity.status === "open")
  );
}

function sourceIdsFromDecision(decision: DiscoveryBehaviorDecision) {
  return [
    ...(decision.selectedRequest.sourceIds ?? []),
    ...decision.supportingEvidenceIds,
  ].filter(Boolean);
}

function requestAreaId(decision: DiscoveryBehaviorDecision) {
  const request = decision.selectedRequest;
  if ("domainId" in request) return request.domainId;
  if ("areaId" in request) return request.areaId;
  return undefined;
}

function hasEvidenceGatheringNeed(state: DiscoverySessionState) {
  return (
    state.openQuestions.some((question) => question.status === "open") ||
    state.intelligenceSnapshot.coverage.areas.some(
      (area) => area.status === "unexplored" || area.status === "needs-follow-up"
    )
  );
}

function toActionType(
  state: DiscoverySessionState,
  decision: DiscoveryBehaviorDecision
): DiscoveryConversationActionType {
  const request = decision.selectedRequest;

  if (
    (request.type === "prepareCompletion" || request.type === "summarizeProgress") &&
    hasEvidenceGatheringNeed(state)
  ) {
    return state.openQuestions.some((question) => question.status === "open")
      ? "seekClarification"
      : "exploreDomain";
  }

  switch (request.type) {
    case "seekClarification":
    case "seekEvidence":
      return "seekClarification";
    case "reflectObservation":
      return "reflectObservation";
    case "investigateTension":
      return "investigateTension";
    case "validateTheme":
      return "validateUnderstanding";
    case "prepareCompletion":
    case "summarizeProgress":
      return "prepareCompletion";
    case "continueExploration":
    case "exploreDomain":
      return "exploreDomain";
  }
}

function createPromptContext(
  state: DiscoverySessionState,
  decision: DiscoveryBehaviorDecision,
  actionType: DiscoveryConversationActionType
): DiscoveryPromptContext {
  const sourceIds = sourceIdsFromDecision(decision);
  const selectedOpenQuestion = findOpenQuestion(state, sourceIds);
  const selectedCoverageGap = findCoverageGap(state, requestAreaId(decision));
  const reflectionOpportunity = findReflectionOpportunity(state, sourceIds);
  const createdAt = new Date().toISOString();

  return {
    contextId: createId("prompt-context"),
    decisionId: decision.id,
    primaryObjective: actionType,
    participantAuthorityReminder:
      "Treat the participant as the authority on meaning. Invite correction, disagreement, or refinement.",
    provisionalityReminder:
      "Keep observations provisional. Do not present internal observations, patterns, or understanding as settled facts.",
    evidenceGatheringPriority:
      "Prefer one evidence-gathering follow-up over summarization or profile output.",
    selectedOpenQuestion,
    selectedCoverageGap: selectedCoverageGap
      ? {
          areaId: selectedCoverageGap.areaId,
          status: selectedCoverageGap.status,
          needsExploration: selectedCoverageGap.needsExploration,
          unknown: selectedCoverageGap.unknown,
        }
      : undefined,
    selectedObservationIds: state.intelligenceSnapshot.observations
      .filter((observation) => sourceIds.includes(observation.id))
      .map((observation) => observation.id),
    selectedPatternIds: state.intelligenceSnapshot.patterns
      .filter((pattern) => sourceIds.includes(pattern.id))
      .map((pattern) => pattern.id),
    selectedUnderstandingAreaIds: state.intelligenceSnapshot.understanding
      .filter((understanding) => sourceIds.includes(understanding.areaId))
      .map((understanding) => understanding.areaId),
    reflectionOpportunity,
    completionGuardrail:
      "Do not generate profile output. Completion actions may prepare next steps only after evidence and participant authority are preserved.",
    createdAt,
  };
}

function createInstruction(
  actionType: DiscoveryConversationActionType,
  context: DiscoveryPromptContext
) {
  const openQuestion = context.selectedOpenQuestion?.question;
  const areaId = context.selectedCoverageGap?.areaId;

  switch (actionType) {
    case "seekClarification":
      return openQuestion
        ? `Ask one gentle clarification question guided by this open question: ${openQuestion}`
        : "Ask one gentle clarification question that gathers more participant evidence without implying the participant was unclear.";
    case "reflectObservation":
      return "Offer one brief provisional reflection, then explicitly invite correction or refinement.";
    case "investigateTension":
      return "Ask one careful question that explores the unresolved tension without trying to resolve it.";
    case "validateUnderstanding":
      return "Check whether the emerging understanding resonates, and make it easy for the participant to correct or reject it.";
    case "prepareCompletion":
      return "Prepare the participant for completion without generating profile output; preserve open questions and uncertainty.";
    case "exploreDomain":
      return areaId
        ? `Ask one open-ended question to explore the ${areaId} discovery area.`
        : "Ask one open-ended question that continues participant-led exploration.";
  }
}

function participantFacingGoal(actionType: DiscoveryConversationActionType) {
  switch (actionType) {
    case "seekClarification":
      return "Clarify one emerging point with the participant's own words.";
    case "reflectObservation":
      return "Reflect one provisional observation and invite correction.";
    case "investigateTension":
      return "Explore ambiguity or tension with care.";
    case "validateUnderstanding":
      return "Validate or refine emerging understanding.";
    case "prepareCompletion":
      return "Prepare for completion without creating profile output.";
    case "exploreDomain":
      return "Gather more participant evidence through one open-ended question.";
  }
}

export function executeDiscoveryDecision(
  state: DiscoverySessionState
): DiscoverySessionState {
  const decision = state.latestBehaviorDecision;
  if (!decision) return state;

  const actionType = toActionType(state, decision);
  const promptContext = createPromptContext(state, decision, actionType);
  const action: DiscoveryConversationAction = {
    id: createId("conversation-action"),
    type: actionType,
    decisionId: decision.id,
    promptContext,
    instruction: createInstruction(actionType, promptContext),
    participantFacingGoal: participantFacingGoal(actionType),
    sourceIds: sourceIdsFromDecision(decision),
    createdAt: new Date().toISOString(),
    metadata: {
      executesExactlyOnePrimaryObjective: true,
      participantAuthorityPreserved: true,
      provisionalObservationsPreserved: true,
      profileOutputAllowed: false,
    },
  };
  const event: AgentEvent = {
    ...createEventBase(state, "decision.executed" as AgentEvent["type"]),
    type: "decision.executed",
    action,
  };

  return {
    ...state,
    latestConversationAction: action,
    conversationActionHistory: [
      ...(state.conversationActionHistory ?? []),
      action,
    ],
    eventLog: [...state.eventLog, event],
  };
}
