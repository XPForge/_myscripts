/**
 * Agent Framework Type Definitions
 * 
 * Core types for the universal Agent Framework.
 * Agents are configurations, not implementations.
 */

// ============================================================================
// SCHEMA LAYER
// ============================================================================

/**
 * Field in the agent schema
 */
export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  validValues?: string[];
}

/**
 * Agent schema defines what the agent attempts to understand.
 */
export interface AgentSchema {
  version: string;
  name: string;
  description: string;
  fields: SchemaField[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PERSONALITY LAYER
// ============================================================================

/**
 * Personality defines communication style, tone, and approach.
 */
export interface AgentPersonality {
  version: string;
  tone: "warm" | "analytical" | "encouraging" | "objective" | "inquisitive";
  communicationStyle: string;
  pacing: "deliberate" | "steady" | "energetic";
  curiosityLevel: "low" | "medium" | "high";
  empathyLevel: "low" | "medium" | "high";
  challengeLevel: "low" | "medium" | "high";
  humorLevel: "none" | "subtle" | "moderate";
  explorationStyle: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PRINCIPLES LAYER
// ============================================================================

/**
 * Principle that governs agent behavior
 */
export interface Principle {
  id: string;
  name: string;
  description: string;
  guidance: string;
  constraints?: string[];
}

/**
 * Collection of principles for an agent
 */
export interface AgentPrinciples {
  version: string;
  principles: Principle[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// EVIDENCE MODEL
// ============================================================================

/**
 * Evidence supporting an observation
 */
export interface Evidence {
  id: string;
  type: "transcript" | "interaction" | "document" | "observation" | "metric";
  source: string;
  content: string;
  timestamp?: number;
  context?: Record<string, unknown>;
}

/**
 * Observation with evidence
 */
export interface EvidencedObservation {
  observation: string;
  confidence: ConfidenceLevel;
  evidence: Evidence[];
  reasoning?: string;
}

/**
 * Evidence model configuration
 */
export interface AgentEvidenceModel {
  version: string;
  requireEvidence: boolean;
  minEvidenceThreshold: number;
  supportedEvidenceTypes: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CONFIDENCE MODEL
// ============================================================================

export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Confidence scoring configuration
 */
export interface ConfidenceRule {
  condition: string;
  evidenceDensity: number; // 0-1
  consistency: number; // 0-1
  confidenceLevel: ConfidenceLevel;
}

/**
 * Confidence model configuration
 */
export interface AgentConfidenceModel {
  version: string;
  defaultConfidence: ConfidenceLevel;
  rules: ConfidenceRule[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PROMPT STRATEGY
// ============================================================================

/**
 * Component of a dynamically generated prompt
 */
export interface PromptComponent {
  id: string;
  type: "purpose" | "schema" | "principles" | "personality" | "context" | "memory" | "instruction";
  content: string;
  priority: number; // 0-100, higher = earlier in prompt
  conditional?: boolean;
}

/**
 * Prompt strategy configuration
 */
export interface AgentPromptStrategy {
  version: string;
  components: PromptComponent[];
  templates?: Record<string, string>;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// MEMORY STRATEGY
// ============================================================================

export type MemoryStrategyType = "none" | "session" | "profile" | "cross-agent";

/**
 * Memory configuration for an agent
 */
export interface AgentMemoryStrategy {
  version: string;
  strategy: MemoryStrategyType;
  maxMemorySize?: number;
  retentionPolicy?: "lifetime" | "session" | "temporary";
  scope?: "agent" | "cross-agent" | "user";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// OUTPUT STRATEGY
// ============================================================================

/**
 * Output definition for an agent
 */
export interface OutputDefinition {
  id: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  format: "json" | "text" | "structured" | "markdown";
}

/**
 * Output strategy configuration
 */
export interface AgentOutputStrategy {
  version: string;
  outputs: OutputDefinition[];
  defaultFormat: "json" | "text" | "structured" | "markdown";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT DEFINITION (MAIN)
// ============================================================================

/**
 * Complete agent definition - configuration only, no logic
 */
export interface AgentDefinition {
  // Identity
  id: string;
  name: string;
  description: string;
  version: string;
  purpose: string;

  // Configuration components
  schema: AgentSchema;
  personality: AgentPersonality;
  principles: AgentPrinciples;
  evidenceModel: AgentEvidenceModel;
  confidenceModel: AgentConfidenceModel;
  promptStrategy: AgentPromptStrategy;
  memoryStrategy: AgentMemoryStrategy;
  outputStrategy: AgentOutputStrategy;

  // Metadata
  createdAt?: number;
  updatedAt?: number;
  status?: "active" | "experimental" | "deprecated";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT EXECUTION CONTEXT
// ============================================================================

/**
 * Context passed during agent execution
 */
export interface AgentExecutionContext {
  agentId: string;
  userId?: string;
  sessionId?: string;
  input: Record<string, unknown>;
  memory?: Record<string, unknown>;
  previousObservations?: EvidencedObservation[];
  timestamp: number;
}

/**
 * Result of agent execution
 */
export interface AgentExecutionResult {
  agentId: string;
  status: "success" | "error" | "partial";
  output: unknown;
  observations: EvidencedObservation[];
  confidence: ConfidenceLevel;
  executionTime: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT REGISTRY
// ============================================================================

/**
 * Registration entry for an agent
 */
export interface AgentRegistryEntry {
  agentId: string;
  name: string;
  description: string;
  version: string;
  status: "active" | "experimental" | "deprecated";
  configPath: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

/**
 * Configuration loader result
 */
export interface ConfigLoadResult {
  success: boolean;
  data?: AgentDefinition;
  error?: string;
}
