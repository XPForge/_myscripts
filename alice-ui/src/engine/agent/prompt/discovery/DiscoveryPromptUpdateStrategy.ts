export type DiscoveryPromptRefreshTrigger =
  | "session-started"
  | "transcript-turn-finalized"
  | "observation-created"
  | "evidence-added"
  | "confidence-updated"
  | "pattern-created"
  | "coverage-updated"
  | "understanding-updated"
  | "open-question-created"
  | "reflection-opportunity-created"
  | "participant-confirmation-updated"
  | "behavior-request-created"
  | "session-resumed"
  | "manual-refresh";

export type DiscoveryPromptRefreshMode =
  | "full"
  | "dynamic-only"
  | "runtime-metadata-only"
  | "none";

export interface DiscoveryPromptRefreshRule {
  trigger: DiscoveryPromptRefreshTrigger;
  refreshMode: DiscoveryPromptRefreshMode;
  reason: string;
  requiredStateDependencies: string[];
}

export interface DiscoveryPromptUpdateStrategy {
  id: string;
  name: string;
  description: string;
  refreshRules: DiscoveryPromptRefreshRule[];
  minimumRefreshIntervalMs?: number;
  metadata?: Record<string, unknown>;
}
