import type {
  ConversationTurn,
  ContentBlock,
  DiscoveryEvent,
  DiscoverySession,
  EvidenceReference,
  SourceIdentity,
  VisibilityScope,
} from "./types";
import { createDiscoveryEvent } from "./events";

export function createConversationTurn(input: {
  workspaceId: string;
  sessionId: string;
  source: SourceIdentity;
  content: string;
  contentBlocks?: ContentBlock[];
  visibility?: VisibilityScope;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): ConversationTurn {
  return {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    sessionId: input.sessionId,
    source: input.source,
    content: input.content,
    contentBlocks: input.contentBlocks,
    createdAt: new Date().toISOString(),
    evidenceRefs: [],
    visibility: input.visibility,
    metadata: input.metadata,
    moduleData: input.moduleData,
  };
}

export function evidenceFromTurn(turn: ConversationTurn, quote?: string): EvidenceReference {
  return {
    id: crypto.randomUUID(),
    workspaceId: turn.workspaceId,
    sessionId: turn.sessionId,
    turnId: turn.id,
    sourceId: turn.source.id,
    quote,
    createdAt: new Date().toISOString(),
  };
}

export function addTurnToSession(
  session: DiscoverySession,
  turn: ConversationTurn
): { session: DiscoverySession; event: DiscoveryEvent } {
  const event = createDiscoveryEvent({
    workspaceId: session.workspaceId,
    sessionId: session.id,
    type: "turn_added",
    relatedIds: [turn.id],
    moduleId: session.moduleId,
  });

  return {
    session: {
      ...session,
      turns: [...session.turns, turn],
      eventLog: [...session.eventLog, event],
      updatedAt: new Date().toISOString(),
    },
    event,
  };
}
