import { env } from "../../config/env.js";

export class AnthropicProviderError extends Error {
  constructor() {
    super("Anthropic provider request failed.");
    this.name = "AnthropicProviderError";
  }
}

export async function anthropicFetch(path: string, body: unknown) {
  if (!env.anthropicApiKey) {
    throw new AnthropicProviderError();
  }

  const response = await fetch(`${env.anthropicApiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AnthropicProviderError();
  }

  return response.json();
}
