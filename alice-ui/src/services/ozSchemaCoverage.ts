import type { OzDiscoveryCapture, OzSchemaArea, OzSchemaAreaMapping } from "../oz/ozDiscoveryCaptureTypes";

// Coverage/readiness scoring driven by the Oz Discovery Capture Wrapper's AI
// classification (schemaAreaMappings) instead of keyword matching against the
// raw transcript. Oz already re-analyzes the full transcript-so-far after
// every turn, so `capture` here reflects cumulative conversation coverage,
// not just the latest exchange.

export const OZ_SCHEMA_AREAS: OzSchemaArea[] = [
  "capabilities",
  "constraints",
  "preferences",
  "motivations",
  "environment_fit",
  "relationships",
  "values",
  "decision_making",
  "uncertainty",
  "other",
];

export const OZ_SCHEMA_AREA_LABELS: Record<OzSchemaArea, string> = {
  capabilities: "What they're capable of",
  constraints: "What limits or constrains them",
  preferences: "How they like to work",
  motivations: "What motivates them",
  environment_fit: "The environments where they fit best",
  relationships: "How they relate to and work with others",
  values: "What matters most to them",
  decision_making: "How they make decisions",
  uncertainty: "What's still uncertain or unconfirmed",
  other: "Other notable observations",
};

export type OzSchemaFieldStatus = "empty" | "touched" | "filled";

export type OzSchemaFieldCoverage = {
  field: OzSchemaArea;
  label: string;
  status: OzSchemaFieldStatus;
  matchCount: number;
};

export type OzSchemaCoverageReport = {
  fields: OzSchemaFieldCoverage[];
  totalFields: number;
  filledCount: number;
  touchedCount: number;
  emptyCount: number;
  coveragePercentage: number;
  profileReadinessPercentage: number;
  readinessUnlocked: boolean;
};

// Estimates, not measured values — the old keyword thresholds needed
// recalibrating once already after real usage showed them miscalibrated.
// Expect these to need the same treatment once there's real Oz output to
// look at. Raised slightly versus the old 20/70/4 because with only 10 broad
// categories (vs. 16 narrow ones) a couple of early exchanges can plausibly
// push several categories to "touched" almost immediately, and each category
// is now worth more of the total (10 points vs. ~6.25).
const READINESS_START_THRESHOLD = 30;
const READINESS_FULL_THRESHOLD = 75;
const MINIMUM_PARTICIPANT_TURNS_FOR_READINESS = 5;

function aggregateMapping(
  capture: OzDiscoveryCapture | null,
  area: OzSchemaArea
): { evidenceItemIds: string[]; possibleSignalIds: string[]; notes: string[] } {
  const matches: OzSchemaAreaMapping[] = (capture?.schemaAreaMappings ?? []).filter(
    (mapping) => mapping.schemaArea === area
  );
  return {
    evidenceItemIds: [...new Set(matches.flatMap((mapping) => mapping.evidenceItemIds ?? []))],
    possibleSignalIds: [...new Set(matches.flatMap((mapping) => mapping.possibleSignalIds ?? []))],
    notes: matches.flatMap((mapping) => mapping.notes ?? []),
  };
}

// Oz's own instructions describe per-area evidenceItemIds as "rough tokens,
// not required to resolve to real evidence ids" (see api/oz-capture.js) --
// a single one is a loose signal, not resolved depth. Requiring a second
// corroborating token before calling a category "filled" was added after
// real usage showed categories reaching "filled" within the first couple of
// exchanges, well before there was any real depth behind them.
const MINIMUM_EVIDENCE_FOR_FILLED = 2;

function statusFromAggregate(evidenceCount: number, signalCount: number, noteCount: number): OzSchemaFieldStatus {
  if (evidenceCount >= MINIMUM_EVIDENCE_FOR_FILLED) return "filled";
  if (evidenceCount > 0 || signalCount > 0 || noteCount > 0) return "touched";
  return "empty";
}

export function computeOzSchemaCoverage(
  capture: OzDiscoveryCapture | null,
  participantTurnCount: number
): OzSchemaCoverageReport {
  const fields: OzSchemaFieldCoverage[] = OZ_SCHEMA_AREAS.map((area) => {
    const { evidenceItemIds, possibleSignalIds, notes } = aggregateMapping(capture, area);
    return {
      field: area,
      label: OZ_SCHEMA_AREA_LABELS[area],
      status: statusFromAggregate(evidenceItemIds.length, possibleSignalIds.length, notes.length),
      matchCount: evidenceItemIds.length + possibleSignalIds.length + notes.length,
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
