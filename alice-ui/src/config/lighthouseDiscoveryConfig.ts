export const lighthouseDiscoveryConfig = {
  chatModel: "gpt-5.6-sol",
  transcriptionModel: "gpt-4o-transcribe",
  ttsModel: "gpt-4o-mini-tts",
  voiceName: "coral",
  ttsInstructions:
    "Speak as Alice, a vibrant, high-energy discovery guide who is genuinely thrilled to be in this conversation. Sound bright, bold, and enthusiastic — real excitement and warmth radiating through every word, like you can't wait to hear what this person has to say. Speak at a natural, unhurried conversational pace — take your time, do not rush your words — while still carrying strong, confident energy and warmth. Stay sincere and grounded, never fake or over-the-top theatrical, but let the energy be unmistakable and infectious. Avoid sounding corporate, robotic, childish, or like customer service.",
  shortTtsInstructions:
    "Speak with bright, bold energy and genuine enthusiasm, at a natural, unhurried pace — do not rush. Sound thrilled and warmly engaged — infectious energy, not theatrical — without becoming corporate, robotic, or childish.",
  responseFormat: "mp3",
  playbackRate: 1.08,
  defaultAlicePromptProfileId: "weighted-synthesis",
  defaultVoiceOn: true,
  defaultQuietMode: false,
  animation: { listening: 1800, speaking: 650, thinking: 2200, loading: 900 },
  layout: { leftRail: 280, rightRail: 320, centerMax: 900 },
} as const;
