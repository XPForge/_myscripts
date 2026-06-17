import type { AlignmentObservation } from "../alignmentObservation";
import {
  createAlignmentSignal,
  getPolarityRelationship,
} from "./alignmentSignals";
import type { AlignmentSignal } from "./alignmentTypes";

function sharedDimensions(
  first: AlignmentObservation,
  second: AlignmentObservation
): string[] {
  return first.alignmentDimensions.filter((dimension) =>
    second.alignmentDimensions.includes(dimension)
  );
}

function hasEvidenceGap(observation: AlignmentObservation): boolean {
  return observation.evidenceRefs.length === 0;
}

function isUncertain(observation: AlignmentObservation): boolean {
  return (
    observation.confirmationStatus === "unconfirmed" ||
    observation.confirmationStatus === "partially_confirmed" ||
    observation.confirmationStatus === "disputed"
  );
}

function isContradicted(observation: AlignmentObservation): boolean {
  return observation.confirmationStatus === "contradicted";
}

export function compareAlignmentObservations(
  first: AlignmentObservation,
  second: AlignmentObservation
): AlignmentSignal[] {
  const signals: AlignmentSignal[] = [];
  const dimensions = sharedDimensions(first, second);

  for (const dimensionId of dimensions) {
    signals.push(
      createAlignmentSignal({
        signalType: "shared_dimension",
        dimensionId,
        observations: [first, second],
        summary: `Both observations reference ${dimensionId}.`,
        confidence: "moderate",
      })
    );

    const relationship = getPolarityRelationship(first.polarity, second.polarity);
    if (relationship === "complementary") {
      signals.push(
        createAlignmentSignal({
          signalType: "complementary_polarity",
          dimensionId,
          observations: [first, second],
          summary: `${first.polarity} and ${second.polarity} are complementary polarity metadata for ${dimensionId}.`,
          confidence: "moderate",
        })
      );
    }
    if (relationship === "tension") {
      signals.push(
        createAlignmentSignal({
          signalType: "possible_tension",
          dimensionId,
          observations: [first, second],
          summary: `${first.polarity} and ${second.polarity} may indicate polarity tension for ${dimensionId}.`,
          confidence: "low",
        })
      );
    }
  }

  for (const observation of [first, second]) {
    for (const dimensionId of observation.alignmentDimensions) {
      if (hasEvidenceGap(observation)) {
        signals.push(
          createAlignmentSignal({
            signalType: "evidence_gap",
            dimensionId,
            observations: [observation],
            summary: `Observation ${observation.id} has no evidence references for ${dimensionId}.`,
            confidence: "low",
          })
        );
      }
      if (isContradicted(observation)) {
        signals.push(
          createAlignmentSignal({
            signalType: "contradiction_signal",
            dimensionId,
            observations: [observation],
            summary: `Observation ${observation.id} is marked contradicted for ${dimensionId}.`,
            confidence: "moderate",
          })
        );
      } else if (isUncertain(observation)) {
        signals.push(
          createAlignmentSignal({
            signalType: "uncertain",
            dimensionId,
            observations: [observation],
            summary: `Observation ${observation.id} is not fully confirmed for ${dimensionId}.`,
            confidence: "low",
          })
        );
      }
    }
  }

  return signals;
}

export function compareAlignmentObservationSets(
  firstSet: AlignmentObservation[],
  secondSet: AlignmentObservation[]
): AlignmentSignal[] {
  const signals: AlignmentSignal[] = [];
  const secondDimensions = new Set(
    secondSet.flatMap((observation) => observation.alignmentDimensions)
  );
  const firstDimensions = new Set(
    firstSet.flatMap((observation) => observation.alignmentDimensions)
  );

  for (const first of firstSet) {
    for (const second of secondSet) {
      signals.push(...compareAlignmentObservations(first, second));
    }
  }

  for (const observation of firstSet) {
    for (const dimensionId of observation.alignmentDimensions) {
      if (!secondDimensions.has(dimensionId)) {
        signals.push(
          createAlignmentSignal({
            signalType: "missing_counterpart",
            dimensionId,
            observations: [observation],
            summary: `No counterpart observation was provided for ${dimensionId}.`,
            confidence: "unknown",
          })
        );
      }
    }
  }

  for (const observation of secondSet) {
    for (const dimensionId of observation.alignmentDimensions) {
      if (!firstDimensions.has(dimensionId)) {
        signals.push(
          createAlignmentSignal({
            signalType: "missing_counterpart",
            dimensionId,
            observations: [observation],
            summary: `No counterpart observation was provided for ${dimensionId}.`,
            confidence: "unknown",
          })
        );
      }
    }
  }

  return signals;
}
