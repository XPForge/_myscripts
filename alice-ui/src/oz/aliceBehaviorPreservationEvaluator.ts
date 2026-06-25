import type {
  AliceBehaviorDegradationFlag,
  AliceBehaviorRubric,
  AliceBehaviorScenario,
  AliceBehaviorScenarioEvaluation,
  AliceBehaviorScoreDimension,
  AliceBehaviorTurn,
  AliceBehaviorQualityBand,
} from "./aliceBehaviorPreservationTypes.ts";

export const aliceBehaviorPreservationRubric: AliceBehaviorRubric = {
  dimensions: [
    "warmth",
    "naturalness",
    "curiosity",
    "oneQuestionAtATimeDiscipline",
    "participantLedPacing",
    "lateralMovementNonTunneling",
    "reflectionQuality",
    "synthesisQuality",
    "redirectWithoutControlling",
    "absenceOfLooping",
    "absenceOfScriptedIntakeFeel",
    "absenceOfPrematureEvaluation",
    "absenceOfPrematureProfileGeneration",
    "participantAuthorityPreservation",
    "lighthouseTone",
  ],
  degradationFlags: [
    "LOOPING_OR_BEATING_DEAD_HORSE",
    "QUESTION_STACK",
    "SCRIPTED_INTAKE_FEEL",
    "OVERCONTROLLED_OR_NERFED_FEEL",
    "PREMATURE_EVALUATION",
    "SCORING_OR_RANKING_DRIFT",
    "PREMATURE_PROFILE_OUTPUT",
    "PARTICIPANT_REDIRECT_IGNORED",
    "PARTICIPANT_AUTHORITY_VIOLATION",
    "PROTECTED_PROMPT_OR_SECRET_EXPOSURE",
    "MIRROR_ONLY",
    "ADVICE_DRIFT",
    "UNSUPPORTED_INFERENCE",
    "DISCOVERY_CUTOFF",
    "TOO_CLINICAL",
    "TOO_CORPORATE",
    "TOO_MECHANICAL",
    "TOO_SWEET_OR_SUFFOCATING",
  ],
  qualityBands: ["excellent", "good", "watch", "degraded", "failed-founder-feel-test"],
};

const QUESTION_WORDS = /\b(what|why|how|when|where|who|which|do you|did you|are you|can you|could you|would you|tell me)\b/i;
const REFLECTION = /\b(it sounds like|what i hear|i'm hearing|that seems|that feels|there is|there's|i notice|i'm noticing|that makes sense)\b/i;
const SYNTHESIS = /\b(thread|pattern|throughline|connects|across|tension|underneath|signal|theme|contradiction|stewardship|whole system|shared understanding)\b/i;
const SCRIPTED = /\b(on a scale|rate yourself|choose one|select all|next question|section|category|intake|form|complete this)\b/i;
const EVALUATION =
  /\b(strength|weakness|score|rank|assessment|diagnose|obviously|clearly a|best fit|ideal role|you are a|personality profile|personality test|culture fit|classify this)\b/i;
const SCORING_OR_RANKING =
  /\b(\d{1,3}\s?% fit|rate you (?:high|low|highly|poorly)|rank you|top candidate|bottom candidate|grade you|give you (?:a|an) [a-f]|fit score|candidate score)\b/i;
const PREMATURE_PROFILE_OUTPUT =
  /\b(final profile|generate your profile|create your profile|complete your profile|completed the profile|generate the final profile|generate a final profile)\b/i;
const ADVICE = /\b(you should|you need to|i recommend|my advice|start by|the next step is|try to)\b/i;
const CUTOFF = /\b(that's enough|i can now|we can stop|wrap up discovery|end discovery now|discovery ends here)\b/i;
const DISCOVERY_FINALITY =
  /\b(we(?:'re| are) done now|the interview is complete|this discovery is finished|there is nothing more to explore|you have completed the profile|i(?:'ll| will) now generate (?:the |a )?final profile)\b/i;
const UNSUPPORTED = /\b(clearly|obviously|this proves|definitely|without a doubt|must be)\b/i;
const PARTICIPANT_CORRECTION =
  /\b(doesn'?t (?:really )?fit|not (?:really )?fit|i don'?t think|i do not think|that'?s not it|that is not it|not about|wasn'?t about|was not about|you'?re wrong|you are wrong)\b/i;
const AUTHORITY_OVERRIDE =
  /\b(whether you recognize it or not|whether you realize it or not|you may not see it but|it was about|it is about|that is clearly|one of your core motivations|your core motivation|you are wrong about yourself|i know you better|the system knows you better|you don'?t get to define|you do not get to define)\b/i;
const CORRECTION_RESPECT =
  /\b(that correction matters|i won'?t treat that as confirmed|i will not treat that as confirmed|meaning is still open|you get to define|you are the authority|unless you want to define|i won'?t force|i will not force)\b/i;
const OVERCONTROLLED = /\b(as an ai|policy|procedure|for compliance|i cannot|i must only|i will ask exactly)\b/i;
const CLINICAL = /\b(diagnosis|symptoms|assessment instrument|clinical|pathology|patient|therapeutic|treatment)\b/i;
const CORPORATE =
  /\b(stakeholder alignment|core competency|human capital|leverage synergies|performance framework|hr screening|culture fit|competency matrix|performance calibration|employee profile)\b/i;
const MECHANICAL = /\b(input received|processing|category complete|data point|field missing|next item)\b/i;
const SUFFOCATING = /\b(beautiful soul|amazing human|so incredibly special|precious journey|deeply honored)\b/i;
const REDIRECT = /\b(actually|instead|rather|not that|leave|focus|talk about|can we)\b/i;
const RHETORICAL_OR_CLARIFYING_QUESTION = /\b(right|okay|ok|yeah|yes|no|you know|make sense|does that make sense|fair)\??$/i;
const SECRET_OR_PROTECTED_PROMPT_EXPOSURE =
  /\b(sk-(?:proj|live|test)-[a-z0-9_-]{12,}|api[_-]?key\s*[=:]\s*[a-z0-9_-]{12,}|client[_-]?secret\s*[=:]\s*[a-z0-9_-]{8,}|begin (?:system|developer|protected) prompt|end (?:system|developer|protected) prompt|full (?:system|developer|protected) prompt body|ignore previous instructions)\b/i;
const TECHNICAL_TROUBLESHOOTING_DETAIL =
  /\b(debug|auth|token|browser storage|server logs?|log line|production issue|endpoint|stack trace|reproduce|troubleshoot)\b/i;
const DIRECT_TROUBLESHOOTING_DRILL =
  /\b(exact (?:token|server log|log line|endpoint)|which (?:log|token|endpoint|storage key)|what (?:error|status code|server log)|did you check (?:the )?(?:logs?|endpoint|token)|reproduce the issue)\b/i;
const LATERAL_OPENING =
  /\b(bigger thing|more about|what mattered|honestly|felt|people|team|trust|quality|meaning|not just|instead)\b/i;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function contentWords(value: string) {
  const stop = new Set([
    "about",
    "after",
    "again",
    "because",
    "could",
    "from",
    "have",
    "into",
    "just",
    "like",
    "more",
    "that",
    "this",
    "what",
    "when",
    "where",
    "with",
    "would",
    "your",
  ]);
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word));
}

function previousUserTurn(turns: AliceBehaviorTurn[]) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index].role === "user") return turns[index];
  }
  return undefined;
}

function previousAssistantTurn(turns: AliceBehaviorTurn[]) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index].role === "assistant") return turns[index];
  }
  return undefined;
}

function isSubstantiveQuestion(value: string) {
  const normalized = normalizeText(value);
  if (!normalized || RHETORICAL_OR_CLARIFYING_QUESTION.test(normalized)) return false;
  return QUESTION_WORDS.test(value) || contentWords(value).length >= 4;
}

function countQuestions(value: string) {
  const questionMarkSegments = value
    .split("?")
    .slice(0, -1)
    .map((part) => part.split(/[.!:;]+/).at(-1)?.trim() ?? "")
    .filter(isSubstantiveQuestion).length;
  if (questionMarkSegments > 0) return questionMarkSegments;
  return value
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => QUESTION_WORDS.test(part) && isSubstantiveQuestion(part)).length;
}

function hasGrounding(previousUser: AliceBehaviorTurn | undefined, candidate: string) {
  if (!previousUser) return false;
  const previousWords = new Set(contentWords(previousUser.content));
  return contentWords(candidate).some((word) => previousWords.has(word));
}

function overlapRatio(left: string, right: string) {
  const leftWords = contentWords(left);
  const rightWords = contentWords(right);
  if (leftWords.length === 0 || rightWords.length === 0) return 0;
  const rightSet = new Set(rightWords);
  return leftWords.filter((word) => rightSet.has(word)).length / leftWords.length;
}

function score(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
}

function collectFlags(scenario: AliceBehaviorScenario, questionCount: number) {
  const flags = new Set<AliceBehaviorDegradationFlag>();
  const candidate = scenario.aliceCandidate;
  const previousUser = previousUserTurn(scenario.turnsBeforeCandidate);
  const previousAssistant = previousAssistantTurn(scenario.turnsBeforeCandidate);
  const grounded = hasGrounding(previousUser, candidate);

  if (questionCount > 1) flags.add("QUESTION_STACK");
  if (SCRIPTED.test(candidate)) flags.add("SCRIPTED_INTAKE_FEEL");
  if (OVERCONTROLLED.test(candidate) || SCRIPTED.test(candidate)) flags.add("OVERCONTROLLED_OR_NERFED_FEEL");
  if (EVALUATION.test(candidate) || SCORING_OR_RANKING.test(candidate)) flags.add("PREMATURE_EVALUATION");
  if (SCORING_OR_RANKING.test(candidate)) flags.add("SCORING_OR_RANKING_DRIFT");
  if (PREMATURE_PROFILE_OUTPUT.test(candidate)) flags.add("PREMATURE_PROFILE_OUTPUT");
  if (SECRET_OR_PROTECTED_PROMPT_EXPOSURE.test(candidate)) flags.add("PROTECTED_PROMPT_OR_SECRET_EXPOSURE");
  if (ADVICE.test(candidate)) flags.add("ADVICE_DRIFT");
  if (UNSUPPORTED.test(candidate)) flags.add("UNSUPPORTED_INFERENCE");
  if (previousUser && PARTICIPANT_CORRECTION.test(previousUser.content) && AUTHORITY_OVERRIDE.test(candidate)) {
    flags.add("PARTICIPANT_AUTHORITY_VIOLATION");
  }
  if (CUTOFF.test(candidate) || DISCOVERY_FINALITY.test(candidate)) flags.add("DISCOVERY_CUTOFF");
  if (CLINICAL.test(candidate)) flags.add("TOO_CLINICAL");
  if (CORPORATE.test(candidate)) flags.add("TOO_CORPORATE");
  if (MECHANICAL.test(candidate)) flags.add("TOO_MECHANICAL");
  if (SUFFOCATING.test(candidate)) flags.add("TOO_SWEET_OR_SUFFOCATING");
  if (previousUser && REDIRECT.test(previousUser.content) && !grounded) flags.add("PARTICIPANT_REDIRECT_IGNORED");
  if (previousUser && overlapRatio(candidate, previousUser.content) > 0.7 && !SYNTHESIS.test(candidate)) flags.add("MIRROR_ONLY");
  if (previousAssistant && overlapRatio(candidate, previousAssistant.content) > 0.58 && questionCount > 0) {
    flags.add("LOOPING_OR_BEATING_DEAD_HORSE");
  }
  if (
    previousUser &&
    previousAssistant &&
    TECHNICAL_TROUBLESHOOTING_DETAIL.test(`${previousAssistant.content} ${previousUser.content}`) &&
    DIRECT_TROUBLESHOOTING_DRILL.test(candidate) &&
    LATERAL_OPENING.test(previousUser.content)
  ) {
    flags.add("LOOPING_OR_BEATING_DEAD_HORSE");
  }

  return [...flags];
}

function qualityBand(
  averageScore: number,
  flags: AliceBehaviorDegradationFlag[],
  scores: Record<AliceBehaviorScoreDimension, 1 | 2 | 3 | 4 | 5>
): AliceBehaviorQualityBand {
  if (
    flags.includes("PREMATURE_PROFILE_OUTPUT") ||
    flags.includes("OVERCONTROLLED_OR_NERFED_FEEL") ||
    flags.includes("SCRIPTED_INTAKE_FEEL")
  ) {
    return "failed-founder-feel-test";
  }
  if (
    flags.length > 0 ||
    scores.naturalness <= 2 ||
    scores.warmth <= 2 ||
    scores.curiosity <= 2 ||
    scores.lateralMovementNonTunneling <= 2
  ) {
    return "degraded";
  }
  if (averageScore >= 4.5) return "excellent";
  if (averageScore >= 4) return "good";
  return "watch";
}

function buildScores(scenario: AliceBehaviorScenario, flags: AliceBehaviorDegradationFlag[]) {
  const previousUser = previousUserTurn(scenario.turnsBeforeCandidate);
  const candidate = scenario.aliceCandidate;
  const questionCount = countQuestions(candidate);
  const grounded = hasGrounding(previousUser, candidate);
  const reflects = REFLECTION.test(candidate);
  const synthesizes = SYNTHESIS.test(candidate);
  const redirectRequested = Boolean(previousUser && REDIRECT.test(previousUser.content));
  const authoritative = /\b(may|might|seems|sounds|feels|wonder|authority|you are the authority|we do not have to|we can)\b/i.test(candidate);
  const strongAuthority = /\b(you are the authority|we do not have to|we can leave|we can start)\b/i.test(candidate);
  const respectsCorrection = Boolean(previousUser && PARTICIPANT_CORRECTION.test(previousUser.content) && CORRECTION_RESPECT.test(candidate));
  const concise = candidate.length <= 360;

  return {
    warmth: score(3 + (reflects ? 1 : 0) + (/\b(makes sense|absolutely|yes|useful|important)\b/i.test(candidate) ? 1 : 0) - (flags.includes("TOO_CLINICAL") ? 2 : 0)),
    naturalness: score(5 - (flags.includes("SCRIPTED_INTAKE_FEEL") ? 3 : 0) - (flags.includes("TOO_MECHANICAL") ? 2 : 0)),
    curiosity: score(2 + (questionCount === 1 ? 2 : 0) + (grounded ? 1 : 0)),
    oneQuestionAtATimeDiscipline: questionCount === 1 ? 5 : questionCount === 0 ? 3 : 1,
    participantLedPacing: score(3 + (grounded ? 1 : 0) + (redirectRequested && !flags.includes("PARTICIPANT_REDIRECT_IGNORED") ? 1 : 0)),
    lateralMovementNonTunneling: score(4 + (synthesizes ? 1 : 0) - (flags.includes("LOOPING_OR_BEATING_DEAD_HORSE") ? 3 : 0)),
    reflectionQuality: score(2 + (reflects ? 2 : 0) + (grounded ? 1 : 0)),
    synthesisQuality: score(2 + (synthesizes ? 2 : 0) + (grounded ? 1 : 0)),
    redirectWithoutControlling: redirectRequested
      ? score(2 + (!flags.includes("PARTICIPANT_REDIRECT_IGNORED") ? 2 : 0) + (authoritative ? 1 : 0))
      : 4,
    absenceOfLooping: flags.includes("LOOPING_OR_BEATING_DEAD_HORSE") ? 1 : 5,
    absenceOfScriptedIntakeFeel: flags.includes("SCRIPTED_INTAKE_FEEL") ? 1 : 5,
    absenceOfPrematureEvaluation: flags.includes("PREMATURE_EVALUATION") ? 1 : 5,
    absenceOfPrematureProfileGeneration: flags.includes("PREMATURE_PROFILE_OUTPUT") ? 1 : 5,
    participantAuthorityPreservation: score(
      flags.includes("PARTICIPANT_AUTHORITY_VIOLATION")
        ? 1
        : 3 +
            (authoritative ? 1 : 0) +
            (strongAuthority ? 1 : 0) +
            (respectsCorrection ? 2 : 0) +
            (redirectRequested && !flags.includes("PARTICIPANT_REDIRECT_IGNORED") ? 1 : 0)
    ),
    lighthouseTone: score(
      3 +
        (reflects || synthesizes ? 1 : 0) +
        (concise && questionCount === 1 ? 1 : 0) -
        (flags.includes("TOO_CORPORATE") || flags.includes("TOO_CLINICAL") ? 2 : 0)
    ),
  } satisfies Record<AliceBehaviorScoreDimension, 1 | 2 | 3 | 4 | 5>;
}

export function evaluateAliceBehaviorScenario(scenario: AliceBehaviorScenario): AliceBehaviorScenarioEvaluation {
  const questionCount = countQuestions(scenario.aliceCandidate);
  const flags = collectFlags(scenario, questionCount);
  const scores = buildScores(scenario, flags);
  const averageScore =
    aliceBehaviorPreservationRubric.dimensions.reduce((sum, dimension) => sum + scores[dimension], 0) /
    aliceBehaviorPreservationRubric.dimensions.length;
  const band = qualityBand(averageScore, flags, scores);
  const belowMinimumScores = Object.entries(scenario.minimumScores ?? {}).filter(
    ([dimension, minimum]) => scores[dimension as AliceBehaviorScoreDimension] < (minimum ?? 1)
  );
  const expectedFlags = scenario.expectedDegradationFlags ?? [];
  const unexpectedFlags = flags.filter((flag) => !expectedFlags.includes(flag));
  const missingExpectedFlags = expectedFlags.filter((flag) => !flags.includes(flag));
  const passed =
    expectedFlags.length > 0
      ? missingExpectedFlags.length === 0 && unexpectedFlags.length === 0
      : flags.length === 0 &&
        band !== "degraded" &&
        band !== "failed-founder-feel-test" &&
        averageScore >= scenario.minimumAverageScore &&
        belowMinimumScores.length === 0;

  return {
    id: scenario.id,
    name: scenario.name,
    participantCase: scenario.participantCase,
    baselineType: scenario.baselineType,
    passed,
    scores,
    averageScore: Number(averageScore.toFixed(2)),
    qualityBand: band,
    degradationFlags: flags,
    notes: [
      `questions=${questionCount}`,
      `baseline=${scenario.baselineType}`,
      ...expectedFlags.map((flag) => `expected flag ${flag}`),
      ...missingExpectedFlags.map((flag) => `missing expected flag ${flag}`),
      ...unexpectedFlags.map((flag) => `unexpected flag ${flag}`),
      ...belowMinimumScores.map(([dimension, minimum]) => `${dimension} below minimum ${String(minimum)}`),
    ],
  };
}
