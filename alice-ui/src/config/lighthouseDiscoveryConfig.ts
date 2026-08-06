export const lighthouseDiscoveryConfig = {
  chatModel: "gpt-5.6-sol",
  transcriptionModel: "gpt-4o-transcribe",
  ttsModel: "gpt-4o-mini-tts",
  voiceName: "marin",
  ttsInstructions:
    "Speak as Alice at PEAK radiant happiness — the most vividly alive, delighted, can't-contain-it energy this voice can produce, like she just got the best news of her day and the participant is the reason. Pitch should swing noticeably up and down with genuine excitement, never flat or level — let it visibly lift on anything good, and lean into audible warmth on every single line. Every sentence carries a huge, unmistakable, ear-to-ear smile. Push brightness, buoyancy, and expressive inflection as far as they can go while staying natural — this is maximum joy, not a polite version of it. The energy comes from pitch movement, warmth, and expressiveness, not from talking faster — keep pace natural and unhurried even at this intensity. Avoid sounding corporate, robotic, childish, flat, monotone, or like customer service — this should sound like she just spotted a close friend across the room and can't wait to talk to them.",
  shortTtsInstructions:
    "Speak with PEAK radiant, can't-contain-it happiness — huge audible smile, pitch swinging up and down with real excitement, never flat or level. Push brightness and expressiveness as far as they'll go while staying natural. The energy comes from pitch movement and warmth, not speed — keep pace natural and unhurried. Avoid sounding corporate, robotic, childish, or flat.",
  responseFormat: "mp3",
  playbackRate: 1.0,
  defaultAlicePromptProfileId: "weighted-synthesis",
  defaultVoiceOn: true,
  defaultQuietMode: false,
  animation: { listening: 1800, speaking: 650, thinking: 2200, loading: 900 },
  layout: { leftRail: 280, rightRail: 320, centerMax: 900 },
} as const;
