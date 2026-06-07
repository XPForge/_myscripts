import { env } from "../../config/env.js";
import type { ConversationTurn, DiscoveryProvider } from "../types.js";
import { openAiFetch } from "./client.js";

function toInput(turns: ConversationTurn[]) {
  return turns.map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));
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
    throw new Error("OpenAI discovery response did not include text.");
  }

  return text;
}

export function createOpenAiDiscoveryProvider(): DiscoveryProvider {
  return {
    async respond(input) {
      const instructions = `${input.wrapperPrompt}\n\n${input.systemPrompt}`;
      const response = await openAiFetch("/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.discoveryModel,
          instructions,
          input: toInput(input.turns),
          temperature: 0.85,
          max_output_tokens: 1500,
          store: false,
        }),
      });

      return { text: readOutputText(await response.json()) };
    },
  };
}
