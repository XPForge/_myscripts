import { env } from "../../config/env.js";

export class OpenAiProviderError extends Error {
  constructor(message = "OpenAI provider request failed.") {
    super(message);
    this.name = "OpenAiProviderError";
  }
}

export async function openAiFetch(path: string, init: RequestInit) {
  if (!env.openAiApiKey) {
    throw new OpenAiProviderError();
  }

  const response = await fetch(`${env.openAiApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new OpenAiProviderError();
  }

  return response;
}
