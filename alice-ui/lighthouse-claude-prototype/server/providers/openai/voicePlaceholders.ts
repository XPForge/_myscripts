export type SpeechToTextProvider = {
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
};

export type TextToSpeechProvider = {
  synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }>;
};

export function createDeferredSpeechToTextProvider(): SpeechToTextProvider {
  return {
    async transcribe() {
      throw new Error("Voice layer is deferred in the Anthropic Claude prototype.");
    },
  };
}

export function createDeferredTextToSpeechProvider(): TextToSpeechProvider {
  return {
    async synthesize() {
      throw new Error("Voice layer is deferred in the Anthropic Claude prototype.");
    },
  };
}
