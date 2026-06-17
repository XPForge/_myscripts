import { ModuleRegistry } from "../runtime/moduleRegistry";
import type { DiscoveryModuleRegistration } from "../runtime/moduleRegistry";
import { registerHumanDiscoveryModule } from "../modules/human-discovery/module";
import { registerOpportunityDiscoveryStubModule } from "../modules/opportunity-discovery-stub/module";

export function createDiscoveryModuleHarnessRegistry(): ModuleRegistry {
  const registry = new ModuleRegistry();
  registerHumanDiscoveryModule(registry);
  registerOpportunityDiscoveryStubModule(registry);
  return registry;
}

export function listHarnessModules(
  registry = createDiscoveryModuleHarnessRegistry()
): DiscoveryModuleRegistration[] {
  return registry.list();
}

export function listHarnessModuleSchemaVersions(
  moduleId: string,
  registry = createDiscoveryModuleHarnessRegistry()
): string[] {
  return registry.listVersions(moduleId).map((module) => module.schemaVersion);
}
