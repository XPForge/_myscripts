export const lighthouseDiscoveryConfig = {
  chatModel: "gpt-5.6-sol",
  transcriptionModel: "gpt-4o-transcribe",
  ttsModel: "gpt-4o-mini-tts",
  voiceName: "coral",
  ttsInstructions:
    "Speak as Alice, a calm, warm, and genuinely interested discovery guide. Sound completely relaxed and unhurried, like a comfortable conversation with a friend — soft, easy, and unforced. Let warmth come through naturally and quietly, without any performance or brightness. Speak slowly and gently, with real pauses, like you have all the time in the world. Stay sincere and grounded. Avoid sounding corporate, robotic, childish, or like customer service.",
  shortTtsInstructions:
    "Speak calmly, warmly, and unhurried, like a comfortable conversation with a friend — soft and easy, with real pauses, without any performance or brightness. Avoid sounding corporate, robotic, or childish.",
  responseFormat: "mp3",
  playbackRate: 1.08,
  defaultAlicePromptProfileId: "weighted-synthesis",
  defaultVoiceOn: true,
  defaultQuietMode: false,
  animation: { listening: 1800, speaking: 650, thinking: 2200, loading: 900 },
  layout: { leftRail: 280, rightRail: 320, centerMax: 900 },
} as const;
