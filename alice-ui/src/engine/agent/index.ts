/**
 * Lighthouse Agent Framework
 * 
 * Universal framework for creating, configuring, and executing agents.
 * Agents are configurations, not implementations.
 */

export * from "./models/AgentTypes.ts";
export {
  DiscoveryAgentDefinition,
  DiscoveryAgentPersonality,
  DiscoveryAgentPrinciples,
  DiscoveryBoundaryPolicies,
  DiscoveryExperienceProfile,
  DiscoverySchema,
} from "./discovery";
export type {
  AgentDefinition as CoreAgentDefinition,
  AgentPersonality as CoreAgentPersonality,
  AgentPrinciples as CoreAgentPrinciples,
  AgentSchema as CoreAgentSchema,
} from "./core";
export type {
  AgentObservation,
  AgentPattern,
  ConfidenceAssessment,
  CoverageArea,
  CoverageAssessment,
  EvidenceReference,
  IntelligenceSnapshot,
  ObservationSet,
  PatternSignal,
  ReflectionStatement,
  UnderstandingArea,
  UnderstandingAssessment,
} from "./intelligence";
export type {
  AgentEvent,
  AgentEventType,
  AgentInstance,
  AgentLifecycleStatus,
  AgentParticipantMetadata,
  AgentRuntimeContext,
  AgentRuntimeMode,
  AgentSessionMetadata,
  AgentTranscriptState,
  AgentTranscriptTurn,
  AssistantResponseEvent,
} from "./instance";
export type {
  AgentPromptAssemblyResult,
  AgentPromptBuilder,
  AgentPromptComponent,
  AgentPromptComponentType,
  AgentPromptContext,
  AgentPromptSessionContext,
  AgentPromptStrategy,
  AgentPromptStrategyType,
} from "./prompt";
export type {
  AgentPerceptionPipeline,
  ConfidencePipeline,
  CoveragePipeline,
  EvidencePipeline,
  ObservationPipeline,
  PatternPipeline,
  PerceptionPipelineContext,
  PerceptionPipelineResult,
  PerceptionPipelineStage,
  ReflectionPipeline,
  UnderstandingPipeline,
} from "./perception";
export type {
  ConversationStyle,
  CuriosityModel,
  ExperienceLevel,
  ExperienceProfile,
  InteractionStrategy,
  QuestionStrategy,
  TrustStrategy,
} from "./experience";
export type {
  AgentBoundaryPolicySet,
  AuditabilityPolicy,
  BoundaryDefinition,
  BoundaryDomainDefinition,
  DisclosureCategory,
  DisclosureLevel,
  DisclosurePolicy,
  DisclosureRule,
  ExplanationPolicy,
  InformationDomain,
  TransparencyPolicy,
  TrustPolicy,
} from "./boundary";
export { AgentExecutor } from "./core/AgentExecutor.ts";
export { AgentRegistry, globalAgentRegistry } from "./core/AgentRegistry.ts";
export { AgentConfigLoader } from "./core/AgentConfigLoader.ts";

import type {
  AgentDefinition,
  AgentExecutionContext,
  AgentExecutionResult,
} from "./models/AgentTypes.ts";
import { AgentExecutor } from "./core/AgentExecutor.ts";
import { AgentRegistry } from "./core/AgentRegistry.ts";
import { AgentConfigLoader } from "./core/AgentConfigLoader.ts";

/**
 * Main framework interface
 */
export class LighthouseAgentFramework {
  private registry: AgentRegistry;
  private configLoader: AgentConfigLoader;

  constructor() {
    this.registry = new AgentRegistry();
    this.configLoader = new AgentConfigLoader();
  }

  /**
   * Register an agent definition
   */
  registerAgent(definition: AgentDefinition, configPath: string): void {
    this.registry.register(definition, configPath);
  }

  /**
   * Load and register agent from configuration files
   */
  async loadAgent(agentId: string, configPath: string): Promise<boolean> {
    const result = await this.configLoader.loadAgentFromPath(configPath);
    if (result.success && result.data) {
      this.registerAgent(result.data, configPath);
      return true;
    }
    console.error(`Failed to load agent ${agentId}:`, result.error);
    return false;
  }

  /**
   * Get agent definition by ID
   */
  getAgent(agentId: string): AgentDefinition | undefined {
    return this.registry.getAgent(agentId);
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentDefinition[] {
    return this.registry.getAllAgents();
  }

  /**
   * Execute an agent
   */
  async executeAgent(
    agentId: string,
    context: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const definition = this.registry.getAgent(agentId);
    if (!definition) {
      return {
        agentId,
        status: "error",
        output: null,
        observations: [],
        confidence: "low",
        executionTime: 0,
        error: `Agent not found: ${agentId}`,
      };
    }

    const executor = new AgentExecutor(definition);
    return executor.execute(context);
  }

  /**
   * Get registry for advanced operations
   */
  getRegistry(): AgentRegistry {
    return this.registry;
  }

  /**
   * Update agent definition
   */
  updateAgent(definition: AgentDefinition): void {
    this.registry.updateAgent(definition);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.registry.unregister(agentId);
  }
}

/**
 * Create a new framework instance
 */
export function createFramework(): LighthouseAgentFramework {
  return new LighthouseAgentFramework();
}
