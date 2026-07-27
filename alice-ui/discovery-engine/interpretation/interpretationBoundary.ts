export type DisallowedInterpretationOutput =
  | "score"
  | "match"
  | "rank"
  | "recommendation"
  | "percentage"
  | "qualification_judgment"
  | "fit_conclusion"
  | "profile_generation"
  | "artifact_generation"
  | "unsupported_claim_without_evidence"
  | "protected_prompt_exposure"
  | "identity_conclusion"
  | "personality_label"
  | "role_suitability_conclusion";

export type InterpretationBoundaryPolicy = {
  id: string;
  name: string;
  disallowedOutputs: DisallowedInterpretationOutput[];
  requiresEvidenceLinks: boolean;
  preservesUncertainty: boolean;
  exposesProtectedPromptBodies: false;
  allowsLiveInterpretation: false;
  metadata?: Record<string, unknown>;
};

export type InterpretationBoundaryViolation = {
  id: string;
  requestId?: string;
  resultId?: string;
  violationType: DisallowedInterpretationOutput;
  message: string;
  evidenceReferenceIds?: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export const defaultInterpretationBoundaryPolicy: InterpretationBoundaryPolicy = {
  id: "default_interpretation_boundary_policy",
  name: "Default Interpretation Boundary Policy",
  disallowedOutputs: [
    "score",
    "match",
    "rank",
    "recommendation",
    "percentage",
    "qualification_judgment",
    "fit_conclusion",
    "profile_generation",
    "artifact_generation",
    "unsupported_claim_without_evidence",
    "protected_prompt_exposure",
    "identity_conclusion",
    "personality_label",
    "role_suitability_conclusion",
  ],
  requiresEvidenceLinks: true,
  preservesUncertainty: true,
  exposesProtectedPromptBodies: false,
  allowsLiveInterpretation: false,
};
