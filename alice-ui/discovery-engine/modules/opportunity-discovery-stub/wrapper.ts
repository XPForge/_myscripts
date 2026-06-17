import type { VisibilityScope } from "../../core/types";

export const opportunityDiscoveryStubModuleId = "opportunity-discovery-stub";
export const opportunityDiscoveryStubSchemaVersion = "0.1.0";
export const opportunityDiscoveryStubAlignmentRegistryId = "lighthouse.initial-alignment";

export type OpportunityDiscoveryArtifactType =
  | "opportunity_reality_snapshot"
  | "opportunity_alignment_input"
  | "role_conditions_brief"
  | "opportunity_risk_notes";

export type OpportunityDiscoveryInputMode = "text" | "imported_text" | "structured_note";

export type OpportunityDiscoveryStubWrapper = {
  moduleId: typeof opportunityDiscoveryStubModuleId;
  moduleName: string;
  schemaVersion: typeof opportunityDiscoveryStubSchemaVersion;
  supportedArtifactTypes: OpportunityDiscoveryArtifactType[];
  alignmentRegistryId: string;
  promptRefs: string[];
  policyRefs: string[];
  allowedInputModes: OpportunityDiscoveryInputMode[];
  outputConstraints: string[];
  defaultVisibilityRules: Partial<Record<OpportunityDiscoveryArtifactType, VisibilityScope>>;
  resolutionReadinessRuleRefs: string[];
};

export const opportunityDiscoveryStubWrapper: OpportunityDiscoveryStubWrapper = {
  moduleId: opportunityDiscoveryStubModuleId,
  moduleName: "Opportunity Discovery Stub",
  schemaVersion: opportunityDiscoveryStubSchemaVersion,
  supportedArtifactTypes: [
    "opportunity_reality_snapshot",
    "opportunity_alignment_input",
    "role_conditions_brief",
    "opportunity_risk_notes",
  ],
  alignmentRegistryId: opportunityDiscoveryStubAlignmentRegistryId,
  promptRefs: [
    "opportunity-discovery.discovery-agent.v1",
    "opportunity-discovery.artifact-synthesis.v1",
  ],
  policyRefs: [
    "opportunity-discovery.output-boundaries.v1",
    "opportunity-discovery.evidence-requirements.v1",
  ],
  allowedInputModes: ["text", "imported_text", "structured_note"],
  outputConstraints: [
    "Use source-backed observations.",
    "Separate stated claims from inferred operating reality.",
    "Preserve uncertainty and source ambiguity.",
    "Avoid converting alignment into a score.",
  ],
  defaultVisibilityRules: {
    opportunity_reality_snapshot: "artifact_eligible",
    opportunity_alignment_input: "restricted",
    role_conditions_brief: "artifact_eligible",
    opportunity_risk_notes: "module_only",
  },
  resolutionReadinessRuleRefs: [
    "opportunity-discovery.readiness.snapshot.v1",
    "opportunity-discovery.readiness.alignment-input.v1",
    "opportunity-discovery.readiness.conditions-brief.v1",
    "opportunity-discovery.readiness.risk-notes.v1",
  ],
};
