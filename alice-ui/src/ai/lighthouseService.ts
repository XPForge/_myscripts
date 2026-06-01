import type { AIMessage } from "../services/lighthouseProfile";
import { buildDiscoveryMessages, buildDiscoverySystemPrompt } from "./lighthousePrompt";
import type { LighthouseProfile } from "../services/lighthouseProfile";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_BASE = import.meta.env.VITE_OPENAI_API_BASE || "https://api.openai.com";
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-4.1-mini";

function hasOpenAIKey(): boolean {
  return typeof OPENAI_API_KEY === "string" && OPENAI_API_KEY.length > 0;
}

export function isOpenAIConfigured(): boolean {
  return hasOpenAIKey();
}

export async function createOpenAICompletion(messages: AIMessage[]): Promise<string> {
  if (!hasOpenAIKey()) {
    throw new Error("OpenAI API key is not configured. Set VITE_OPENAI_API_KEY.");
  }

  const response = await fetch(`${OPENAI_API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.9,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText} ${errorBody}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function sendDiscoveryMessage(
  profile: LighthouseProfile,
  history: AIMessage[],
  userMessage: string
): Promise<{ assistantText: string; nextHistory: AIMessage[] }> {
  const now = new Date().toISOString();
  const nextHistory: AIMessage[] = [
    ...history,
    { role: "user", content: userMessage, createdAt: now },
  ];

  const messages = buildDiscoveryMessages(profile, nextHistory);
  const assistantText = await createOpenAICompletion(messages);
  const assistantMessage: AIMessage = {
    role: "assistant",
    content: assistantText,
    createdAt: new Date().toISOString(),
  };

  return {
    assistantText,
    nextHistory: [...nextHistory, assistantMessage],
  };
}

export function createSystemMessageFromInput(profile: LighthouseProfile): AIMessage {
  return {
    role: "system",
    content: `${buildDiscoverySystemPrompt(profile)}`,
    createdAt: new Date().toISOString(),
  };
}
