import type { AgentEvent, AgentEventBase, AgentSessionMetadata } from "../instance";
import type {
  AgentObservation,
  EvidenceReference,
  IntelligenceConfidenceLevel,
} from "../intelligence";
import type {
  DiscoveryBehaviorRequest,
  DiscoveryBehaviorRequestType,
} from "../prompt";
import type {
  DiscoveryBehaviorDecision,
  DiscoverySessionState,
} from "./DiscoverySessionState";

export type DiscoveryDecisionConfidenceLevel = IntelligenceConfidenceLevel;

export interface DiscoveryDecisionAlternative {
  request: DiscoveryBehaviorRequest;
  confidence: DiscoveryDecisionConfidenceLevel;
  rationale: string;
}

export interface DiscoveryBehaviorDecisionResult {
  selected: DiscoveryBehaviorDecision;
  rejected: DiscoveryDecisionAlternative[];
  reprioritized: DiscoveryDecisionAlternative[];
  completionReadiness: DiscoveryCompletionReadiness;
  events: AgentEvent[];
}

export interface DiscoveryCompletionReadiness {
  status: "not-ready" | "summarization-ready" | "completion-ready";
  score: number;
  rationale: string;
  exploredDomainCount: number;
  underexploredDomainCount: number;
  openQuestionCount: number;
  supportedPatternCount: number;
  participantConfirmationCount: number;
}

interface DiscoveryDecisionCandidate {
  request: DiscoveryBehaviorRequest;
  confidence: DiscoveryDecisionConfidenceLevel;
  score: number;
  rationale: string;
  supportingEvidence: EvidenceReference[];
}

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

function createRequestBase(
  type: DiscoveryBehaviorRequestType,
  priority: DiscoveryBehaviorRequest["priority"],
  reason: string,
  sourceIds?: string[]
) {
  return {
    id: createId("behavior-request"),
    type,
    priority,
    reason,
    createdAt: new Date().toISOString(),
    sourceIds,
    metadata: {
      participantAuthorityRequired: true,
      uncertaintyPreserved: true,
      createsUnderstanding: false,
      generatesLanguage: false,
    },
  };
}

function confidenceFromScore(score: number): DiscoveryDecisionConfidenceLevel {
  if (score >= 80) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function evidenceForObservationIds(
  observations: AgentObservation[],
  observationIds: string[]
): EvidenceReference[] {
  const ids = new Set(observationIds);
  return observations
    .filter((observation) => ids.has(observation.id))
    .flatMap((observation) => observation.evidence);
}

function sortCandidates(candidates: DiscoveryDecisionCandidate[]) {
  return [...candidates].sort((left, right) => right.score - left.score);
}

function hasParticipantCorrection(state: DiscoverySessionState, sourceId: string) {
  return state.participantConfirmations.some(
    (confirmation) =>
      confirmation.sourceId === sourceId &&
      (confirmation.status === "corrected" || confirmation.status === "rejected")
  );
}

function evaluateCoverage(state: DiscoverySessionState): DiscoveryDecisionCandidate[] {
  const coverage = state.intelligenceSnapshot.coverage;
  const neglected = coverage.areas.filter((area) => area.status === "unexplored");
  const underexplored = coverage.areas.filter((area) => area.status === "needs-follow-up");
  const candidates: DiscoveryDecisionCandidate[] = [];

  const target = neglected[0] ?? underexplored[0];
  if (target) {
    const request = {
      ...createRequestBase(
        "exploreDomain",
        neglected.length > 0 ? "high" : "medium",
        neglected.length > 0
          ? "A Discovery domain has not been explored yet."
          : "A Discovery domain has weak coverage and needs more participant evidence.",
        [target.areaId, ...target.observationIds]
      ),
      type: "exploreDomain",
      domainId: target.areaId,
      explorationPurpose:
        target.status === "unexplored"
          ? "Open space for participant-led exploration of a neglected domain."
          : "Clarify a weakly supported domain without turning it into an assessment.",
    } satisfies DiscoveryBehaviorRequest;

    candidates.push({
      request,
      confidence: neglected.length > 0 ? "high" : "medium",
      score: neglected.length > 0 ? 88 : 67,
      rationale: "Coverage evaluation prioritizes neglected or underexplored domains before stronger claims.",
      supportingEvidence: evidenceForObservationIds(
        state.intelligenceSnapshot.observations,
        target.observationIds
      ),
    });
  }

  return candidates;
}

function evaluateQuestions(state: DiscoverySessionState): DiscoveryDecisionCandidate[] {
  const openQuestion = state.openQuestions.find((question) => question.status === "open");
  if (!openQuestion) return [];

  const area = state.intelligenceSnapshot.coverage.areas.find(
    (coverageArea) => coverageArea.areaId === openQuestion.areaId
  );
  const request = {
    ...createRequestBase(
      openQuestion.sourceId ? "seekClarification" : "continueExploration",
      "medium",
      "An open question remains unresolved and should be pursued through participant-led clarification.",
      [openQuestion.id, openQuestion.sourceId ?? ""].filter(Boolean)
    ),
    ...(openQuestion.sourceId
      ? {
          type: "seekClarification" as const,
          targetId: openQuestion.sourceId,
          targetType: "open-question" as const,
        }
      : {
          type: "continueExploration" as const,
          areaId: openQuestion.areaId,
        }),
  } satisfies DiscoveryBehaviorRequest;

  return [
    {
      request,
      confidence: "medium",
      score: area?.status === "needs-follow-up" ? 72 : 58,
      rationale: "Question evaluation favors unresolved questions before summarization or completion.",
      supportingEvidence: evidenceForObservationIds(
        state.intelligenceSnapshot.observations,
        area?.observationIds ?? []
      ),
    },
  ];
}

function evaluatePatterns(state: DiscoverySessionState): DiscoveryDecisionCandidate[] {
  const observations = state.intelligenceSnapshot.observations;
  const patterns = state.intelligenceSnapshot.patterns.filter(
    (pattern) => !hasParticipantCorrection(state, pattern.id)
  );
  const unconfirmedSupported = patterns.find(
    (pattern) =>
      pattern.status === "supported" &&
      !state.participantConfirmations.some((confirmation) => confirmation.sourceId === pattern.id)
  );
  const weakPattern = patterns.find((pattern) => pattern.confidence.level === "low");
  const candidates: DiscoveryDecisionCandidate[] = [];

  if (unconfirmedSupported) {
    const request = {
      ...createRequestBase(
        "validateTheme",
        "high",
        "A supported internal pattern should remain provisional until the participant validates, refines, or rejects it.",
        [unconfirmedSupported.id]
      ),
      type: "validateTheme",
      themeId: unconfirmedSupported.id,
      themeType: "pattern",
    } satisfies DiscoveryBehaviorRequest;

    candidates.push({
      request,
      confidence: "high",
      score: 84,
      rationale: "Pattern evaluation prioritizes participant authority for supported but unconfirmed themes.",
      supportingEvidence: evidenceForObservationIds(
        observations,
        unconfirmedSupported.signals.map((signal) => signal.observationId)
      ),
    });
  }

  if (weakPattern) {
    const request = {
      ...createRequestBase(
        "seekEvidence",
        "medium",
        "A pattern exists with weak confidence and needs more evidence before stronger treatment.",
        [weakPattern.id]
      ),
      type: "seekEvidence",
      targetId: weakPattern.id,
      areaId: String(weakPattern.metadata?.areaId ?? ""),
      evidenceNeed: "Additional participant evidence across more than one statement or context.",
    } satisfies DiscoveryBehaviorRequest;

    candidates.push({
      request,
      confidence: "medium",
      score: 63,
      rationale: "Pattern evaluation prevents weak patterns from becoming conclusions.",
      supportingEvidence: evidenceForObservationIds(
        observations,
        weakPattern.signals.map((signal) => signal.observationId)
      ),
    });
  }

  return candidates;
}

function evaluateReflection(state: DiscoverySessionState): DiscoveryDecisionCandidate[] {
  const opportunity = state.reflectionOpportunities.find(
    (reflectionOpportunity) => reflectionOpportunity.status === "open"
  );
  if (!opportunity) return [];

  const sourceObservation =
    opportunity.sourceType === "observation"
      ? state.intelligenceSnapshot.observations.find(
          (observation) => observation.id === opportunity.sourceId
        )
      : undefined;
  const sourcePattern =
    opportunity.sourceType === "pattern"
      ? state.intelligenceSnapshot.patterns.find((pattern) => pattern.id === opportunity.sourceId)
      : undefined;
  const observationId = sourceObservation?.id ?? sourcePattern?.signals[0]?.observationId;
  if (!observationId) return [];

  const request = {
    ...createRequestBase(
      "reflectObservation",
      "medium",
      "A reflection opportunity is available, but any reflection must remain provisional and invite participant correction.",
      [opportunity.id, opportunity.sourceId, observationId]
    ),
    type: "reflectObservation",
    observationId,
    requiresParticipantValidation: true,
  } satisfies DiscoveryBehaviorRequest;

  return [
    {
      request,
      confidence: "medium",
      score: sourcePattern?.status === "supported" ? 76 : 57,
      rationale: "Reflection evaluation only selects opportunities already identified by understanding state.",
      supportingEvidence: evidenceForObservationIds(state.intelligenceSnapshot.observations, [
        observationId,
      ]),
    },
  ];
}

function evaluateTensions(state: DiscoverySessionState): DiscoveryDecisionCandidate[] {
  const tensionObservations = state.intelligenceSnapshot.observations.filter((observation) => {
    const text = `${observation.statement} ${observation.description ?? ""}`.toLowerCase();
    return (
      text.includes("tension") ||
      text.includes("contradiction") ||
      text.includes("competing") ||
      text.includes("both ")
    );
  });

  if (tensionObservations.length === 0) return [];

  const request = {
    ...createRequestBase(
      "investigateTension",
      "medium",
      "An unresolved tension may be worth exploring while preserving it as human complexity rather than resolving it.",
      tensionObservations.map((observation) => observation.id)
    ),
    type: "investigateTension",
    relatedObservationIds: tensionObservations.map((observation) => observation.id),
  } satisfies DiscoveryBehaviorRequest;

  return [
    {
      request,
      confidence: "medium",
      score: 70,
      rationale: "Tension evaluation preserves contradictions as first-class areas for exploration.",
      supportingEvidence: tensionObservations.flatMap((observation) => observation.evidence),
    },
  ];
}

function evaluateCompletionReadiness(state: DiscoverySessionState): DiscoveryCompletionReadiness {
  const coverage = state.intelligenceSnapshot.coverage;
  const exploredDomainCount = coverage.areas.filter(
    (area) => area.status !== "unexplored"
  ).length;
  const underexploredDomainCount = coverage.areas.filter(
    (area) => area.status === "unexplored" || area.status === "needs-follow-up"
  ).length;
  const openQuestionCount = state.openQuestions.filter(
    (question) => question.status === "open"
  ).length;
  const supportedPatternCount = state.intelligenceSnapshot.patterns.filter(
    (pattern) => pattern.status === "supported"
  ).length;
  const participantConfirmationCount = state.participantConfirmations.filter(
    (confirmation) => confirmation.status === "confirmed" || confirmation.status === "refined"
  ).length;
  const totalDomainCount = Math.max(coverage.areas.length, 1);
  const explorationScore = (exploredDomainCount / totalDomainCount) * 45;
  const patternScore = Math.min(supportedPatternCount * 8, 25);
  const confirmationScore = Math.min(participantConfirmationCount * 10, 20);
  const unresolvedPenalty = Math.min(openQuestionCount * 3 + underexploredDomainCount * 4, 35);
  const score = Math.max(
    0,
    Math.min(100, Math.round(explorationScore + patternScore + confirmationScore - unresolvedPenalty))
  );
  const status =
    score >= 75 && openQuestionCount <= 2
      ? "completion-ready"
      : score >= 45 && supportedPatternCount > 0
        ? "summarization-ready"
        : "not-ready";

  return {
    status,
    score,
    rationale:
      status === "completion-ready"
        ? "Coverage, evidence, and participant validation appear sufficient for future completion handling."
        : status === "summarization-ready"
          ? "Discovery may be ready to summarize progress, but should preserve unresolved questions."
          : "Discovery should continue exploration before summarization or completion.",
    exploredDomainCount,
    underexploredDomainCount,
    openQuestionCount,
    supportedPatternCount,
    participantConfirmationCount,
  };
}

function evaluateCompletion(
  state: DiscoverySessionState,
  readiness: DiscoveryCompletionReadiness
): DiscoveryDecisionCandidate[] {
  if (readiness.status === "completion-ready") {
    const request = {
      ...createRequestBase(
        "prepareCompletion",
        "high",
        "Completion readiness is high enough for future completion preparation.",
        state.intelligenceSnapshot.patterns.map((pattern) => pattern.id)
      ),
      type: "prepareCompletion",
      requiredArtifacts: [
        "observations",
        "evidence",
        "patterns",
        "participant-confirmed themes",
        "open questions",
        "coverage report",
        "understanding report",
      ],
      unresolvedQuestionIds: state.openQuestions
        .filter((question) => question.status === "open")
        .map((question) => question.id),
    } satisfies DiscoveryBehaviorRequest;

    return [
      {
        request,
        confidence: confidenceFromScore(readiness.score),
        score: readiness.score,
        rationale: "Completion evaluation selects preparation only when readiness is high.",
        supportingEvidence: state.evidence,
      },
    ];
  }

  if (readiness.status === "summarization-ready") {
    const request = {
      ...createRequestBase(
        "summarizeProgress",
        "medium",
        "Discovery has enough emerging structure to summarize progress without claiming completion.",
        state.intelligenceSnapshot.patterns.map((pattern) => pattern.id)
      ),
      type: "summarizeProgress",
      includeOpenQuestions: true,
      includeUncertainty: true,
    } satisfies DiscoveryBehaviorRequest;

    return [
      {
        request,
        confidence: confidenceFromScore(readiness.score),
        score: readiness.score,
        rationale: "Completion evaluation allows progress summary while preserving uncertainty.",
        supportingEvidence: state.evidence,
      },
    ];
  }

  return [];
}

function createFallbackCandidate(state: DiscoverySessionState): DiscoveryDecisionCandidate {
  const leastExplored = state.intelligenceSnapshot.coverage.areas
    .slice()
    .sort((left, right) => {
      const leftEvidence = Number(left.metadata?.evidenceDensity ?? 0);
      const rightEvidence = Number(right.metadata?.evidenceDensity ?? 0);
      return leftEvidence - rightEvidence;
    })[0];
  const request = {
    ...createRequestBase(
      "continueExploration",
      "medium",
      "No higher-priority decision was selected, so Discovery should continue participant-led exploration.",
      leastExplored ? [leastExplored.areaId] : undefined
    ),
    type: "continueExploration",
    areaId: leastExplored?.areaId,
  } satisfies DiscoveryBehaviorRequest;

  return {
    request,
    confidence: "low",
    score: 40,
    rationale: "Fallback decision keeps Discovery curious without inventing understanding.",
    supportingEvidence: [],
  };
}

function toAlternative(candidate: DiscoveryDecisionCandidate): DiscoveryDecisionAlternative {
  return {
    request: candidate.request,
    confidence: candidate.confidence,
    rationale: candidate.rationale,
  };
}

function createDecision(
  state: DiscoverySessionState,
  selected: DiscoveryDecisionCandidate,
  rejected: DiscoveryDecisionAlternative[],
  reprioritized: DiscoveryDecisionAlternative[],
  sessionMetadata?: AgentSessionMetadata
): DiscoveryBehaviorDecision {
  return {
    id: createId("decision"),
    selectedRequest: selected.request,
    confidence: selected.confidence,
    rationale: selected.rationale,
    supportingEvidenceIds: selected.supportingEvidence.map((evidence) => evidence.id),
    candidateAlternatives: [...reprioritized, ...rejected],
    sessionMetadata,
    createdAt: new Date().toISOString(),
    metadata: {
      participantAuthorityPreserved: true,
      uncertaintyPreserved: true,
      humanComplexityPreserved: true,
      evidenceLinked: selected.supportingEvidence.length > 0,
      curiosityDriven: true,
      createsObservations: false,
      createsEvidence: false,
      generatesLanguage: false,
      overridesParticipantCorrection: false,
      sessionId: state.sessionId,
    },
  };
}

function createEvents(
  state: DiscoverySessionState,
  decision: DiscoveryBehaviorDecision,
  rejected: DiscoveryDecisionAlternative[],
  reprioritized: DiscoveryDecisionAlternative[],
  completionReadiness: DiscoveryCompletionReadiness
): AgentEvent[] {
  return [
    {
      ...createEventBase(state, "decision.selected"),
      type: "decision.selected",
      decision,
    },
    ...rejected.map<AgentEvent>((alternative) => ({
      ...createEventBase(state, "decision.rejected"),
      type: "decision.rejected",
      decisionId: decision.id,
      alternative,
    })),
    ...reprioritized.map<AgentEvent>((alternative) => ({
      ...createEventBase(state, "decision.reprioritized"),
      type: "decision.reprioritized",
      decisionId: decision.id,
      alternative,
    })),
    {
      ...createEventBase(state, "completion.readiness.updated"),
      type: "completion.readiness.updated",
      readiness: completionReadiness,
    },
  ];
}

function collectCandidates(
  state: DiscoverySessionState,
  completionReadiness: DiscoveryCompletionReadiness
) {
  return [
    ...evaluateCoverage(state),
    ...evaluateQuestions(state),
    ...evaluatePatterns(state),
    ...evaluateReflection(state),
    ...evaluateTensions(state),
    ...evaluateCompletion(state, completionReadiness),
  ];
}

export function evaluateDiscoveryBehaviorDecision(
  state: DiscoverySessionState,
  sessionMetadata?: AgentSessionMetadata
): DiscoveryBehaviorDecisionResult {
  const completionReadiness = evaluateCompletionReadiness(state);
  const candidates = sortCandidates(collectCandidates(state, completionReadiness));
  const [selectedCandidate, ...alternatives] = candidates.length > 0
    ? candidates
    : [createFallbackCandidate(state)];
  const reprioritized = alternatives
    .filter((candidate) => candidate.score >= selectedCandidate.score - 15)
    .map(toAlternative);
  const rejected = alternatives
    .filter((candidate) => candidate.score < selectedCandidate.score - 15)
    .map(toAlternative);
  const decision = createDecision(
    state,
    selectedCandidate,
    rejected,
    reprioritized,
    sessionMetadata
  );
  const events = createEvents(state, decision, rejected, reprioritized, completionReadiness);

  return {
    selected: decision,
    rejected,
    reprioritized,
    completionReadiness,
    events,
  };
}

export function processDiscoveryBehaviorDecision(
  state: DiscoverySessionState,
  sessionMetadata?: AgentSessionMetadata
): DiscoverySessionState {
  const result = evaluateDiscoveryBehaviorDecision(state, sessionMetadata);

  return {
    ...state,
    latestBehaviorDecision: result.selected,
    behaviorDecisionHistory: [
      ...(state.behaviorDecisionHistory ?? []),
      result.selected,
    ],
    eventLog: [...state.eventLog, ...result.events],
  };
}
