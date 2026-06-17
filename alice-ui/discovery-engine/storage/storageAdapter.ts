import type { DiscoveryWorkspace, ExportBundle } from "../core/types";

export type DiscoveryStorageAdapter = {
  saveWorkspace(workspace: DiscoveryWorkspace): Promise<void>;
  getWorkspace(workspaceId: string): Promise<DiscoveryWorkspace | null>;
  listWorkspaces(): Promise<DiscoveryWorkspace[]>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  saveExportBundle(bundle: ExportBundle): Promise<void>;
  getExportBundle(bundleId: string): Promise<ExportBundle | null>;
};
