import type { DiscoverySession, DiscoveryWorkspace } from "./types";
import { createDiscoveryEvent } from "./events";
import { touchWorkspace } from "./workspace";

export function createDiscoverySession(input: {
  workspaceId: string;
  moduleId: string;
  schemaVersion: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): DiscoverySession {
  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  const event = createDiscoveryEvent({
    workspaceId: input.workspaceId,
    sessionId,
    type: "session_created",
    moduleId: input.moduleId,
  });

  return {
    id: sessionId,
    workspaceId: input.workspaceId,
    moduleId: input.moduleId,
    schemaVersion: input.schemaVersion,
    status: "active",
    turns: [],
    observations: [],
    eventLog: [event],
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
    moduleData: input.moduleData,
  };
}

export function addSessionToWorkspace(
  workspace: DiscoveryWorkspace,
  session: DiscoverySession
): DiscoveryWorkspace {
  return touchWorkspace({
    ...workspace,
    activeSessionId: session.id,
    sessions: [...workspace.sessions, session],
    eventLog: [...workspace.eventLog, ...session.eventLog],
  });
}
