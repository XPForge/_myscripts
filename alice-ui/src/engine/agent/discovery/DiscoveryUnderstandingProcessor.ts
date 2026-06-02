import type { AgentEvent, AgentEventBase } from "../instance";
import type {
  AgentObservation,
  AgentPattern,
  ConfidenceAssessment,
  CoverageArea,
  CoverageAssessment,
  EvidenceStrength,
  UnderstandingAssessment,
} from "../intelligence";
import type {
  DiscoverySessionState,
  OpenQuestion,
  ReflectionOpportunity,
} from "./DiscoverySessionState";
import { DiscoverySchema } from "./DiscoverySchema";

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

function confidenceFromEvidence(
  evidenceCount: number,
  repeatedEvidence: boolean
): ConfidenceAssessment {
  const evidenceStrength: EvidenceStrength =
    evidenceCount >= 3 || repeatedEvidence ? "strong" : evidenceCount >= 2 ? "moderate" : "weak";
  const level = evidenceStrength === "strong" ? "medium" : evidenceStrength === "moderate" ? "medium" : "low";

  return {
    level,
    evidenceCount,
    evidenceStrength,
    rationale:
      evidenceStrength === "weak"
        ? "Internal Discovery state from limited evidence. Keep as emerging and provisional."
        : "Internal Discovery state with repeated or denser evidence. Participant confirmation is still required before treating it as confirmed.",
    unresolvedQuestions: [
      "Has the participant confirmed this theme in their own terms?",
    ],
    metadata: {
      identityInferenceAllowed: false,
      participantAuthorityRequired: true,
    },
  };
}

function observationsByArea(observations: AgentObservation[]) {
  return observations.reduce<Record<string, AgentObservation[]>>((grouped, observation) => {
    grouped[observation.areaId] = [...(grouped[observation.areaId] ?? []), observation];
    return grouped;
  }, {});
}

function findExistingPattern(patterns: AgentPattern[], areaId: string) {
  return patterns.find((pattern) => pattern.metadata?.areaId === areaId);
}

function hasParticipantConfirmation(state: DiscoverySessionState, sourceId: string) {
  return state.participantConfirmations.some(
    (confirmation) =>
      confirmation.sourceId === sourceId &&
      (confirmation.status === "confirmed" || confirmation.status === "refined")
  );
}

function createOrUpdatePattern(
  state: DiscoverySessionState,
  areaId: string,
  observations: AgentObservation[],
  existing?: AgentPattern
): { pattern: AgentPattern; created: boolean } {
  const now = new Date().toISOString();
  const repeatedEvidence = observations.some(
    (observation) => Number(observation.confidence.metadata?.repeatedSignals ?? 0) > 0
  );
  const participantConfirmed = existing ? hasParticipantConfirmation(state, existing.id) : false;
  const supported = observations.length >= 2 || repeatedEvidence || participantConfirmed;
  const confidence = confidenceFromEvidence(
    observations.reduce((count, observation) => count + observation.evidence.length, 0),
    repeatedEvidence
  );
  const pattern: AgentPattern = {
    id: existing?.id ?? createId("pattern"),
    agentId: state.agentId,
    name: supported ? "Supported Discovery Theme" : "Candidate Discovery Theme",
    description:
      supported
        ? "A provisional theme has enough repeated or denser evidence to be tracked as supported internally."
        : "A possible theme is emerging from one or more observations but is not yet supported enough for stronger treatment.",
    status: supported ? "supported" : "emerging",
    signals: observations.map((observation, index) => ({
      observationId: observation.id,
      contribution: index === 0 ? "primary" : "supporting",
      rationale: "Observation contributes to an internal Discovery theme without creating an identity claim.",
    })),
    confidence,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    metadata: {
      areaId,
      candidate: !supported,
      supported,
      participantConfirmed,
      inferenceLevel: "pattern",
      identityClaim: false,
      participantFacing: false,
    },
  };

  return { pattern, created: !existing };
}

function updatePatterns(state: DiscoverySessionState) {
  const grouped = observationsByArea(state.intelligenceSnapshot.observations);
  const patterns = [...state.intelligenceSnapshot.patterns];
  const createdPatterns: AgentPattern[] = [];

  Object.entries(grouped).forEach(([areaId, observations]) => {
    if (observations.length === 0) return;
    const existing = findExistingPattern(patterns, areaId);
    const { pattern, created } = createOrUpdatePattern(state, areaId, observations, existing);
    if (existing) {
      const index = patterns.findIndex((item) => item.id === existing.id);
      patterns[index] = pattern;
    } else {
      patterns.push(pattern);
    }
    if (created) createdPatterns.push(pattern);
  });

  return { patterns, createdPatterns };
}

function updateCoverage(
  state: DiscoverySessionState,
  patterns: AgentPattern[]
): CoverageAssessment {
  const observations = state.intelligenceSnapshot.observations;
  const areas: CoverageArea[] = DiscoverySchema.sections.map((section) => {
    const areaObservations = observations.filter((observation) => observation.areaId === section.id);
    const areaPatterns = patterns.filter((pattern) => pattern.metadata?.areaId === section.id);
    const evidenceCount = areaObservations.reduce(
      (count, observation) => count + observation.evidence.length,
      0
    );
    const mediumConfidenceCount = areaObservations.filter(
      (observation) => observation.confidence.level !== "low"
    ).length;
    const status =
      areaObservations.length === 0
        ? "unexplored"
        : evidenceCount >= 2 || mediumConfidenceCount > 0
          ? "partially-explored"
          : "needs-follow-up";

    return {
      areaId: section.id,
      status,
      known: areaObservations.map((observation) => observation.description ?? observation.statement),
      unknown:
        areaObservations.length === 0
          ? [`${section.title} has not yet been explored.`]
          : areaObservations.flatMap((observation) => observation.confidence.unresolvedQuestions),
      needsExploration:
        status === "unexplored" || status === "needs-follow-up"
          ? [`More participant evidence is needed for ${section.title}.`]
          : [],
      observationIds: areaObservations.map((observation) => observation.id),
      patternIds: areaPatterns.map((pattern) => pattern.id),
      metadata: {
        evidenceDensity: evidenceCount,
        observationCount: areaObservations.length,
        confidenceCount: mediumConfidenceCount,
      },
    };
  });

  const exploredCount = areas.filter((area) => area.status !== "unexplored").length;
  const overallStatus = exploredCount === 0 ? "unexplored" : "partially-explored";

  return {
    agentId: state.agentId,
    areas,
    overallStatus,
    updatedAt: new Date().toISOString(),
  };
}

function updateUnderstanding(
  coverage: CoverageAssessment,
  patterns: AgentPattern[]
): UnderstandingAssessment[] {
  return coverage.areas
    .filter((area) => area.observationIds.length > 0 || area.needsExploration.length > 0)
    .map((area) => {
      const areaPatterns = patterns.filter((pattern) => pattern.metadata?.areaId === area.areaId);
      const evidenceCount = Number(area.metadata?.evidenceDensity ?? 0);
      const confidence = confidenceFromEvidence(evidenceCount, areaPatterns.some((pattern) => pattern.status === "supported"));
      const summary =
        area.observationIds.length > 0
          ? "Discovery has emerging internal understanding in this area, based on provisional observations."
          : "Discovery has not yet formed understanding in this area.";

      return {
        areaId: area.areaId,
        status: area.patternIds.length > 0 ? "emerging" : "insufficient",
        summary,
        supportingObservationIds: area.observationIds,
        supportingPatternIds: area.patternIds,
        confidence,
        remainingQuestions: area.unknown,
        metadata: {
          knownThemes: area.known,
          emergingThemes: areaPatterns.map((pattern) => pattern.description),
          unresolvedThemes: area.needsExploration,
          participantAuthorityRequired: true,
          participantFacing: false,
        },
      };
    });
}

function createOpenQuestions(
  state: DiscoverySessionState,
  coverage: CoverageAssessment
): { questions: OpenQuestion[]; created: OpenQuestion[] } {
  const existingKeys = new Set(
    (state.openQuestions ?? []).map((question) => `${question.areaId ?? ""}:${question.sourceId ?? ""}:${question.question}`)
  );
  const created: OpenQuestion[] = [];

  coverage.areas.forEach((area) => {
    if (area.status !== "needs-follow-up" && area.status !== "unexplored") return;
    const questionText =
      area.status === "unexplored"
        ? "What, if anything, does the participant want to share about this area?"
        : "What additional participant evidence would clarify this emerging observation?";
    const sourceId = area.observationIds[0] ?? area.areaId;
    const key = `${area.areaId}:${sourceId}:${questionText}`;
    if (existingKeys.has(key)) return;
    created.push({
      id: createId("open-question"),
      areaId: area.areaId,
      question: questionText,
      sourceId,
      createdAt: new Date().toISOString(),
      status: "open",
    });
    existingKeys.add(key);
  });

  return {
    questions: [...(state.openQuestions ?? []), ...created],
    created,
  };
}

function createReflectionOpportunities(
  state: DiscoverySessionState,
  patterns: AgentPattern[]
): { opportunities: ReflectionOpportunity[]; created: ReflectionOpportunity[] } {
  const existingKeys = new Set(
    (state.reflectionOpportunities ?? []).map((opportunity) => `${opportunity.sourceType}:${opportunity.sourceId}`)
  );
  const created: ReflectionOpportunity[] = [];

  patterns.forEach((pattern) => {
    if (pattern.status !== "supported") return;
    const key = `pattern:${pattern.id}`;
    if (existingKeys.has(key)) return;
    created.push({
      id: createId("reflection-opportunity"),
      sourceType: "pattern",
      sourceId: pattern.id,
      reason: "A repeated or denser internal theme may justify future participant-correctable reflection.",
      createdAt: new Date().toISOString(),
      status: "open",
    });
    existingKeys.add(key);
  });

  return {
    opportunities: [...(state.reflectionOpportunities ?? []), ...created],
    created,
  };
}

function createEvents(
  state: DiscoverySessionState,
  createdPatterns: AgentPattern[],
  coverage: CoverageAssessment,
  understanding: UnderstandingAssessment[],
  openQuestions: OpenQuestion[],
  reflectionOpportunities: ReflectionOpportunity[]
): AgentEvent[] {
  return [
    ...createdPatterns.map<AgentEvent>((pattern) => ({
      ...createEventBase(state, "pattern.created"),
      type: "pattern.created",
      pattern,
    })),
    {
      ...createEventBase(state, "coverage.updated"),
      type: "coverage.updated",
      coverage,
    },
    {
      ...createEventBase(state, "understanding.updated"),
      type: "understanding.updated",
      understanding,
    },
    ...openQuestions.map<AgentEvent>((question) => ({
      ...createEventBase(state, "open_question.created"),
      type: "open_question.created",
      question,
    })),
    ...reflectionOpportunities.map<AgentEvent>((opportunity) => ({
      ...createEventBase(state, "reflection_opportunity.created"),
      type: "reflection_opportunity.created",
      opportunity,
    })),
  ];
}

export function processDiscoveryUnderstanding(
  state: DiscoverySessionState
): DiscoverySessionState {
  const { patterns, createdPatterns } = updatePatterns(state);
  const coverage = updateCoverage(state, patterns);
  const understanding = updateUnderstanding(coverage, patterns);
  const { questions, created: createdQuestions } = createOpenQuestions(state, coverage);
  const { opportunities, created: createdOpportunities } = createReflectionOpportunities(state, patterns);
  const events = createEvents(
    state,
    createdPatterns,
    coverage,
    understanding,
    createdQuestions,
    createdOpportunities
  );

  return {
    ...state,
    openQuestions: questions,
    reflectionOpportunities: opportunities,
    eventLog: [...state.eventLog, ...events],
    intelligenceSnapshot: {
      ...state.intelligenceSnapshot,
      patterns,
      coverage,
      understanding,
      updatedAt: new Date().toISOString(),
    },
  };
}
