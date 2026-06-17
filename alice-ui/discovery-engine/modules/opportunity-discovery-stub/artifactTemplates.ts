import type {
  ArtifactPurpose,
  ConfidenceLevel,
  ObservationType,
  VisibilityScope,
} from "../../core/types";
import type { OpportunityDiscoveryArtifactType } from "./wrapper";

export type OpportunityArtifactTemplate = {
  artifactType: OpportunityDiscoveryArtifactType;
  artifactPurpose: ArtifactPurpose;
  version: string;
  defaultVisibility: VisibilityScope;
  requiredEvidenceLevel: ConfidenceLevel;
  sourceObservationTypes: ObservationType[];
  outputConstraints: string[];
};

export const opportunityDiscoveryArtifactTemplates: OpportunityArtifactTemplate[] = [
  {
    artifactType: "opportunity_reality_snapshot",
    artifactPurpose: "synthesis",
    version: "0.1.0",
    defaultVisibility: "artifact_eligible",
    requiredEvidenceLevel: "moderate",
    sourceObservationTypes: ["statement", "pattern", "uncertainty", "confirmation"],
    outputConstraints: [
      "Separate stated claims from inferred operating reality.",
      "Preserve source ambiguity.",
      "Use evidence references for each major condition.",
    ],
  },
  {
    artifactType: "opportunity_alignment_input",
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
  {
    artifactType: "role_conditions_brief",
    artifactPurpose: "presentation",
    version: "0.1.0",
    defaultVisibility: "artifact_eligible",
    requiredEvidenceLevel: "moderate",
    sourceObservationTypes: ["statement", "pattern", "confirmation"],
    outputConstraints: [
      "Summarize operating conditions without implying certainty beyond evidence.",
      "Keep hidden constraints visible when supported.",
    ],
  },
  {
    artifactType: "opportunity_risk_notes",
    artifactPurpose: "reflection",
    version: "0.1.0",
    defaultVisibility: "module_only",
    requiredEvidenceLevel: "low",
    sourceObservationTypes: ["uncertainty", "contradiction", "pattern"],
    outputConstraints: [
      "Flag risks as hypotheses unless confirmed.",
      "Keep evidence gaps visible.",
    ],
  },
];

export function getOpportunityArtifactTemplate(
  artifactType: OpportunityDiscoveryArtifactType
): OpportunityArtifactTemplate | undefined {
  return opportunityDiscoveryArtifactTemplates.find(
    (template) => template.artifactType === artifactType
  );
}
