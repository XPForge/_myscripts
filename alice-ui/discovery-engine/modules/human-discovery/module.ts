import type { ModuleRegistry } from "../../runtime/moduleRegistry";
import type { DiscoveryModuleRegistration } from "../../runtime/moduleRegistry";
import { humanDiscoveryArtifactTemplates } from "./artifactTemplates";
import { humanAlignmentMap } from "./alignmentMap";
import { humanPolicyRefs } from "./policies";
import { humanPromptRefs } from "./prompts";
import { humanResolutionInterpretations } from "./resolution";
import { humanDiscoveryWrapper } from "./wrapper";

export const humanDiscoveryModuleRegistration: DiscoveryModuleRegistration = {
  moduleId: humanDiscoveryWrapper.moduleId,
  schemaVersion: humanDiscoveryWrapper.schemaVersion,
  name: humanDiscoveryWrapper.moduleName,
  moduleData: {
    wrapper: humanDiscoveryWrapper,
    artifactTemplates: humanDiscoveryArtifactTemplates,
    alignmentMap: humanAlignmentMap,
    promptRefs: humanPromptRefs,
    policyRefs: humanPolicyRefs,
    resolutionInterpretations: humanResolutionInterpretations,
  },
};

export function registerHumanDiscoveryModule(registry: ModuleRegistry): void {
  registry.register(humanDiscoveryModuleRegistration);
}
