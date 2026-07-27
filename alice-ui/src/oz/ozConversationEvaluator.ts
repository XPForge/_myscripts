import type {
  OzBehaviorTag,
  OzConversationInput,
  OzConversationTurn,
  OzDesiredBehaviorTag,
  OzEvaluationReport,
  OzNotableExample,
  OzQualityBand,
  OzTurnEvaluation,
  OzUndesiredBehaviorTag,
} from "./ozConversationEvaluatorTypes.ts";

const DESIRED_TAGS: OzDesiredBehaviorTag[] = [
  "ASK_SINGLE",
  "REFLECT_UNDERSTANDING",
  "SYNTHESIS",
  "GROUNDED_FOLLOWUP",
  "RELATED_REDIRECT",
  "PARTICIPANT_AUTHORITY_RESPECTED",
  "NATURAL_MOVEMENT",
  "PACE_CONTROL",
  "ALIVE_DISCOVERY_FEEL",
  "MEANING_OVER_MIRRORING",
];

const UNDESIRED_TAGS: OzUndesiredBehaviorTag[] = [
  "QUESTION_STACK",
  "PREMATURE_EVALUATION",
  "ROLE_RECOMMENDATION_DRIFT",
  "PREMATURE_PROFILE_OUTPUT",
  "MIRROR_ONLY",
  "UNSUPPORTED_INFERENCE",
  "SCRIPTED_INTAKE_FEEL",
  "DISCOVERY_CUTOFF",
  "ADVICE_DRIFT",
  "LOOPING_OR_BEATING_DEAD_HORSE",
  "PARTICIPANT_REDIRECT_IGNORED",
  "OVERCONTROLLED_OR_NERFED_FEEL",
];

const QUESTION_WORDS = /\b(what|why|how|when|where|who|which|do you|did you|are you|can you|could you|would you|tell me)\b/i;
const ROLE_RECOMMENDATION = /\b(you should|you could be|you would be a good|you'd be a good|i recommend|best role|career path|job for you|apply for|ideal role|great fit for)\b/i;
const ADVICE = /\b(my advice|you should|you need to|i recommend|try to|start by|the next step is|you may want to)\b/i;
const PROFILE_OUTPUT = /\b(profile|capability profile|final profile|summary profile|strengths are|weaknesses are|competency|competencies|scorecard)\b/i;
const REFLECTION = /\b(it sounds like|what i hear|i'm hearing|that seems|that tells me|so the thread|the pattern|underneath that|meaning|because)\b/i;
const SYNTHESIS = /\b(thread|pattern|connects|across|tension|throughline|signal|theme|underneath|seems to be)\b/i;
const SCRIPTED = /\b(on a scale|rate yourself|choose one|select all|next question|section|category|intake|form|complete this)\b/i;
const CUTOFF = /\b(that's enough|we have enough|i can now create|finalize|complete your profile|end discovery|wrap up discovery)\b/i;
const OVERCONTROLLED = /\b(i cannot|i'm not able to|as an ai|i must only|policy|procedure|for compliance|i will ask exactly)\b/i;
const UNSUPPORTED = /\b(clearly|obviously|this proves|you are definitely|you must be|without a doubt)\b/i;
const REDIRECT = /\b(actually|instead|not that|let's focus|can we talk about|i'd rather|that's not it|no,)\b/i;

function emptyDesiredCounts() {
  return Object.fromEntries(DESIRED_TAGS.map((tag) => [tag, 0])) as Record<OzDesiredBehaviorTag, number>;
}

function emptyUndesiredCounts() {
  return Object.fromEntries(UNDESIRED_TAGS.map((tag) => [tag, 0])) as Record<OzUndesiredBehaviorTag, number>;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function excerpt(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function splitSentences(value: string) {
  return value.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
}

function countMajorQuestions(value: string) {
  const questionMarks = (value.match(/\?/g) ?? []).length;
  const questionSentences = splitSentences(value).filter((sentence) => QUESTION_WORDS.test(sentence)).length;
  return Math.max(questionMarks, questionSentences);
}

function getPreviousTurn(turns: OzConversationTurn[], index: number, role?: OzConversationTurn["role"]) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!role || turns[cursor].role === role) return turns[cursor];
  }
  return undefined;
}

function getNextTurn(turns: OzConversationTurn[], index: number, role?: OzConversationTurn["role"]) {
  for (let cursor = index + 1; cursor < turns.length; cursor += 1) {
    if (!role || turns[cursor].role === role) return { turn: turns[cursor], index: cursor };
  }
  return undefined;
}

function contentWords(value: string) {
  const stop = new Set(["about", "after", "again", "because", "could", "from", "have", "into", "just", "like", "that", "this", "what", "when", "where", "with", "would", "your"]);
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word));
}

function hasGrounding(previousParticipant: OzConversationTurn | undefined, assistantText: string) {
  if (!previousParticipant) return false;
  const previousWords = new Set(contentWords(previousParticipant.content));
  if (previousWords.size === 0) return false;
  return contentWords(assistantText).some((word) => previousWords.has(word));
}

function looksLikeMirrorOnly(previousParticipant: OzConversationTurn | undefined, assistantText: string) {
  if (!previousParticipant) return false;
  const participantWords = contentWords(previousParticipant.content);
  const assistantWords = contentWords(assistantText);
  if (participantWords.length < 4 || assistantWords.length < 4) return false;
  const overlap = assistantWords.filter((word) => participantWords.includes(word)).length / assistantWords.length;
  return overlap > 0.72 && !SYNTHESIS.test(assistantText);
}

function participantRedirectFollowed(turns: OzConversationTurn[], participantIndex: number) {
  const redirectTurn = turns[participantIndex];
  const nextAssistant = getNextTurn(turns, participantIndex, "assistant");
  if (!nextAssistant) return false;
  const redirectWords = new Set(contentWords(redirectTurn.content));
  return contentWords(nextAssistant.turn.content).some((word) => redirectWords.has(word));
}

function detectLooping(turns: OzConversationTurn[], index: number) {
  const current = turns[index];
  const previousAssistant = getPreviousTurn(turns, index, "assistant");
  if (!previousAssistant) return false;
  const currentWords = contentWords(current.content);
  const previousWords = contentWords(previousAssistant.content);
  if (currentWords.length < 5 || previousWords.length < 5) return false;
  const previousSet = new Set(previousWords);
  const overlap = currentWords.filter((word) => previousSet.has(word)).length / currentWords.length;
  return overlap > 0.6 && countMajorQuestions(current.content) > 0;
}

function addExample(examples: OzNotableExample[], turnIndex: number, tag: OzBehaviorTag, content: string) {
  if (examples.length >= 18) return;
  examples.push({ turnIndex, tag, excerpt: excerpt(content) });
}

function scoreTurn(desired: OzDesiredBehaviorTag[], undesired: OzUndesiredBehaviorTag[]): OzTurnEvaluation["score"] {
  if (undesired.includes("ROLE_RECOMMENDATION_DRIFT") || undesired.includes("PREMATURE_PROFILE_OUTPUT")) return -2;
  if (undesired.includes("QUESTION_STACK") && undesired.length > 1) return -3;
  if (undesired.includes("QUESTION_STACK") || undesired.includes("ADVICE_DRIFT") || undesired.includes("DISCOVERY_CUTOFF")) return -2;
  if (undesired.length > 0) return -1;
  if (desired.length >= 3) return 2;
  if (desired.length > 0) return 1;
  return 0;
}

function qualityBand(score: number, assistantTurns: number, undesired: Record<OzUndesiredBehaviorTag, number>): OzQualityBand {
  if (undesired.PREMATURE_PROFILE_OUTPUT > 0 || undesired.ROLE_RECOMMENDATION_DRIFT > 1) return "failed-founder-feel-test";
  if (undesired.QUESTION_STACK > 1 || undesired.DISCOVERY_CUTOFF > 0) return "degraded";
  const average = assistantTurns > 0 ? score / assistantTurns : 0;
  if (average >= 1.4) return "excellent";
  if (average >= 0.7) return "good";
  if (average >= 0) return "watch";
  return "degraded";
}

function recommendation(report: {
  qualityBand: OzQualityBand;
  undesiredBehaviorDetections: Record<OzUndesiredBehaviorTag, number>;
}) {
  if (report.undesiredBehaviorDetections.QUESTION_STACK > 0) {
    return "Add or test guardrails that keep assistant turns to one major question.";
  }
  if (report.undesiredBehaviorDetections.ROLE_RECOMMENDATION_DRIFT > 0 || report.undesiredBehaviorDetections.ADVICE_DRIFT > 0) {
    return "Test discovery turns that maintain curiosity instead of moving into advice or role recommendations.";
  }
  if (report.undesiredBehaviorDetections.OVERCONTROLLED_OR_NERFED_FEEL > 0) {
    return "Test warmer, higher-signal movement while preserving the protected discovery boundary.";
  }
  if (report.qualityBand === "excellent" || report.qualityBand === "good") {
    return "Add more edge-case transcripts, especially participant redirects and ambiguous answers.";
  }
  return "Review low-scoring assistant turns and add one targeted regression transcript.";
}

export function evaluateOzConversation(
  input: OzConversationInput,
  options: { createdAt?: string; evaluationId?: string } = {}
): OzEvaluationReport {
  const desiredCounts = emptyDesiredCounts();
  const undesiredCounts = emptyUndesiredCounts();
  const notableExamples: OzNotableExample[] = [];
  const perTurnScores: OzTurnEvaluation[] = [];

  input.turns.forEach((turn, turnIndex) => {
    if (turn.role === "user" && REDIRECT.test(turn.content)) {
      const followed = participantRedirectFollowed(input.turns, turnIndex);
      if (followed) {
        const nextAssistant = getNextTurn(input.turns, turnIndex, "assistant");
        if (nextAssistant) addExample(notableExamples, nextAssistant.index, "PARTICIPANT_AUTHORITY_RESPECTED", nextAssistant.turn.content);
      }
    }

    if (turn.role !== "assistant") {
      perTurnScores.push({ turnIndex, role: turn.role, score: 0, desired: [], undesired: [], notes: [] });
      return;
    }

    const desired: OzDesiredBehaviorTag[] = [];
    const undesired: OzUndesiredBehaviorTag[] = [];
    const notes: string[] = [];
    const previousParticipant = getPreviousTurn(input.turns, turnIndex, "user");
    const questionCount = countMajorQuestions(turn.content);
    const grounded = hasGrounding(previousParticipant, turn.content);
    const hasReflection = REFLECTION.test(turn.content);
    const hasSynthesis = SYNTHESIS.test(turn.content);

    if (questionCount === 1) desired.push("ASK_SINGLE");
    if (questionCount > 1) undesired.push("QUESTION_STACK");
    if (hasReflection) desired.push("REFLECT_UNDERSTANDING");
    if (hasSynthesis) desired.push("SYNTHESIS");
    if (grounded && questionCount > 0) desired.push("GROUNDED_FOLLOWUP");
    if (grounded && REDIRECT.test(previousParticipant?.content ?? "")) desired.push("RELATED_REDIRECT", "PARTICIPANT_AUTHORITY_RESPECTED");
    if (hasReflection && hasSynthesis && !looksLikeMirrorOnly(previousParticipant, turn.content)) desired.push("MEANING_OVER_MIRRORING");
    if (questionCount <= 1 && turn.content.length < 420) desired.push("PACE_CONTROL");
    if (grounded && (hasReflection || hasSynthesis) && questionCount <= 1) desired.push("NATURAL_MOVEMENT", "ALIVE_DISCOVERY_FEEL");

    if (ROLE_RECOMMENDATION.test(turn.content)) undesired.push("ROLE_RECOMMENDATION_DRIFT", "PREMATURE_EVALUATION");
    if (ADVICE.test(turn.content)) undesired.push("ADVICE_DRIFT");
    if (PROFILE_OUTPUT.test(turn.content)) undesired.push("PREMATURE_PROFILE_OUTPUT");
    if (CUTOFF.test(turn.content)) undesired.push("DISCOVERY_CUTOFF");
    if (SCRIPTED.test(turn.content)) undesired.push("SCRIPTED_INTAKE_FEEL");
    if (OVERCONTROLLED.test(turn.content) || (SCRIPTED.test(turn.content) && !hasSynthesis)) undesired.push("OVERCONTROLLED_OR_NERFED_FEEL");
    if (UNSUPPORTED.test(turn.content)) undesired.push("UNSUPPORTED_INFERENCE");
    if (looksLikeMirrorOnly(previousParticipant, turn.content)) undesired.push("MIRROR_ONLY");
    if (detectLooping(input.turns, turnIndex)) undesired.push("LOOPING_OR_BEATING_DEAD_HORSE");
    if (REDIRECT.test(previousParticipant?.content ?? "") && !grounded) undesired.push("PARTICIPANT_REDIRECT_IGNORED");

    desired.forEach((tag) => {
      desiredCounts[tag] += 1;
      addExample(notableExamples, turnIndex, tag, turn.content);
    });
    undesired.forEach((tag) => {
      undesiredCounts[tag] += 1;
      addExample(notableExamples, turnIndex, tag, turn.content);
    });
    if (questionCount > 1) notes.push(`Detected ${questionCount} major questions in one assistant turn.`);
    if (grounded) notes.push("Assistant turn reused concrete context from the previous participant turn.");

    perTurnScores.push({
      turnIndex,
      role: turn.role,
      score: scoreTurn(desired, undesired),
      desired: [...new Set(desired)],
      undesired: [...new Set(undesired)],
      notes,
    });
  });

  const aggregateBehaviorScore = perTurnScores.reduce((sum, turn) => sum + turn.score, 0);
  const assistantTurns = input.turns.filter((turn) => turn.role === "assistant").length;
  const band = qualityBand(aggregateBehaviorScore, assistantTurns, undesiredCounts);
  const regressionWarnings = UNDESIRED_TAGS
    .filter((tag) => undesiredCounts[tag] > 0)
    .map((tag) => `${tag}: ${undesiredCounts[tag]} detection${undesiredCounts[tag] === 1 ? "" : "s"}`);

  return {
    evaluationId: options.evaluationId ?? `oz-${Date.now().toString(36)}`,
    createdAt: options.createdAt ?? new Date().toISOString(),
    sessionId: input.sessionId,
    model: input.model,
    discoveryModeId: input.discoveryModeId,
    totalTurns: input.turns.length,
    assistantTurns,
    participantTurns: input.turns.filter((turn) => turn.role === "user").length,
    desiredBehaviorDetections: desiredCounts,
    undesiredBehaviorDetections: undesiredCounts,
    perTurnScores,
    aggregateBehaviorScore,
    qualityBand: band,
    notableExamples,
    regressionWarnings,
    recommendationForNextChangeOrTest: recommendation({
      qualityBand: band,
      undesiredBehaviorDetections: undesiredCounts,
    }),
  };
}
