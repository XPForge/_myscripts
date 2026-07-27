import { DISCOVERY_FIELD_KEYS, type DiscoveryFieldKey } from "./lighthouseProfile";

// Deterministic, keyword-based transcript scan. No LLM call, no live-session
// side effects — this exists purely to drive progress UI and the
// finish/continue checkpoint. It never feeds back into Alice's instructions.

export type SchemaFieldStatus = "empty" | "touched" | "filled";

export type SchemaFieldCoverage = {
  field: DiscoveryFieldKey;
  label: string;
  status: SchemaFieldStatus;
  matchCount: number;
};

export type SchemaCoverageReport = {
  fields: SchemaFieldCoverage[];
  totalFields: number;
  filledCount: number;
  touchedCount: number;
  emptyCount: number;
  coveragePercentage: number;
  profileReadinessPercentage: number;
  readinessUnlocked: boolean;
};

export const DISCOVERY_FIELD_LABELS: Record<DiscoveryFieldKey, string> = {
  workMotivators: "What motivates their work",
  workFrustrators: "What frustrates or drains them",
  learningCharacteristics: "How they learn",
  problemSolvingCharacteristics: "How they solve problems",
  communicationCharacteristics: "How they communicate",
  leadershipCharacteristics: "How they lead",
  collaborationCharacteristics: "How they collaborate",
  environmentalAccelerators: "Environments that help them thrive",
  environmentalInhibitors: "Environments that hold them back",
  adaptabilityCharacteristics: "How they adapt to change",
  pressureResponse: "How they respond under pressure",
  opportunityIndicators: "What opportunities interest them",
  overlookedCharacteristics: "Strengths that get overlooked",
  supportingEvidence: "Concrete examples and evidence",
  emergentDiscoveries: "New things surfacing in conversation",
  notYetDiscovered: "What's still unexplored",
};

// Rough, human-authored keyword sets. This is a heuristic, not NLP — it
// exists to give an approximate progress signal, not a precise classification.
const FIELD_KEYWORDS: Record<DiscoveryFieldKey, string[]> = {
  workMotivators: ["motivat", "excites me", "energizes me", "love doing", "matters to me", "fulfilling", "drives me", "purpose"],
  workFrustrators: ["frustrat", "drains me", "i hate", "i dislike", "bothers me", "tedious", "annoys me", "exhausting"],
  learningCharacteristics: ["i learn best", "learning style", "pick up", "when i study", "i practice", "understand something new"],
  problemSolvingCharacteristics: ["solve", "a problem", "figure out", "troubleshoot", "debug", "my approach"],
  communicationCharacteristics: ["communicat", "i explain", "i talk", "i write", "i present", "i listen"],
  leadershipCharacteristics: ["i lead", "leadership", "i manage", "i mentor", "i guide", "in charge"],
  collaborationCharacteristics: ["as a team", "collaborat", "work with others", "group project", "partner with"],
  environmentalAccelerators: ["i thrive", "energized by", "works well when", "helps me when", "environment where"],
  environmentalInhibitors: ["i struggle when", "drained by", "hurts when", "distract", "environment where i don't"],
  adaptabilityCharacteristics: ["adapt", "when things change", "flexible", "pivot", "adjust"],
  pressureResponse: ["under pressure", "stress", "deadline", "high stakes", "crunch time"],
  opportunityIndicators: ["opportunity", "i'd like to", "interested in", "want to explore", "i aspire", "hope to"],
  overlookedCharacteristics: ["overlooked", "underappreciated", "people don't notice", "hidden", "nobody realizes"],
  supportingEvidence: ["for example", "for instance", "specifically", "one time", "a time when"],
  emergentDiscoveries: ["i realized", "i noticed", "i didn't expect", "surprising", "it hit me"],
  notYetDiscovered: [],
};

const READINESS_START_THRESHOLD = 35;
const READINESS_FULL_THRESHOLD = 80;
const MINIMUM_PARTICIPANT_TURNS_FOR_READINESS = 4;

function countKeywordMatches(transcript: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  return keywords.reduce((count, keyword) => (transcript.includes(keyword) ? count + 1 : count), 0);
}

function statusFromMatchCount(field: DiscoveryFieldKey, matchCount: number): SchemaFieldStatus {
  // notYetDiscovered has no keywords of its own — it's a meta-field summarizing
  // gaps rather than a topic to search for, so it's always given partial credit.
  if (FIELD_KEYWORDS[field].length === 0) return "touched";
  if (matchCount >= 2) return "filled";
  if (matchCount >= 1) return "touched";
  return "empty";
}

export function computeSchemaCoverage(
  transcript: string,
  participantTurnCount: number
): SchemaCoverageReport {
  const normalized = transcript.toLowerCase();

  const fields: SchemaFieldCoverage[] = DISCOVERY_FIELD_KEYS.map((field) => {
    const matchCount = countKeywordMatches(normalized, FIELD_KEYWORDS[field]);
    return {
      field,
      label: DISCOVERY_FIELD_LABELS[field],
      status: statusFromMatchCount(field, matchCount),
      matchCount,
    };
  });

  const filledCount = fields.filter((entry) => entry.status === "filled").length;
  const touchedCount = fields.filter((entry) => entry.status === "touched").length;
  const emptyCount = fields.filter((entry) => entry.status === "empty").length;
  const totalFields = fields.length;
  const weightedScore = filledCount + touchedCount * 0.5;
  const coveragePercentage = totalFields ? Math.round((weightedScore / totalFields) * 100) : 0;

  const profileReadinessPercentage = computeProfileReadiness(coveragePercentage, participantTurnCount);

  return {
    fields,
    totalFields,
    filledCount,
    touchedCount,
    emptyCount,
    coveragePercentage,
    profileReadinessPercentage,
    readinessUnlocked: profileReadinessPercentage >= 100,
  };
}

function computeProfileReadiness(coveragePercentage: number, participantTurnCount: number): number {
  if (participantTurnCount < MINIMUM_PARTICIPANT_TURNS_FOR_READINESS) return 0;
  if (coveragePercentage <= READINESS_START_THRESHOLD) return 0;
  if (coveragePercentage >= READINESS_FULL_THRESHOLD) return 100;
  const span = READINESS_FULL_THRESHOLD - READINESS_START_THRESHOLD;
  return Math.round(((coveragePercentage - READINESS_START_THRESHOLD) / span) * 100);
}
