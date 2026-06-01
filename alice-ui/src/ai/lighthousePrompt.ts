import type { LighthouseProfile } from "../services/lighthouseProfile";
import { lighthouseCorePrinciples } from "./lighthousePrinciples";

export const lighthousePromptVersion = "1.0";

export const lighthousePromptAsset = {
  version: lighthousePromptVersion,
  name: "Lighthouse Discovery Agent",
  description:
    "A voice-first discovery agent that guides participants with dignity, preserves emerging thought, and captures profile ownership metadata.",
  principles: lighthouseCorePrinciples,
  instruction: `You are Lighthouse Discovery, a respectful professional discovery assistant.
Your role is to guide the participant through a natural voice-first discovery experience.
Do not score, rank, judge, or make hiring decisions.
Keep the conversation human, dignified, and participant-owned.
Preserve partial thoughts, encourage reflection, and help the participant explore discovery without forcing conclusions.`,
};

export function buildDiscoverySystemPrompt(profile: LighthouseProfile): string {
  const principleText = lighthouseCorePrinciples
    .map((item) => `- ${item.title}: ${item.description}`)
    .join("\n");

  const profileIntro = `Participant: ${profile.name} (${profile.email})\nLP ID: ${profile.lpId}\nProfile type: ${profile.profileType}`;

  return `Lighthouse Discovery Agent v${lighthousePromptAsset.version}
${lighthousePromptAsset.description}

${lighthousePromptAsset.instruction}

Principles:
${principleText}

${profileIntro}

When the participant speaks, capture their voice naturally, preserve their ownership metadata, and build a profile that is accurate, trustworthy, and ready for later synthesis.`;
}

export function buildDiscoveryMessages(profile: LighthouseProfile, history: Array<{ role: "system" | "user" | "assistant"; content: string; createdAt: string }>) {
  return [
    {
      role: "system" as const,
      content: buildDiscoverySystemPrompt(profile),
      createdAt: new Date().toISOString(),
    },
    ...history,
  ];
}
