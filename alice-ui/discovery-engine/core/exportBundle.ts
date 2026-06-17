import type { DiscoveryWorkspace, ExportBundle } from "./types";

export function createExportBundle(
  workspace: DiscoveryWorkspace,
  metadata?: Record<string, unknown>
): ExportBundle {
  return {
    id: crypto.randomUUID(),
    exportBundleVersion: "1.0.0",
    workspace,
    artifacts: workspace.artifacts,
    events: workspace.eventLog,
    exportedAt: new Date().toISOString(),
    metadata,
  };
}

export function importExportBundle(bundle: ExportBundle): DiscoveryWorkspace {
  return {
    ...bundle.workspace,
    updatedAt: new Date().toISOString(),
  };
}
