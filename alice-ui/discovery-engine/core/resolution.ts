import type {
  DiscoveryEvent,
  EvidenceReference,
  Observation,
  ResolutionEvent,
  ResolutionState,
} from "./types";
import { createDiscoveryEvent } from "./events";

export function transitionResolution(input: {
  observation: Observation;
  nextState: ResolutionState;
  reason?: string;
  evidenceRefs?: EvidenceReference[];
  moduleId?: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): { observation: Observation; resolutionEvent: ResolutionEvent; event: DiscoveryEvent } {
  const event = createDiscoveryEvent({
    workspaceId: input.observation.workspaceId,
    sessionId: input.observation.sessionId,
    type: "resolution_changed",
    relatedIds: [input.observation.id],
    moduleId: input.moduleId ?? input.observation.moduleId,
  });
  const resolutionEvent: ResolutionEvent = {
    id: crypto.randomUUID(),
    workspaceId: input.observation.workspaceId,
    sessionId: input.observation.sessionId,
    observationId: input.observation.id,
    previousState: input.observation.resolutionState,
    nextState: input.nextState,
    reason: input.reason,
    evidenceRefs: input.evidenceRefs ?? [],
    moduleId: input.moduleId ?? input.observation.moduleId,
    eventId: event.id,
    createdAt: event.createdAt,
    metadata: input.metadata,
    moduleData: input.moduleData,
  };

  return {
    observation: {
      ...input.observation,
      resolutionState: input.nextState,
      resolutionHistory: [...input.observation.resolutionHistory, resolutionEvent],
      updatedAt: event.createdAt,
    },
    resolutionEvent,
    event,
  };
}
