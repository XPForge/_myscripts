import type { AlignmentObservation } from "../alignmentObservation";
import type { AlignmentPolarity } from "../polarity";
import type { EvidenceReference } from "../../core/types";
import type { AlignmentSignal, AlignmentSignalType } from "./alignmentTypes";

export type PolarityRelationship = "complementary" | "tension" | "none";

export const complementaryPolarityPairs: Array<readonly [AlignmentPolarity, AlignmentPolarity]> = [
  ["offers", "requires"],
  ["requires", "offers"],
  ["needs", "supports"],
  ["supports", "needs"],
];

export const tensionPolarityPairs: Array<readonly [AlignmentPolarity, AlignmentPolarity]> = [
  ["needs", "constrains"],
  ["constrains", "needs"],
  ["offers", "conflicts_with"],
  ["conflicts_with", "offers"],
  ["requires", "conflicts_with"],
  ["conflicts_with", "requires"],
  ["supports", "conflicts_with"],
  ["conflicts_with", "supports"],
  ["needs", "conflicts_with"],
  ["conflicts_with", "needs"],
];

export function getPolarityRelationship(
  first: AlignmentPolarity,
  second: AlignmentPolarity
): PolarityRelationship {
  if (complementaryPolarityPairs.some(([a, b]) => a === first && b === second)) {
    return "complementary";
  }
  if (tensionPolarityPairs.some(([a, b]) => a === first && b === second)) {
    return "tension";
  }
  return "none";
}

export function collectEvidenceRefs(
  observations: AlignmentObservation[]
): EvidenceReference[] {
  return observations.flatMap((observation) => observation.evidenceRefs);
}

export function createAlignmentSignal(input: {
  signalType: AlignmentSignalType;
  dimensionId: string;
  observations: AlignmentObservation[];
  summary: string;
  confidence?: AlignmentSignal["confidence"];
  evidenceRefs?: EvidenceReference[];
  metadata?: Record<string, unknown>;
}): AlignmentSignal {
  return {
    id: crypto.randomUUID(),
    signalType: input.signalType,
    dimensionId: input.dimensionId,
    sourceObservationIds: input.observations.map((observation) => observation.id),
    moduleIds: [...new Set(input.observations.map((observation) => observation.moduleId))],
    summary: input.summary,
    confidence: input.confidence,
    evidenceRefs: input.evidenceRefs ?? collectEvidenceRefs(input.observations),
    metadata: input.metadata,
  };
}
