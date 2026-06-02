/**
 * Agent Registry
 * 
 * Manages agent definitions and provides discovery.
 */

import type {
  AgentDefinition,
  AgentRegistryEntry,
  ConfigLoadResult,
} from "../models/AgentTypes.ts";

/**
 * Global registry of available agents
 */
export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();
  private entries: Map<string, AgentRegistryEntry> = new Map();

  /**
   * Register an agent
   */
  register(definition: AgentDefinition, configPath: string): void {
    this.agents.set(definition.id, definition);
    this.entries.set(definition.id, {
      agentId: definition.id,
      name: definition.name,
      description: definition.description,
      version: definition.version,
      status: definition.status || "active",
      configPath,
      createdAt: definition.createdAt || Date.now(),
      updatedAt: definition.updatedAt || Date.now(),
    });
  }

  /**
   * Get agent definition by ID
   */
  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all registry entries
   */
  getEntries(): AgentRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * List agents by status
   */
  getAgentsByStatus(
    status: "active" | "experimental" | "deprecated"
  ): AgentDefinition[] {
    return Array.from(this.agents.values()).filter(
      (a) => (a.status || "active") === status
    );
  }

  /**
   * Check if agent is registered
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Update agent definition
   */
  updateAgent(definition: AgentDefinition): void {
    definition.updatedAt = Date.now();
    this.register(definition, this.entries.get(definition.id)?.configPath || "");
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): boolean {
    const success = this.agents.delete(agentId);
    this.entries.delete(agentId);
    return success;
  }
}

/**
 * Global registry instance
 */
export const globalAgentRegistry = new AgentRegistry();
