import type { AlignmentObservation } from "../alignmentObservation";
import { compareAlignmentObservationSets } from "./alignmentComparison";
import type {
  AlignmentProofCheck,
  AlignmentProofResult,
} from "./alignmentTypes";

function check(
  id: string,
  passed: boolean,
  message: string,
  metadata?: Record<string, unknown>
): AlignmentProofCheck {
  return { id, passed, message, metadata };
}

export function proveAlignmentObservationCompatibility(
  firstSet: AlignmentObservation[],
  secondSet: AlignmentObservation[]
): AlignmentProofResult {
  const signals = compareAlignmentObservationSets(firstSet, secondSet);
  const signalTypes = new Set(signals.map((signal) => signal.signalType));
  const checks: AlignmentProofCheck[] = [
    check(
      "alignment.signal.shared_dimension",
      signalTypes.has("shared_dimension"),
      "At least one shared alignment dimension signal was detected."
    ),
    check(
      "alignment.signal.complementary_polarity",
      signalTypes.has("complementary_polarity"),
      "At least one complementary polarity signal was detected."
    ),
  ];

  return {
    passed: checks.every((item) => item.passed),
    signals,
    checks,
  };
}
