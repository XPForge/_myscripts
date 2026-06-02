import type { DiscoveryBehaviorRequest } from "./DiscoveryBehaviorRequests";
import type { DiscoveryPromptBoundaries } from "./DiscoveryPromptBoundaries";
import type { DiscoveryPromptCompositionStrategy } from "./DiscoveryPromptCompositionStrategy";
import type { DiscoveryPromptInputs } from "./DiscoveryPromptInputs";
import type { DiscoveryPromptOutputs } from "./DiscoveryPromptOutputs";
import type { DiscoveryPromptUpdateStrategy } from "./DiscoveryPromptUpdateStrategy";

export interface DiscoveryPromptStateDependencies {
  required: string[];
  optional: string[];
  prohibited: string[];
}

export interface DiscoveryPromptAssemblyResponsibilities {
  mayDo: string[];
  mustNotDo: string[];
  mustPreserve: string[];
}

export interface DiscoveryPromptAssemblyContract {
  id: string;
  name: string;
  description: string;
  inputs: DiscoveryPromptInputs;
  behaviorRequests: DiscoveryBehaviorRequest[];
  outputs: DiscoveryPromptOutputs;
  requiredStateDependencies: DiscoveryPromptStateDependencies;
  compositionStrategy: DiscoveryPromptCompositionStrategy;
  updateStrategy: DiscoveryPromptUpdateStrategy;
  boundaries: DiscoveryPromptBoundaries;
  responsibilities: DiscoveryPromptAssemblyResponsibilities;
  metadata?: Record<string, unknown>;
}
