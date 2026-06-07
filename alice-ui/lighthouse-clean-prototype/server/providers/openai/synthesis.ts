import { env } from "../../config/env.js";
import type { SynthesisProvider } from "../types.js";
import { openAiFetch } from "./client.js";

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

function transcriptText(turns: { role: string; text: string }[]) {
  return turns.map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`).join("\n\n");
}

function readOutputText(payload: any) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item: any) => item.content || [])
    ?.map((content: any) => content.text || "")
    ?.join("")
    ?.trim();

  if (!text) {
    throw new Error("OpenAI synthesis response did not include text.");
  }

  return text;
}

export function createOpenAiSynthesisProvider(): SynthesisProvider {
  return {
    async generateProfile(input) {
      const response = await openAiFetch("/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.synthesisModel,
          instructions: input.systemPrompt,
          input: [
            {
              role: "user",
              content: `${transcriptText(input.transcript)}\n\n${synthesisInstruction}`,
            },
          ],
          temperature: 0.75,
          max_output_tokens: 4000,
          store: false,
        }),
      });

      return { profileMarkdown: readOutputText(await response.json()) };
    },
  };
}
