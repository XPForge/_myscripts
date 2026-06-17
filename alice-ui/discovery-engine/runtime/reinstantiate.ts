import type { DiscoveryWorkspace } from "../core/types";

export function reinstantiateWorkspace(workspace: DiscoveryWorkspace): DiscoveryWorkspace {
  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
  };
}
