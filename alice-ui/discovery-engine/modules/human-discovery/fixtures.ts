import { createAlignmentObservation } from "../../alignment/alignmentObservation";
import type { EvidenceReference, SourceIdentity } from "../../core/types";
import type { HumanDiscoverySchema } from "./schema";
import { humanDiscoverySchemaVersion, humanDiscoveryModuleId } from "./wrapper";

export const sampleHumanSourceIdentity: SourceIdentity = {
  id: "source-human-demo",
  role: "primary_source",
  label: "Demo source",
  subjectType: "subject",
};

export const sampleHumanEvidenceReference: EvidenceReference = {
  id: "evidence-human-demo-1",
  workspaceId: "workspace-human-demo",
  sessionId: "session-human-demo",
  turnId: "turn-human-demo-1",
  sourceId: sampleHumanSourceIdentity.id,
  quote: "I usually understand a system by tracing where it breaks.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export const sampleHumanDiscoverySchema: HumanDiscoverySchema = {
  schemaVersion: humanDiscoverySchemaVersion,
  sourceIdentities: [sampleHumanSourceIdentity],
  capabilityPatterns: [
    {
      id: "human-pattern-demo-1",
      area: "capability_patterns",
      label: "Systems tracing",
      summary: "Finds understanding by tracing failure points and relationships.",
      evidenceExamples: [
        {
          id: "human-evidence-example-demo-1",
          summary: "Described tracing a system through breakpoints.",
          evidenceRefs: [sampleHumanEvidenceReference],
          sourceIdentity: sampleHumanSourceIdentity,
          confirmationStatus: "partially_confirmed",
        },
      ],
      confirmationStatus: "partially_confirmed",
      alignmentDimensionIds: ["capability_to_work"],
    },
  ],
  evidenceExamples: [],
  operatingStyle: [],
  learningPattern: [],
  communicationPattern: [],
  motivationPattern: [],
  environmentNeeds: [],
  pressureResponse: [],
  creativeTechnicalSynthesis: [],
  misreadRisks: [],
  growthDirection: [],
  valuesPattern: [],
  uncertaintyNotes: [],
};

export const sampleHumanAlignmentObservation = createAlignmentObservation({
  workspaceId: "workspace-human-demo",
  moduleId: humanDiscoveryModuleId,
  schemaVersion: humanDiscoverySchemaVersion,
  domainTags: ["human", "capability"],
  alignmentDimensions: ["capability_to_work"],
  polarity: "offers",
  evidenceRefs: [sampleHumanEvidenceReference],
  confirmationStatus: "partially_confirmed",
  sourceIdentity: sampleHumanSourceIdentity,
});
