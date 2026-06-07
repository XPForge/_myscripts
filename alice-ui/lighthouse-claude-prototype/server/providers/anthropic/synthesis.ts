import { env } from "../../config/env.js";
import type { SynthesisProvider } from "../types.js";
import { anthropicFetch } from "./client.js";

const synthesisInstruction = `The discovery conversation is now complete. Based on the full conversation above, generate a complete Human Clarity Profile using the Lighthouse framework.

The profile must distinguish between raw observed material, inferred themes, and participant-confirmed themes. It must surface both alignment opportunities and misalignment risks - conditions where this person's capability flourishes and conditions where it would be suppressed or distorted.

Tone may be adjusted for readability. Implication may not be diluted. Write with full voltage where it matters.

Structure the profile exactly as follows:

SECTION 1 - EXECUTIVE SUMMARY
SECTION 2 - CORE THEMES
SECTION 3 - NATURAL STRENGTHS
SECTION 4 - THINKING STYLE
SECTION 5 - LEARNING STYLE
SECTION 6 - CREATIVE PROFILE
SECTION 7 - COLLABORATION PROFILE
SECTION 8 - ENVIRONMENTAL FIT (Thrives In / Suppressed Or Distorted In)
SECTION 9 - UNIQUE CONTRIBUTIONS
SECTION 10 - OPPORTUNITY ALIGNMENT
SECTION 11 - POTENTIAL BLIND SPOTS
SECTION 12 - LIGHTHOUSE SUMMARY

The Lighthouse Summary answers this question:
'If someone truly understood this person, what would they recognize about them that traditional resumes, applications, profiles, and assessments are likely to miss?'

Write the Lighthouse Summary with full voltage. This is the heart of the profile.`;

function transcript(turns: { role: string; text: string }[]) {
  return turns.map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`).join("\n\n");
}

function textFrom(payload: any) {
  const text = payload.content?.map((block: any) => block.type === "text" ? block.text : "").join("").trim();
  if (!text) throw new Error("Anthropic response did not include text.");
  return text;
}

export function createAnthropicSynthesisProvider(): SynthesisProvider {
  return {
    async generateProfile(input) {
      const payload = await anthropicFetch("/v1/messages", {
        model: env.anthropicModel,
        max_tokens: 4000,
        temperature: 0.75,
        system: [{ type: "text", text: input.systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: `${transcript(input.turns)}\n\n${synthesisInstruction}`,
          },
        ],
      });
      return { profileMarkdown: textFrom(payload) };
    },
  };
}
