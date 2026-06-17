import type {
  ConversationTurn,
  DiscoverySession,
  DiscoveryWorkspace,
  Observation,
} from "../core/types";
import { addSessionToWorkspace, createDiscoverySession } from "../core/session";
import { createDiscoveryWorkspace, touchWorkspace } from "../core/workspace";
import { addTurnToSession } from "../core/turns";

export function createWorkspace(input: {
  moduleId: string;
  schemaVersion: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): DiscoveryWorkspace {
  return createDiscoveryWorkspace(input);
}

export function startSession(workspace: DiscoveryWorkspace): DiscoveryWorkspace {
  const session = createDiscoverySession({
    workspaceId: workspace.id,
    moduleId: workspace.moduleId,
    schemaVersion: workspace.schemaVersion,
  });
  return addSessionToWorkspace(workspace, session);
}

export function appendTurn(
  workspace: DiscoveryWorkspace,
  sessionId: string,
  turn: ConversationTurn
): DiscoveryWorkspace {
  const sessions = workspace.sessions.map((session) => {
    if (session.id !== sessionId) return session;
    return addTurnToSession(session, turn).session;
  });

  return touchWorkspace({
    ...workspace,
    sessions,
  });
}

export function appendObservation(
  workspace: DiscoveryWorkspace,
  observation: Observation
): DiscoveryWorkspace {
  const sessions: DiscoverySession[] = workspace.sessions.map((session) => {
    if (session.id !== observation.sessionId) return session;
    return {
      ...session,
      observations: [...session.observations, observation],
      updatedAt: new Date().toISOString(),
    };
  });

  return touchWorkspace({
    ...workspace,
    sessions,
    observations: [...workspace.observations, observation],
  });
}
