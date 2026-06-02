import type { AgentRuntimeMode } from "../../instance";
import type { DiscoveryBehaviorRequest } from "./DiscoveryBehaviorRequests";

export type DiscoveryPromptGuidanceCategory =
  | "system"
  | "behavior"
  | "conversation"
  | "curiosity"
  | "reflection"
  | "boundary"
  | "participant-authority"
  | "runtime";

export interface DiscoveryPromptGuidanceSection {
  id: string;
  category: DiscoveryPromptGuidanceCategory;
  title: string;
  purpose: string;
  priority: number;
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface DiscoveryRuntimePromptMetadata {
  agentId: string;
  agentVersion: string;
  sessionId: string;
  runtimeMode: AgentRuntimeMode;
  assembledAt: string;
  stateVersion?: string;
  refreshReason?: string;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryPromptOutputs {
  systemInstructions: DiscoveryPromptGuidanceSection[];
  behaviorGuidance: DiscoveryPromptGuidanceSection[];
  conversationGuidance: DiscoveryPromptGuidanceSection[];
  curiosityGuidance: DiscoveryPromptGuidanceSection[];
  reflectionGuidance: DiscoveryPromptGuidanceSection[];
  boundaryGuidance: DiscoveryPromptGuidanceSection[];
  participantAuthorityGuidance: DiscoveryPromptGuidanceSection[];
  runtimeMetadata: DiscoveryRuntimePromptMetadata;
  supportedBehaviorRequests: DiscoveryBehaviorRequest[];
}
