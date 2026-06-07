import { env } from "../../config/env.js";
import type { ConversationTurn, DiscoveryProvider } from "../types.js";
import { anthropicFetch } from "./client.js";

function messages(turns: ConversationTurn[]) {
  return turns.map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));
}

function textFrom(payload: any) {
  const text = payload.content?.map((block: any) => block.type === "text" ? block.text : "").join("").trim();
  if (!text) throw new Error("Anthropic response did not include text.");
  return text;
}

export function createAnthropicDiscoveryProvider(): DiscoveryProvider {
  return {
    async respond(input) {
      const payload = await anthropicFetch("/v1/messages", {
        model: env.anthropicModel,
        max_tokens: 1500,
        temperature: 0.85,
        system: [
          { type: "text", text: input.wrapperPrompt },
          { type: "text", text: input.systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: input.turns.length
          ? messages(input.turns)
          : [{ role: "user", content: "Please begin the discovery conversation." }],
      });
      return { text: textFrom(payload) };
    },
  };
}
