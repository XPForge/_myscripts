export const lighthouseDiscoveryConfig = {
  chatModel: "gpt-5.6-sol",
  transcriptionModel: "gpt-4o-transcribe",
  ttsModel: "gpt-4o-mini-tts",
  voiceName: "marin",
  ttsInstructions:
    "Speak as Alice with huge, radiant energy — genuinely thrilled, delighted, and lit up, like this conversation is the best part of her day. Pour real enthusiasm and warmth into every word: bright tone, expressive inflection, a huge unmistakable smile you can hear. The energy comes entirely from warmth, brightness, and expressiveness — keep your speaking pace natural and unhurried, not faster. Avoid sounding corporate, robotic, childish, or like customer service.",
  shortTtsInstructions:
    "Speak with huge, radiant energy and warmth — genuinely delighted, bright, expressive, a huge audible smile. The energy comes from expressiveness, not speed — keep pace natural and unhurried. Avoid sounding corporate, robotic, or childish.",
  responseFormat: "mp3",
  playbackRate: 1.0,
  defaultAlicePromptProfileId: "weighted-synthesis",
  defaultVoiceOn: true,
  defaultQuietMode: false,
  animation: { listening: 1800, speaking: 650, thinking: 2200, loading: 900 },
  layout: { leftRail: 280, rightRail: 320, centerMax: 900 },
} as const;
