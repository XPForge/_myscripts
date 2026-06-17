import type { ExportBundle, DiscoveryWorkspace } from "../core/types";
import type { DiscoveryStorageAdapter } from "./storageAdapter";

export class InMemoryDiscoveryStorage implements DiscoveryStorageAdapter {
  private readonly workspaces = new Map<string, DiscoveryWorkspace>();
  private readonly exportBundles = new Map<string, ExportBundle>();

  async saveWorkspace(workspace: DiscoveryWorkspace): Promise<void> {
    this.workspaces.set(workspace.id, workspace);
  }

  async getWorkspace(workspaceId: string): Promise<DiscoveryWorkspace | null> {
    return this.workspaces.get(workspaceId) ?? null;
  }

  async listWorkspaces(): Promise<DiscoveryWorkspace[]> {
    return [...this.workspaces.values()];
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    this.workspaces.delete(workspaceId);
  }

  async saveExportBundle(bundle: ExportBundle): Promise<void> {
    this.exportBundles.set(bundle.id, bundle);
  }

  async getExportBundle(bundleId: string): Promise<ExportBundle | null> {
    return this.exportBundles.get(bundleId) ?? null;
  }
}
