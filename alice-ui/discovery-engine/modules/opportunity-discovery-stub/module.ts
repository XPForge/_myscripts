import type {
  DiscoveryModuleRegistration,
  ModuleRegistry,
} from "../../runtime/moduleRegistry";
import { opportunityDiscoveryArtifactTemplates } from "./artifactTemplates";
import { opportunityAlignmentMap } from "./alignmentMap";
import { opportunityPolicyRefs } from "./policies";
import { opportunityPromptRefs } from "./prompts";
import { opportunityResolutionInterpretations } from "./resolution";
import { opportunityDiscoveryStubWrapper } from "./wrapper";

export const opportunityDiscoveryStubModuleRegistration: DiscoveryModuleRegistration = {
  moduleId: opportunityDiscoveryStubWrapper.moduleId,
  schemaVersion: opportunityDiscoveryStubWrapper.schemaVersion,
  name: opportunityDiscoveryStubWrapper.moduleName,
  moduleData: {
    wrapper: opportunityDiscoveryStubWrapper,
    artifactTemplates: opportunityDiscoveryArtifactTemplates,
    alignmentMap: opportunityAlignmentMap,
    promptRefs: opportunityPromptRefs,
    policyRefs: opportunityPolicyRefs,
    resolutionInterpretations: opportunityResolutionInterpretations,
  },
};

export function registerOpportunityDiscoveryStubModule(
  registry: ModuleRegistry
): void {
  registry.register(opportunityDiscoveryStubModuleRegistration);
}
