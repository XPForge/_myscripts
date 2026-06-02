import type { LighthouseProfile } from "../services/lighthouseProfile";
import type { DiscoverySessionState } from "../engine/agent/discovery";
import {
  assembleDiscoveryPrompt,
  type DiscoveryPromptAssembly,
} from "../engine/agent/prompt";
import { lighthouseCorePrinciples } from "./lighthousePrinciples";

export const lighthousePromptVersion = "2.0";

export const lighthousePromptAsset = {
  version: lighthousePromptVersion,
  name: "Lighthouse Discovery Agent",
  description:
    "A voice-first discovery agent that guides participants with dignity, preserves emerging thought, and captures profile ownership metadata.",
  principles: lighthouseCorePrinciples,
  instruction:
    "Discovery prompt instructions are assembled from Discovery configuration, session state, and the latest behavior decision.",
};

export function buildDiscoveryPromptAssembly(
  profile: LighthouseProfile,
  state?: Partial<DiscoverySessionState>
): DiscoveryPromptAssembly {
  return assembleDiscoveryPrompt({
    profile,
    state,
    runtimeMode: "realtimeVoice",
    refreshReason: state?.latestBehaviorDecision
      ? "latest-behavior-decision"
      : "legacy-prompt-request",
  });
}

export function buildDiscoverySystemPrompt(
  profile: LighthouseProfile,
  state?: Partial<DiscoverySessionState>
): string {
  return buildDiscoveryPromptAssembly(profile, state).systemPrompt;
}

export function buildDiscoveryMessages(
  profile: LighthouseProfile,
  history: Array<{ role: "system" | "user" | "assistant"; content: string; createdAt: string }>,
  state?: Partial<DiscoverySessionState>
) {
  return [
    {
      role: "system" as const,
      content: buildDiscoverySystemPrompt(profile, state),
      createdAt: new Date().toISOString(),
    },
    ...history,
  ];
}
