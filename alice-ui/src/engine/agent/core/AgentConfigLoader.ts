/**
 * Agent Configuration Loader
 * 
 * Loads agent definitions from JSON configuration files.
 * Validates and assembles all configuration components.
 */

import type {
  AgentDefinition,
  AgentSchema,
  AgentPersonality,
  AgentPrinciples,
  AgentEvidenceModel,
  AgentConfidenceModel,
  AgentPromptStrategy,
  AgentMemoryStrategy,
  AgentOutputStrategy,
  ConfigLoadResult,
} from "../models/AgentTypes.ts";

/**
 * Configuration loader for agent definitions
 */
export class AgentConfigLoader {
  /**
   * Load an agent definition from a base path
   * Expected structure:
   *   /config/
   *     agent.json
   *     schema.json
   *     personality.json
   *     principles.json
   *     evidenceModel.json
   *     confidenceModel.json
   *     promptStrategy.json
   *     memoryStrategy.json
   *     outputStrategy.json
   */
  async loadAgentFromPath(basePath: string): Promise<ConfigLoadResult> {
    try {
      // Load all configuration files
      const agentConfig = await this.loadJsonFile(`${basePath}/agent.json`);
      const schema = await this.loadJsonFile(`${basePath}/schema.json`);
      const personality = await this.loadJsonFile(`${basePath}/personality.json`);
      const principles = await this.loadJsonFile(`${basePath}/principles.json`);
      const evidenceModel = await this.loadJsonFile(
        `${basePath}/evidenceModel.json`
      );
      const confidenceModel = await this.loadJsonFile(
        `${basePath}/confidenceModel.json`
      );
      const promptStrategy = await this.loadJsonFile(
        `${basePath}/promptStrategy.json`
      );
      const memoryStrategy = await this.loadJsonFile(
        `${basePath}/memoryStrategy.json`
      );
      const outputStrategy = await this.loadJsonFile(
        `${basePath}/outputStrategy.json`
      );

      // Validate each component
      this.validateSchema(schema);
      this.validatePersonality(personality);
      this.validatePrinciples(principles);
      this.validateEvidenceModel(evidenceModel);
      this.validateConfidenceModel(confidenceModel);
      this.validatePromptStrategy(promptStrategy);
      this.validateMemoryStrategy(memoryStrategy);
      this.validateOutputStrategy(outputStrategy);

      // Assemble complete definition
      const definition: AgentDefinition = {
        id: agentConfig.id,
        name: agentConfig.name,
        description: agentConfig.description,
        version: agentConfig.version,
        purpose: agentConfig.purpose,
        schema,
        personality,
        principles,
        evidenceModel,
        confidenceModel,
        promptStrategy,
        memoryStrategy,
        outputStrategy,
        createdAt: agentConfig.createdAt || Date.now(),
        updatedAt: agentConfig.updatedAt || Date.now(),
        status: agentConfig.status || "active",
        metadata: agentConfig.metadata,
      };

      return { success: true, data: definition };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Load JSON file (browser-safe version)
   */
  private async loadJsonFile(path: string): Promise<unknown> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(
        `Failed to load configuration from ${path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Validate schema configuration
   */
  private validateSchema(schema: unknown): void {
    if (!schema || typeof schema !== "object") {
      throw new Error("Invalid schema: must be an object");
    }
    const s = schema as Record<string, unknown>;
    if (!s.version || !s.name || !s.fields) {
      throw new Error("Schema missing required fields: version, name, fields");
    }
    if (!Array.isArray(s.fields)) {
      throw new Error("Schema.fields must be an array");
    }
  }

  /**
   * Validate personality configuration
   */
  private validatePersonality(personality: unknown): void {
    if (!personality || typeof personality !== "object") {
      throw new Error("Invalid personality: must be an object");
    }
    const p = personality as Record<string, unknown>;
    if (!p.version || !p.tone) {
      throw new Error(
        "Personality missing required fields: version, tone"
      );
    }
  }

  /**
   * Validate principles configuration
   */
  private validatePrinciples(principles: unknown): void {
    if (!principles || typeof principles !== "object") {
      throw new Error("Invalid principles: must be an object");
    }
    const pr = principles as Record<string, unknown>;
    if (!pr.version || !pr.principles) {
      throw new Error("Principles missing required fields: version, principles");
    }
    if (!Array.isArray(pr.principles)) {
      throw new Error("Principles.principles must be an array");
    }
  }

  /**
   * Validate evidence model configuration
   */
  private validateEvidenceModel(model: unknown): void {
    if (!model || typeof model !== "object") {
      throw new Error("Invalid evidenceModel: must be an object");
    }
    const m = model as Record<string, unknown>;
    if (!m.version) {
      throw new Error("EvidenceModel missing required field: version");
    }
  }

  /**
   * Validate confidence model configuration
   */
  private validateConfidenceModel(model: unknown): void {
    if (!model || typeof model !== "object") {
      throw new Error("Invalid confidenceModel: must be an object");
    }
    const m = model as Record<string, unknown>;
    if (!m.version) {
      throw new Error("ConfidenceModel missing required field: version");
    }
  }

  /**
   * Validate prompt strategy configuration
   */
  private validatePromptStrategy(strategy: unknown): void {
    if (!strategy || typeof strategy !== "object") {
      throw new Error("Invalid promptStrategy: must be an object");
    }
    const s = strategy as Record<string, unknown>;
    if (!s.version || !s.components) {
      throw new Error(
        "PromptStrategy missing required fields: version, components"
      );
    }
    if (!Array.isArray(s.components)) {
      throw new Error("PromptStrategy.components must be an array");
    }
  }

  /**
   * Validate memory strategy configuration
   */
  private validateMemoryStrategy(strategy: unknown): void {
    if (!strategy || typeof strategy !== "object") {
      throw new Error("Invalid memoryStrategy: must be an object");
    }
    const s = strategy as Record<string, unknown>;
    if (!s.version || !s.strategy) {
      throw new Error("MemoryStrategy missing required fields: version, strategy");
    }
  }

  /**
   * Validate output strategy configuration
   */
  private validateOutputStrategy(strategy: unknown): void {
    if (!strategy || typeof strategy !== "object") {
      throw new Error("Invalid outputStrategy: must be an object");
    }
    const s = strategy as Record<string, unknown>;
    if (!s.version || !s.outputs) {
      throw new Error(
        "OutputStrategy missing required fields: version, outputs"
      );
    }
    if (!Array.isArray(s.outputs)) {
      throw new Error("OutputStrategy.outputs must be an array");
    }
  }
}
