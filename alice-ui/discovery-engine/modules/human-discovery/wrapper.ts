import type { VisibilityScope } from "../../core/types";

export const humanDiscoveryModuleId = "human-discovery";
export const humanDiscoverySchemaVersion = "0.1.0";
export const humanDiscoveryAlignmentRegistryId = "lighthouse.initial-alignment";

export type HumanDiscoveryArtifactType =
  | "human_clarity_profile"
  | "human_capability_brief"
  | "private_reflection_summary"
  | "alignment_input_brief";

export type HumanDiscoveryInputMode = "text" | "imported_text" | "structured_note";

export type HumanDiscoveryWrapper = {
  moduleId: typeof humanDiscoveryModuleId;
  moduleName: string;
  schemaVersion: typeof humanDiscoverySchemaVersion;
  supportedArtifactTypes: HumanDiscoveryArtifactType[];
  alignmentRegistryId: string;
  promptRefs: string[];
  policyRefs: string[];
  allowedInputModes: HumanDiscoveryInputMode[];
  outputConstraints: string[];
  defaultVisibilityRules: Partial<Record<HumanDiscoveryArtifactType, VisibilityScope>>;
  resolutionReadinessRuleRefs: string[];
};

export const humanDiscoveryWrapper: HumanDiscoveryWrapper = {
  moduleId: humanDiscoveryModuleId,
  moduleName: "Human Discovery",
  schemaVersion: humanDiscoverySchemaVersion,
  supportedArtifactTypes: [
    "human_clarity_profile",
    "human_capability_brief",
    "private_reflection_summary",
    "alignment_input_brief",
  ],
  alignmentRegistryId: humanDiscoveryAlignmentRegistryId,
  promptRefs: [
    "human-discovery.discovery-agent.v1",
    "human-discovery.artifact-synthesis.v1",
  ],
  policyRefs: [
    "human-discovery.output-boundaries.v1",
    "human-discovery.evidence-requirements.v1",
  ],
  allowedInputModes: ["text", "imported_text", "structured_note"],
  outputConstraints: [
    "Use evidence-linked synthesis.",
    "Separate observation from inference.",
    "Keep unresolved uncertainty visible.",
    "Avoid evaluative ranking language.",
  ],
  defaultVisibilityRules: {
    human_clarity_profile: "artifact_eligible",
    human_capability_brief: "artifact_eligible",
    private_reflection_summary: "source_visible",
    alignment_input_brief: "restricted",
  },
  resolutionReadinessRuleRefs: [
    "human-discovery.readiness.profile.v1",
    "human-discovery.readiness.brief.v1",
    "human-discovery.readiness.reflection.v1",
    "human-discovery.readiness.alignment-input.v1",
  ],
};
