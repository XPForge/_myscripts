import type {
  ConfidenceLevel,
  ConfirmationStatus,
  DiscoveryEvent,
  EvidenceReference,
  InferenceLevel,
  Observation,
  ObservationType,
  ResolutionState,
  VisibilityScope,
} from "./types";
import { createDiscoveryEvent } from "./events";

export function createObservation(input: {
  workspaceId: string;
  sessionId?: string;
  moduleId: string;
  schemaVersion: string;
  type: ObservationType;
  content: string;
  evidenceRefs?: EvidenceReference[];
  inferenceLevel?: InferenceLevel;
  confidenceLevel?: ConfidenceLevel;
  confirmationStatus?: ConfirmationStatus;
  resolutionState?: ResolutionState;
  visibility?: VisibilityScope;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): { observation: Observation; event: DiscoveryEvent } {
  const now = new Date().toISOString();
  const observation: Observation = {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    sessionId: input.sessionId,
    moduleId: input.moduleId,
    schemaVersion: input.schemaVersion,
    type: input.type,
    content: input.content,
    evidenceRefs: input.evidenceRefs ?? [],
    inferenceLevel: input.inferenceLevel ?? "none",
    confidenceLevel: input.confidenceLevel ?? "unknown",
    confirmationStatus: input.confirmationStatus ?? "unconfirmed",
    resolutionState: input.resolutionState ?? "unresolved",
    resolutionHistory: [],
    visibility: input.visibility,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
    moduleData: input.moduleData,
  };
  const event = createDiscoveryEvent({
    workspaceId: input.workspaceId,
    sessionId: input.sessionId,
    type: "observation_added",
    relatedIds: [observation.id],
    moduleId: input.moduleId,
  });

  return { observation, event };
}
