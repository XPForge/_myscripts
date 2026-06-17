import type { DiscoveryWorkspace } from "./types";
import { createDiscoveryEvent } from "./events";

export function createDiscoveryWorkspace(input: {
  moduleId: string;
  schemaVersion: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): DiscoveryWorkspace {
  const now = new Date().toISOString();
  const workspaceId = crypto.randomUUID();
  const event = createDiscoveryEvent({
    workspaceId,
    type: "workspace_created",
    moduleId: input.moduleId,
  });

  return {
    id: workspaceId,
    moduleId: input.moduleId,
    schemaVersion: input.schemaVersion,
    sessions: [],
    observations: [],
    artifacts: [],
    artifactAttempts: [],
    eventLog: [event],
    resolutionHistory: [],
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
    moduleData: input.moduleData,
  };
}

export function touchWorkspace(workspace: DiscoveryWorkspace): DiscoveryWorkspace {
  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
  };
}
