import { discoverySystemPrompt } from "./discoveryPrompt";
import type { ConversationMessage } from "./discoveryState";

export async function sendDiscoveryMessage(messages: ConversationMessage[]) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: discoverySystemPrompt,
      messages: messages.map((message) => ({
        role: message.role === "participant" ? "user" : "assistant",
        content: message.content,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error("Alice could not respond right now.");
  }

  const payload = (await response.json()) as { reply?: string };
  return payload.reply?.trim() || "That's useful context. What feels important to add next?";
}

