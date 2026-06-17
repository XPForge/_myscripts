import type {
  ConfirmationStatus,
  EvidenceReference,
  SourceIdentity,
} from "../../core/types";
import type { AlignmentDimensionId } from "../../alignment/dimensions";

export type HumanDiscoverySchemaArea =
  | "capability_patterns"
  | "evidence_examples"
  | "operating_style"
  | "learning_pattern"
  | "communication_pattern"
  | "motivation_pattern"
  | "environment_needs"
  | "pressure_response"
  | "creative_technical_synthesis"
  | "misread_risks"
  | "growth_direction"
  | "values_pattern"
  | "uncertainty_notes";

export type HumanEvidenceExample = {
  id: string;
  summary: string;
  evidenceRefs: EvidenceReference[];
  sourceIdentity?: SourceIdentity;
  confirmationStatus: ConfirmationStatus;
  metadata?: Record<string, unknown>;
};

export type HumanDiscoveryPattern = {
  id: string;
  area: HumanDiscoverySchemaArea;
  label: string;
  summary: string;
  evidenceExamples: HumanEvidenceExample[];
  confirmationStatus: ConfirmationStatus;
  alignmentDimensionIds: AlignmentDimensionId[];
  uncertaintyNotes?: string[];
  metadata?: Record<string, unknown>;
};

export type HumanDiscoveryUncertainty = {
  id: string;
  area: HumanDiscoverySchemaArea;
  note: string;
  evidenceRefs: EvidenceReference[];
  confirmationStatus: ConfirmationStatus;
  metadata?: Record<string, unknown>;
};

export type HumanDiscoverySchema = {
  schemaVersion: string;
  sourceIdentities: SourceIdentity[];
  capabilityPatterns: HumanDiscoveryPattern[];
  evidenceExamples: HumanEvidenceExample[];
  operatingStyle: HumanDiscoveryPattern[];
  learningPattern: HumanDiscoveryPattern[];
  communicationPattern: HumanDiscoveryPattern[];
  motivationPattern: HumanDiscoveryPattern[];
  environmentNeeds: HumanDiscoveryPattern[];
  pressureResponse: HumanDiscoveryPattern[];
  creativeTechnicalSynthesis: HumanDiscoveryPattern[];
  misreadRisks: HumanDiscoveryPattern[];
  growthDirection: HumanDiscoveryPattern[];
  valuesPattern: HumanDiscoveryPattern[];
  uncertaintyNotes: HumanDiscoveryUncertainty[];
  metadata?: Record<string, unknown>;
};

export function createEmptyHumanDiscoverySchema(schemaVersion: string): HumanDiscoverySchema {
  return {
    schemaVersion,
    sourceIdentities: [],
    capabilityPatterns: [],
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
}
