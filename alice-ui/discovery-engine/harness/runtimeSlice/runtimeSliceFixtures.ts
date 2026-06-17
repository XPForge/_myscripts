import type { RuntimeSliceInput } from "./runtimeSliceTypes";

export const defaultRuntimeSliceInput: RuntimeSliceInput = {
  text: "I understand systems by tracing where they break and what the break reveals.",
  sourceLabel: "Runtime slice demo source",
  includeOpportunityFixtureProof: true,
};

export const runtimeSliceDemoObservationMetadata = {
  behavior: "demo_verification_only",
  interpretationStatus: "deterministic_sample_not_ai_interpretation",
  note: "Created by Phase 5 runtime slice to verify plumbing only.",
} as const;

export const runtimeSliceDemoAlignmentMetadata = {
  behavior: "demo_verification_only",
  dimensionId: "capability_to_work",
  polarity: "offers",
  note: "Created by Phase 5 runtime slice to verify native alignment metadata flow only.",
} as const;
