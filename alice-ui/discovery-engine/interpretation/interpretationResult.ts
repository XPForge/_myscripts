import type {
  ConfirmationStatus,
  InferenceLevel,
} from "../core/types";

export type InterpretationResult = {
  id: string;
  requestId: string;
  workspaceId: string;
  sessionId: string;
  moduleId: string;
  generatedObservationIds: string[];
  evidenceReferenceIdsUsed: string[];
  uncertaintyNotes: string[];
  boundaryNotes: string[];
  confirmationStatus: ConfirmationStatus;
  inferenceLevel: InferenceLevel;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
