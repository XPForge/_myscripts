export const lighthouseDiscoveryConfig = {
  chatModel: "gpt-5.6-sol",
  transcriptionModel: "gpt-4o-transcribe",
  ttsModel: "gpt-4o-mini-tts",
  voiceName: "sage",
  ttsInstructions:
    "Speak as Alice, a warm, intelligent, emotionally present discovery guide. Sound upbeat, friendly, encouraging, and naturally engaged. Use a lively conversational pace with brief, comfortable pauses. Keep the delivery sincere and grounded, with a gentle smile in the voice. Avoid sounding corporate, robotic, theatrical, childish, overly cheerful, or like customer service.",
  shortTtsInstructions:
    "Speak warmly, naturally, and at a lively conversational pace. Sound upbeat, friendly, encouraging, and genuinely engaged without becoming overly cheerful, rushed, corporate, robotic, or theatrical.",
  responseFormat: "mp3",
  playbackRate: 1.08,
  defaultAlicePromptProfileId: "bare-signal",
  defaultVoiceOn: true,
  defaultQuietMode: false,
  animation: { listening: 1800, speaking: 650, thinking: 2200, loading: 900 },
  layout: { leftRail: 280, rightRail: 320, centerMax: 900 },
} as const;
