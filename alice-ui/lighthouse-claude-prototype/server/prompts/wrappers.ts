import type { DiscoveryContext } from "../providers/types.js";

export function normalizeContext(value: unknown): DiscoveryContext {
  if (value === "employment" || value === "team" || value === "relationship" || value === "education" || value === "general") {
    return value;
  }
  return "employment";
}

export function getWrapperPrompt(context: DiscoveryContext) {
  switch (context) {
    case "employment":
      return "This interview is for employment discovery. The goal is to understand how this person works, thinks, and contributes in a professional environment so they can be matched with opportunities that genuinely fit them - not just roles that match their keywords.";
    case "team":
      return "This interview is for team composition discovery. The goal is to understand how this person collaborates, leads, follows, communicates, and contributes so they can be placed in teams where both they and the team will thrive.";
    case "relationship":
      return "This interview is for personal compatibility discovery. The goal is to understand how this person connects, communicates, and builds relationships so they can be matched with compatible partners.";
    case "education":
      return "This interview is for educational alignment. The goal is to understand how this person learns, what environments allow them to develop most fully, and what kinds of educational experiences would genuinely serve them.";
    case "general":
    default:
      return "This interview is for general Human Capability discovery. The goal is to understand the participant deeply without narrowing the conversation to one institutional context.";
  }
}
