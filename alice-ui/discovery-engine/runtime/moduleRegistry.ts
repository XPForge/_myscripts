export type DiscoveryModuleRegistration = {
  moduleId: string;
  schemaVersion: string;
  name: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export class ModuleRegistry {
  private readonly modules = new Map<string, DiscoveryModuleRegistration[]>();

  register(module: DiscoveryModuleRegistration): void {
    const versions = this.modules.get(module.moduleId) ?? [];
    const withoutExistingVersion = versions.filter(
      (registered) => registered.schemaVersion !== module.schemaVersion
    );
    this.modules.set(module.moduleId, [...withoutExistingVersion, module]);
  }

  get(moduleId: string, schemaVersion?: string): DiscoveryModuleRegistration | undefined {
    const versions = this.modules.get(moduleId) ?? [];
    if (schemaVersion) {
      return versions.find((module) => module.schemaVersion === schemaVersion);
    }
    // Without a schema version, return the most recently registered version for this module.
    return versions.at(-1);
  }

  list(): DiscoveryModuleRegistration[] {
    return [...this.modules.values()].flat();
  }

  listVersions(moduleId: string): DiscoveryModuleRegistration[] {
    return [...(this.modules.get(moduleId) ?? [])];
  }
}
