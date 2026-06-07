import type { DiscoveryProvider } from "../types.js";

const openings = [
  "I am glad you are here. To begin, tell me about something you have been drawn to lately - a problem, project, question, or pattern that has had your attention.",
  "Let's start somewhere real rather than formal. What is something you have done, noticed, or cared about recently that feels like it says something true about how you operate?",
  "To begin, tell me about a moment when you felt unusually engaged or clear. What was happening, and what part of it seemed to wake you up?",
];

function latestUserText(turns: { role: string; text: string }[]) {
  return [...turns].reverse().find((turn) => turn.role === "user")?.text || "";
}

function responseFor(text: string, count: number) {
  if (count === 0) return openings[count % openings.length];
  if (/hard|difficult|stuck|struggle|frustrat/i.test(text)) {
    return "That sounds like it carried some friction, but also signal. I want to understand the shape of it rather than flatten it into a problem. What did that situation reveal about what you need in order to do your best thinking?";
  }
  if (/team|people|manager|collabor/i.test(text)) {
    return "I am noticing the people-dynamics thread there. It sounds like the way others engage with the work changes what becomes possible for you. What kind of collaboration tends to bring out your strongest contribution?";
  }
  if (/create|build|design|make|write|idea/i.test(text)) {
    return "There is a creative pattern in that. Not just making something, but sensing what wants to exist and shaping it until it becomes clearer. Can you tell me about a time when that kind of creating felt especially natural?";
  }
  if (/learn|study|figure|understand|research/i.test(text)) {
    return "I hear a learning pattern there: you seem to be describing understanding as something you build from the inside, not something you simply receive. What helps you learn something deeply enough that it becomes yours?";
  }
  return "There may be a pattern forming there. I do not want to overstate it yet, but it sounds like you are describing more than an activity - you are describing a way you move toward clarity. What part of that experience felt most like you?";
}

export function createMockDiscoveryProvider(): DiscoveryProvider {
  return {
    async respond(input) {
      const userTurns = input.turns.filter((turn) => turn.role === "user");
      return {
        text: responseFor(latestUserText(input.turns), userTurns.length),
      };
    },
  };
}
