import type {
  ConfirmationStatus,
  EvidenceReference,
  SourceIdentity,
} from "../../core/types";
import type { AlignmentDimensionId } from "../../alignment/dimensions";

export type OpportunityDiscoverySchemaArea =
  | "work_to_be_done"
  | "success_conditions"
  | "failure_conditions"
  | "operating_reality"
  | "decision_rights"
  | "autonomy_level"
  | "ambiguity_level"
  | "pace_and_pressure"
  | "communication_expectations"
  | "collaboration_pattern"
  | "creativity_tolerance"
  | "constraints"
  | "hidden_risks"
  | "growth_path"
  | "evaluation_style"
  | "mission_reality"
  | "reward_structure"
  | "uncertainty_notes";

export type OpportunityEvidenceItem = {
  id: string;
  summary: string;
  evidenceRefs: EvidenceReference[];
  sourceIdentity?: SourceIdentity;
  confirmationStatus: ConfirmationStatus;
  metadata?: Record<string, unknown>;
};

export type OpportunityDiscoveryObservation = {
  id: string;
  area: OpportunityDiscoverySchemaArea;
  label: string;
  summary: string;
  evidenceItems: OpportunityEvidenceItem[];
  confirmationStatus: ConfirmationStatus;
  alignmentDimensionIds: AlignmentDimensionId[];
  uncertaintyNotes?: string[];
  metadata?: Record<string, unknown>;
};

export type OpportunityDiscoveryUncertainty = {
  id: string;
  area: OpportunityDiscoverySchemaArea;
  note: string;
  evidenceRefs: EvidenceReference[];
  confirmationStatus: ConfirmationStatus;
  metadata?: Record<string, unknown>;
};

export type OpportunityDiscoverySchema = {
  schemaVersion: string;
  sourceIdentities: SourceIdentity[];
  workToBeDone: OpportunityDiscoveryObservation[];
  successConditions: OpportunityDiscoveryObservation[];
  failureConditions: OpportunityDiscoveryObservation[];
  operatingReality: OpportunityDiscoveryObservation[];
  decisionRights: OpportunityDiscoveryObservation[];
  autonomyLevel: OpportunityDiscoveryObservation[];
  ambiguityLevel: OpportunityDiscoveryObservation[];
  paceAndPressure: OpportunityDiscoveryObservation[];
  communicationExpectations: OpportunityDiscoveryObservation[];
  collaborationPattern: OpportunityDiscoveryObservation[];
  creativityTolerance: OpportunityDiscoveryObservation[];
  constraints: OpportunityDiscoveryObservation[];
  hiddenRisks: OpportunityDiscoveryObservation[];
  growthPath: OpportunityDiscoveryObservation[];
  evaluationStyle: OpportunityDiscoveryObservation[];
  missionReality: OpportunityDiscoveryObservation[];
  rewardStructure: OpportunityDiscoveryObservation[];
  uncertaintyNotes: OpportunityDiscoveryUncertainty[];
  metadata?: Record<string, unknown>;
};

export function createEmptyOpportunityDiscoverySchema(
  schemaVersion: string
): OpportunityDiscoverySchema {
  return {
    schemaVersion,
    sourceIdentities: [],
    workToBeDone: [],
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
}
