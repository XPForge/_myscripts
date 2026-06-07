import { env } from "../../config/env.js";
import type { SpeechToTextProvider } from "../types.js";
import { openAiFetch } from "./client.js";

export function createOpenAiSpeechToTextProvider(): SpeechToTextProvider {
  return {
    async transcribe(audio, mimeType) {
      const form = new FormData();
      const arrayBuffer = new ArrayBuffer(audio.byteLength);
      new Uint8Array(arrayBuffer).set(audio);
      const file = new Blob([arrayBuffer], { type: mimeType || "audio/webm" });
      form.append("file", file, "participant-audio.webm");
      form.append("model", env.transcriptionModel);

      const response = await openAiFetch("/v1/audio/transcriptions", {
        method: "POST",
        body: form,
      });

      const payload = await response.json();
      if (typeof payload.text !== "string" || !payload.text.trim()) {
        throw new Error("OpenAI transcription response did not include text.");
      }

      return payload.text.trim();
    },
  };
}
