import type { EvidenceReference } from "../../core/types";

export type AlignmentSignalType =
  | "shared_dimension"
  | "complementary_polarity"
  | "possible_tension"
  | "missing_counterpart"
  | "contradiction_signal"
  | "evidence_gap"
  | "uncertain";

export type AlignmentSignal = {
  id: string;
  signalType: AlignmentSignalType;
  dimensionId: string;
  sourceObservationIds: string[];
  moduleIds: string[];
  summary: string;
  confidence?: "unknown" | "low" | "moderate" | "high";
  evidenceRefs?: EvidenceReference[];
  metadata?: Record<string, unknown>;
};

export type AlignmentProofCheck = {
  id: string;
  passed: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

export type AlignmentProofResult = {
  passed: boolean;
  signals: AlignmentSignal[];
  checks: AlignmentProofCheck[];
};
