import type { AgentDefinition } from "../core";
import type { AgentInstance, AgentRuntimeContext, AgentRuntimeMode } from "../instance";
import type {
  CoverageAssessment,
  IntelligenceSnapshot,
  UnderstandingAssessment,
} from "../intelligence";

export type AgentPromptComponentType =
  | "purpose"
  | "personality"
  | "principles"
  | "schema"
  | "coverage"
  | "understanding"
  | "context";

export type AgentPromptStrategyType =
  | "realtimeVoice"
  | "textInteraction"
  | "hybridInteraction";

export interface AgentPromptSessionContext {
  sessionId: string;
  runtimeMode: AgentRuntimeMode;
  startedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentPromptContext {
  agentDefinition: AgentDefinition;
  instance: AgentInstance;
  intelligenceSnapshot: IntelligenceSnapshot;
  sessionContext: AgentPromptSessionContext;
  runtimeContext: AgentRuntimeContext;
  metadata?: Record<string, unknown>;
}

export interface AgentPromptComponentBase {
  id: string;
  type: AgentPromptComponentType;
  title: string;
  description: string;
  priority: number;
  required: boolean;
  metadata?: Record<string, unknown>;
}

export interface PurposePromptComponent extends AgentPromptComponentBase {
  type: "purpose";
  purpose: string;
}

export interface PersonalityPromptComponent extends AgentPromptComponentBase {
  type: "personality";
  tone: string;
  communicationStyle: string;
  curiosityLevel: string;
  empathyLevel: string;
  challengeLevel: string;
  humorLevel: string;
}

export interface PrinciplesPromptComponent extends AgentPromptComponentBase {
  type: "principles";
  principles: AgentDefinition["principles"];
}

export interface SchemaPromptComponent extends AgentPromptComponentBase {
  type: "schema";
  schema: AgentDefinition["schema"];
}

export interface CoveragePromptComponent extends AgentPromptComponentBase {
  type: "coverage";
  coverage: CoverageAssessment;
}

export interface UnderstandingPromptComponent extends AgentPromptComponentBase {
  type: "understanding";
  understanding: UnderstandingAssessment[];
}

export interface ContextPromptComponent extends AgentPromptComponentBase {
  type: "context";
  sessionContext: AgentPromptSessionContext;
  transcriptSummary?: string;
  metadata?: Record<string, unknown>;
}

export type AgentPromptComponent =
  | PurposePromptComponent
  | PersonalityPromptComponent
  | PrinciplesPromptComponent
  | SchemaPromptComponent
  | CoveragePromptComponent
  | UnderstandingPromptComponent
  | ContextPromptComponent;

export interface AgentPromptStrategy {
  id: string;
  name: string;
  description: string;
  type: AgentPromptStrategyType;
  supportedRuntimeModes: AgentRuntimeMode[];
  componentOrder: AgentPromptComponentType[];
  includeRuntimeMetadata: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentPromptAssemblyResult {
  systemInstructions: string[];
  behavioralInstructions: string[];
  guidanceSections: AgentPromptComponent[];
  runtimeMetadata: Record<string, unknown>;
  strategy: AgentPromptStrategy;
  assembledAt: string;
}

export interface AgentPromptBuilder {
  buildPrompt(
    context: AgentPromptContext,
    strategy: AgentPromptStrategy
  ): AgentPromptAssemblyResult;
}
