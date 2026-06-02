import type { DiscoveryPromptGuidanceCategory } from "./DiscoveryPromptOutputs";

export type DiscoveryPromptComponentGroup =
  | "static"
  | "dynamic"
  | "session"
  | "understanding"
  | "behavior";

export interface DiscoveryPromptComponentSource {
  id: string;
  group: DiscoveryPromptComponentGroup;
  category: DiscoveryPromptGuidanceCategory;
  description: string;
  required: boolean;
  priority: number;
  stateDependencies: string[];
}

export interface DiscoveryPromptCompositionStrategy {
  id: string;
  name: string;
  description: string;
  staticComponents: DiscoveryPromptComponentSource[];
  dynamicComponents: DiscoveryPromptComponentSource[];
  sessionComponents: DiscoveryPromptComponentSource[];
  understandingComponents: DiscoveryPromptComponentSource[];
  behaviorComponents: DiscoveryPromptComponentSource[];
  componentOrder: DiscoveryPromptComponentGroup[];
  metadata?: Record<string, unknown>;
}
