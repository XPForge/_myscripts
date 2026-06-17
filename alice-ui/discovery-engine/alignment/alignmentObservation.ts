import type {
  ConfirmationStatus,
  EvidenceReference,
  SourceIdentity,
} from "../core/types";
import type { AlignmentDimensionId } from "./dimensions";
import type { AlignmentPolarity } from "./polarity";

export type AlignmentObservation = {
  id: string;
  workspaceId: string;
  observationId?: string;
  moduleId: string;
  schemaVersion: string;
  domainTags: string[];
  alignmentDimensions: AlignmentDimensionId[];
  polarity: AlignmentPolarity;
  evidenceRefs: EvidenceReference[];
  confirmationStatus: ConfirmationStatus;
  confidence?: number;
  sourceIdentity?: SourceIdentity;
  createdAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export function createAlignmentObservation(
  input: Omit<AlignmentObservation, "id" | "createdAt">
): AlignmentObservation {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
