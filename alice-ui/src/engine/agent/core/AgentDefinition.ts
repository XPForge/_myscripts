export type AgentFieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object";

export type AgentLevel = "low" | "medium" | "high";

export type AgentHumorLevel = "none" | "subtle" | "moderate";

export interface AgentSchemaField {
  id: string;
  name: string;
  description: string;
  required: boolean;
  type?: AgentFieldType;
}

export interface AgentSchemaSection {
  id: string;
  title: string;
  description: string;
  fields: AgentSchemaField[];
}

export interface AgentSchema {
  sections: AgentSchemaSection[];
}

export interface AgentPersonality {
  tone: string;
  communicationStyle: string;
  curiosityLevel: AgentLevel;
  empathyLevel: AgentLevel;
  challengeLevel: AgentLevel;
  humorLevel: AgentHumorLevel;
}

export interface AgentPrinciple {
  id: string;
  title: string;
  description: string;
}

export type AgentPrinciples = AgentPrinciple[];

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  purpose: string;
  version: string;
  schema: AgentSchema;
  personality: AgentPersonality;
  principles: AgentPrinciples;
}
