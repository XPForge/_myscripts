import type { SourceIdentity } from "../core/types";
import type { InterpretationBoundaryPolicy } from "./interpretationBoundary";
import type { ProtectedPromptRef } from "./protectedPromptRef";

export type InterpretationMode =
  | "exploratory_observation"
  | "clarifying_reflection"
  | "pattern_probe"
  | "evidence_summary"
  | "artifact_preparation";

export type InterpretationRequest = {
  id: string;
  workspaceId: string;
  sessionId: string;
  moduleId: string;
  sourceTurnIds: string[];
  evidenceReferenceIds: string[];
  mode: InterpretationMode;
  protectedPromptRef: ProtectedPromptRef;
  boundaryPolicy: InterpretationBoundaryPolicy;
  requestedBy?: SourceIdentity;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
