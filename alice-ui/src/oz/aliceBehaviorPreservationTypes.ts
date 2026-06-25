export type AliceBehaviorQualityBand =
  | "excellent"
  | "good"
  | "watch"
  | "degraded"
  | "failed-founder-feel-test";

export type AliceBehaviorScoreDimension =
  | "warmth"
  | "naturalness"
  | "curiosity"
  | "oneQuestionAtATimeDiscipline"
  | "participantLedPacing"
  | "lateralMovementNonTunneling"
  | "reflectionQuality"
  | "synthesisQuality"
  | "redirectWithoutControlling"
  | "absenceOfLooping"
  | "absenceOfScriptedIntakeFeel"
  | "absenceOfPrematureEvaluation"
  | "absenceOfPrematureProfileGeneration"
  | "participantAuthorityPreservation"
  | "lighthouseTone";

export type AliceBehaviorDegradationFlag =
  | "LOOPING_OR_BEATING_DEAD_HORSE"
  | "QUESTION_STACK"
  | "SCRIPTED_INTAKE_FEEL"
  | "OVERCONTROLLED_OR_NERFED_FEEL"
  | "PREMATURE_EVALUATION"
  | "SCORING_OR_RANKING_DRIFT"
  | "PREMATURE_PROFILE_OUTPUT"
  | "PARTICIPANT_REDIRECT_IGNORED"
  | "PARTICIPANT_AUTHORITY_VIOLATION"
  | "PROTECTED_PROMPT_OR_SECRET_EXPOSURE"
  | "MIRROR_ONLY"
  | "ADVICE_DRIFT"
  | "UNSUPPORTED_INFERENCE"
  | "DISCOVERY_CUTOFF"
  | "TOO_CLINICAL"
  | "TOO_CORPORATE"
  | "TOO_MECHANICAL"
  | "TOO_SWEET_OR_SUFFOCATING";

export type AliceBehaviorRole = "assistant" | "user";

export type AliceBehaviorTurn = {
  role: AliceBehaviorRole;
  content: string;
};

export type AliceBehaviorScenario = {
  id: string;
  name: string;
  participantCase:
    | "rambling"
    | "changes-direction"
    | "rich-story"
    | "resists"
    | "technical-troubleshooting"
    | "emotional-identity"
    | "asks-if-enough"
    | "redirects-away"
    | "contradiction"
    | "short-low-information"
    | "boundary-check";
  baselineType: "deterministic-expected-good-fixture" | "deterministic-expected-boundary-violation";
  turnsBeforeCandidate: AliceBehaviorTurn[];
  aliceCandidate: string;
  minimumAverageScore: number;
  minimumScores?: Partial<Record<AliceBehaviorScoreDimension, number>>;
  expectedDegradationFlags?: AliceBehaviorDegradationFlag[];
};

export type AliceBehaviorRubric = {
  dimensions: AliceBehaviorScoreDimension[];
  degradationFlags: AliceBehaviorDegradationFlag[];
  qualityBands: AliceBehaviorQualityBand[];
};

export type AliceBehaviorScenarioEvaluation = {
  id: string;
  name: string;
  participantCase: AliceBehaviorScenario["participantCase"];
  baselineType: AliceBehaviorScenario["baselineType"];
  passed: boolean;
  scores: Record<AliceBehaviorScoreDimension, 1 | 2 | 3 | 4 | 5>;
  averageScore: number;
  qualityBand: AliceBehaviorQualityBand;
  degradationFlags: AliceBehaviorDegradationFlag[];
  notes: string[];
};

export type AliceBehaviorSimulationReport = {
  createdAt: string;
  passed: boolean;
  baselineType: AliceBehaviorScenario["baselineType"];
  rubric: AliceBehaviorRubric;
  scenarioCount: number;
  passedCount: number;
  failedCount: number;
  averageScore: number;
  qualityBand: AliceBehaviorQualityBand;
  degradationFlags: AliceBehaviorDegradationFlag[];
  scenarios: AliceBehaviorScenarioEvaluation[];
};

export type AliceOzBoundaryRecommendedAction = "continue" | "watch" | "stop_for_founder_review";

export type AliceOzBoundaryViolation = {
  scenarioId: string;
  scenarioName: string;
  baselineType: AliceBehaviorScenario["baselineType"];
  expected: boolean;
  degradationFlags: AliceBehaviorDegradationFlag[];
};

export type AliceOzBoundaryReport = {
  passed: boolean;
  qualityBand: AliceBehaviorQualityBand;
  averageScore: number;
  degradationFlags: AliceBehaviorDegradationFlag[];
  boundaryViolations: AliceOzBoundaryViolation[];
  recommendedAction: AliceOzBoundaryRecommendedAction;
  firstFailureReason?: string;
};

export type AliceExpectedBadFixtureResult = {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  expectedDegradationFlags: AliceBehaviorDegradationFlag[];
  actualDegradationFlags: AliceBehaviorDegradationFlag[];
  missingExpectedFlags: AliceBehaviorDegradationFlag[];
  unexpectedFlags: AliceBehaviorDegradationFlag[];
};

export type AliceBehaviorRegressionGateReport = {
  passed: boolean;
  scenarioCount: number;
  averageScore: number;
  qualityBand: AliceBehaviorQualityBand;
  degradationFlags: AliceBehaviorDegradationFlag[];
  expectedBadFixtureResults: AliceExpectedBadFixtureResult[];
  ozBoundaryReport: AliceOzBoundaryReport;
};
