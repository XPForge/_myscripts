import type {
  ArtifactPurpose,
  ConfidenceLevel,
  ObservationType,
  VisibilityScope,
} from "../../core/types";
import type { HumanDiscoveryArtifactType } from "./wrapper";

export type HumanArtifactTemplate = {
  artifactType: HumanDiscoveryArtifactType;
  artifactPurpose: ArtifactPurpose;
  version: string;
  defaultVisibility: VisibilityScope;
  requiredEvidenceLevel: ConfidenceLevel;
  sourceObservationTypes: ObservationType[];
  outputConstraints: string[];
};

export const humanDiscoveryArtifactTemplates: HumanArtifactTemplate[] = [
  {
    artifactType: "human_clarity_profile",
    artifactPurpose: "synthesis",
    version: "0.1.0",
    defaultVisibility: "artifact_eligible",
    requiredEvidenceLevel: "moderate",
    sourceObservationTypes: ["statement", "pattern", "uncertainty", "confirmation"],
    outputConstraints: [
      "Use evidence-linked synthesis.",
      "Preserve uncertainty where evidence is incomplete.",
      "Avoid ranking, diagnosis, or credential language.",
    ],
  },
  {
    artifactType: "human_capability_brief",
    artifactPurpose: "presentation",
    version: "0.1.0",
    defaultVisibility: "artifact_eligible",
    requiredEvidenceLevel: "moderate",
    sourceObservationTypes: ["pattern", "confirmation"],
    outputConstraints: [
      "Summarize capability patterns without flattening nuance.",
      "Retain evidence references for each major claim.",
    ],
  },
  {
    artifactType: "private_reflection_summary",
    artifactPurpose: "reflection",
    version: "0.1.0",
    defaultVisibility: "source_visible",
    requiredEvidenceLevel: "low",
    sourceObservationTypes: ["statement", "pattern", "uncertainty"],
    outputConstraints: [
      "Use reflective language.",
      "Keep unconfirmed observations clearly marked.",
    ],
  },
  {
    artifactType: "alignment_input_brief",
    artifactPurpose: "transfer",
    version: "0.1.0",
    defaultVisibility: "restricted",
    requiredEvidenceLevel: "high",
    sourceObservationTypes: ["pattern", "confirmation", "contradiction"],
    outputConstraints: [
      "Emit alignment-ready observations using registry dimension ids.",
      "Do not convert alignment into a score.",
    ],
  },
];

export function getHumanArtifactTemplate(
  artifactType: HumanDiscoveryArtifactType
): HumanArtifactTemplate | undefined {
  return humanDiscoveryArtifactTemplates.find(
    (template) => template.artifactType === artifactType
  );
}
