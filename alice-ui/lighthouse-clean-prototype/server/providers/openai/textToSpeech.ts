import { env } from "../../config/env.js";
import type { TextToSpeechProvider } from "../types.js";
import { openAiFetch } from "./client.js";

export function createOpenAiTextToSpeechProvider(): TextToSpeechProvider {
  return {
    async synthesize(text) {
      const response = await openAiFetch("/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.ttsModel,
          voice: env.ttsVoice,
          input: text,
          response_format: "mp3",
        }),
      });

      return {
        audio: Buffer.from(await response.arrayBuffer()),
        mimeType: "audio/mpeg",
      };
    },
  };
}
