import { createAlignmentObservation } from "../../alignment/alignmentObservation";
import type { EvidenceReference, SourceIdentity } from "../../core/types";
import type { OpportunityDiscoverySchema } from "./schema";
import {
  opportunityDiscoveryStubModuleId,
  opportunityDiscoveryStubSchemaVersion,
} from "./wrapper";

export const sampleOpportunitySourceIdentity: SourceIdentity = {
  id: "source-opportunity-demo",
  role: "secondary_source",
  label: "Demo source document",
  subjectType: "source",
};

export const sampleOpportunityEvidenceReference: EvidenceReference = {
  id: "evidence-opportunity-demo-1",
  workspaceId: "workspace-opportunity-demo",
  sessionId: "session-opportunity-demo",
  turnId: "turn-opportunity-demo-1",
  sourceId: sampleOpportunitySourceIdentity.id,
  quote: "The role requires diagnosing workflow failures across several teams.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export const sampleOpportunityDiscoverySchema: OpportunityDiscoverySchema = {
  schemaVersion: opportunityDiscoveryStubSchemaVersion,
  sourceIdentities: [sampleOpportunitySourceIdentity],
  workToBeDone: [
    {
      id: "opportunity-observation-demo-1",
      area: "work_to_be_done",
      label: "Workflow diagnosis",
      summary: "The opportunity centers on diagnosing cross-system workflow failures.",
      evidenceItems: [
        {
          id: "opportunity-evidence-item-demo-1",
          summary: "Source describes diagnosing workflow failures across teams.",
          evidenceRefs: [sampleOpportunityEvidenceReference],
          sourceIdentity: sampleOpportunitySourceIdentity,
          confirmationStatus: "partially_confirmed",
        },
      ],
      confirmationStatus: "partially_confirmed",
      alignmentDimensionIds: ["capability_to_work"],
    },
  ],
  successConditions: [],
  failureConditions: [],
  operatingReality: [],
  decisionRights: [],
  autonomyLevel: [],
  ambiguityLevel: [],
  paceAndPressure: [],
  communicationExpectations: [],
  collaborationPattern: [],
  creativityTolerance: [],
  constraints: [],
  hiddenRisks: [],
  growthPath: [],
  evaluationStyle: [],
  missionReality: [],
  rewardStructure: [],
  uncertaintyNotes: [],
};

export const sampleOpportunityAlignmentObservation = createAlignmentObservation({
  workspaceId: "workspace-opportunity-demo",
  moduleId: opportunityDiscoveryStubModuleId,
  schemaVersion: opportunityDiscoveryStubSchemaVersion,
  domainTags: ["opportunity", "work-to-be-done"],
  alignmentDimensions: ["capability_to_work"],
  polarity: "requires",
  evidenceRefs: [sampleOpportunityEvidenceReference],
  confirmationStatus: "partially_confirmed",
  sourceIdentity: sampleOpportunitySourceIdentity,
});
