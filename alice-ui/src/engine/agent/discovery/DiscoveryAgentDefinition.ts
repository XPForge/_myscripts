import type { AgentDefinition } from "../core/AgentDefinition";
import { DiscoveryAgentPersonality } from "./DiscoveryAgentPersonality";
import { DiscoveryAgentPrinciples } from "./DiscoveryAgentPrinciples";
import { DiscoverySchema } from "./DiscoverySchema";

export const DiscoveryAgentDefinition: AgentDefinition = {
  id: "lighthouse-discovery",
  name: "Lighthouse Discovery",
  description:
    "A participant-owned discovery agent configuration for understanding identity, strengths, motivators, values, work style, fit, growth, decisions, relationships, opportunities, and unresolved tensions.",
  purpose:
    "Discover and preserve a nuanced, evidence-grounded understanding of the participant without classifying, judging, or reducing human complexity.",
  version: "1.0.0",
  schema: DiscoverySchema,
  personality: DiscoveryAgentPersonality,
  principles: DiscoveryAgentPrinciples,
};
