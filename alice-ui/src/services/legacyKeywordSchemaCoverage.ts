import { DISCOVERY_FIELD_KEYS, type DiscoveryFieldKey } from "./lighthouseProfile";
import { DISCOVERY_FIELD_LABELS } from "./discoverySchemaTracker";

// Private copy of the original keyword-heuristic coverage calculation, kept
// only for src/components/LighthouseDiscovery.tsx (the dead `/legacy` route,
// not part of the live app — see src/App.tsx). The live Discovery flow
// (DiscoveryPage.tsx) now uses ./ozSchemaCoverage.ts instead. Do not import
// this from anything else; it exists purely so the unreachable legacy route
// keeps compiling and behaving exactly as it always did.

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

const FIELD_KEYWORDS: Record<DiscoveryFieldKey, string[]> = {
  workMotivators: ["motivat", "excites me", "energizes me", "love doing", "matters to me", "fulfilling", "drives me", "purpose", "i love", "makes me feel", "gives me energy", "i care about", "important to me", "i enjoy", "means a lot to me", "keeps me going", "lights me up", "i'm passionate"],
  workFrustrators: ["frustrat", "drains me", "i hate", "i dislike", "bothers me", "tedious", "annoys me", "exhausting", "irritat", "gets to me", "wears me down", "makes me tired", "i don't like", "burn", "sick of", "drives me crazy", "grinds my gears"],
  learningCharacteristics: ["i learn best", "learning style", "pick up", "when i study", "i practice", "understand something new", "figure things out by", "hands-on", "trial and error", "i grasp", "makes sense to me when", "i absorb", "way i learn", "i pick things up"],
  problemSolvingCharacteristics: ["solve", "a problem", "figure out", "troubleshoot", "debug", "my approach", "work through", "break it down", "step by step", "root cause", "diagnose", "isolate the issue", "tackle a", "figure it out"],
  communicationCharacteristics: ["communicat", "i explain", "i talk", "i write", "i present", "i listen", "i tell people", "i share", "keep people updated", "i ask questions", "clarify", "get my point across", "i express"],
  leadershipCharacteristics: ["i lead", "leadership", "i manage", "i mentor", "i guide", "in charge", "i've led", "i coach", "i delegate", "i take charge", "i run the team", "i oversee", "leading a team"],
  collaborationCharacteristics: ["as a team", "collaborat", "work with others", "group project", "partner with", "with my team", "we worked together", "pair with", "brainstorm together", "cross-functional", "working alongside", "teammates"],
  environmentalAccelerators: ["i thrive", "energized by", "works well when", "helps me when", "environment where", "i do my best work when", "i'm at my best when", "conditions where i excel", "flourish when", "i do well when"],
  environmentalInhibitors: ["i struggle when", "drained by", "hurts when", "distract", "environment where i don't", "i shut down when", "i don't do well when", "makes it hard for me", "i can't focus when", "i struggle with"],
  adaptabilityCharacteristics: ["adapt", "when things change", "flexible", "pivot", "adjust", "roll with it", "shift gears", "change course", "i adjust quickly", "go with the flow", "changing circumstances"],
  pressureResponse: ["under pressure", "stress", "deadline", "high stakes", "crunch time", "tight timeline", "last minute", "when it's urgent", "time crunch", "under the gun", "when things get hectic"],
  opportunityIndicators: ["opportunity", "i'd like to", "interested in", "want to explore", "i aspire", "hope to", "i want to", "i'm looking for", "next step for me", "excites me about the future", "goal of mine", "looking to grow"],
  overlookedCharacteristics: ["overlooked", "underappreciated", "people don't notice", "hidden", "nobody realizes", "people miss", "don't get credit", "behind the scenes", "underrated", "unnoticed", "don't see"],
  supportingEvidence: ["for example", "for instance", "specifically", "one time", "a time when", "like when", "such as", "case in point", "to illustrate", "here's an example", "there was this one time"],
  emergentDiscoveries: ["i realized", "i noticed", "i didn't expect", "surprising", "it hit me", "i've come to see", "i'm realizing", "looking back", "in hindsight", "it dawned on me", "i've started to notice"],
  notYetDiscovered: [],
};

const READINESS_START_THRESHOLD = 20;
const READINESS_FULL_THRESHOLD = 70;
const MINIMUM_PARTICIPANT_TURNS_FOR_READINESS = 4;

function countKeywordMatches(transcript: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  return keywords.reduce((count, keyword) => (transcript.includes(keyword) ? count + 1 : count), 0);
}

function statusFromMatchCount(field: DiscoveryFieldKey, matchCount: number): SchemaFieldStatus {
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
