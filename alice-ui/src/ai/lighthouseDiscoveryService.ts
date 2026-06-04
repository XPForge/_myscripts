import type { LighthouseProfile } from "../services/lighthouseProfile";
import type { RealtimeOutputModality, RealtimeSessionConfig } from "../engine/runtime";

const OPENAI_REALTIME_TOKEN_ENDPOINT =
  import.meta.env.VITE_OPENAI_REALTIME_TOKEN_ENDPOINT || "";
const OPENAI_REALTIME_MODEL =
  import.meta.env.VITE_OPENAI_REALTIME_MODEL || "gpt-realtime";
const USE_MOCK_REALTIME_DISCOVERY =
  import.meta.env.VITE_MOCK_REALTIME_DISCOVERY === "true";

export const REALTIME_VOICE_OPTIONS = [
  { id: "cedar", label: "Cedar" },
  { id: "marin", label: "Marin" },
  { id: "alloy", label: "Alloy" },
  { id: "ash", label: "Ash" },
  { id: "ballad", label: "Ballad" },
  { id: "coral", label: "Coral" },
  { id: "echo", label: "Echo" },
  { id: "sage", label: "Sage" },
  { id: "shimmer", label: "Shimmer" },
  { id: "verse", label: "Verse" },
] as const;

export type RealtimeVoiceId = typeof REALTIME_VOICE_OPTIONS[number]["id"];

export type RealtimeDiscoverySession = RealtimeSessionConfig;

export function isRealtimeDiscoveryConfigured(): boolean {
  return USE_MOCK_REALTIME_DISCOVERY || Boolean(OPENAI_REALTIME_TOKEN_ENDPOINT);
}

export function buildRealtimeSessionPayload(
  profile: LighthouseProfile,
  sessionId?: string,
  outputModality: RealtimeOutputModality = "audio",
  voice?: string
) {
  return {
    model: OPENAI_REALTIME_MODEL,
    outputModality,
    voice,
    profileMetadata: {
      id: profile.id,
      lpId: profile.lpId,
      name: profile.name,
      email: profile.email,
      profileType: profile.profileType,
      profileVersion: profile.profileVersion,
      discoveryMethod: profile.discoveryMethod,
    },
    sessionMetadata: {
      sessionId,
    },
  };
}

export async function requestRealtimeDiscoverySession(
  profile: LighthouseProfile,
  sessionId?: string,
  outputModality: RealtimeOutputModality = "audio",
  voice?: string
): Promise<RealtimeSessionConfig> {
  if (USE_MOCK_REALTIME_DISCOVERY) {
    return {
      sessionId: `mock-realtime-${profile.id}`,
      token: "mock-realtime-token",
      model: "mock-realtime",
      status: "active",
      endpoint: "mock://realtime-discovery",
      outputModality,
      createdAt: new Date().toISOString(),
    };
  }

  if (!OPENAI_REALTIME_TOKEN_ENDPOINT) {
    throw new Error(
      "Realtime discovery endpoint is not configured. Set VITE_OPENAI_REALTIME_TOKEN_ENDPOINT."
    );
  }

  const response = await fetch(OPENAI_REALTIME_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRealtimeSessionPayload(profile, sessionId, outputModality, voice)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Unable to request realtime session: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  const payload = (await response.json()) as {
    sessionId: string;
    token: string;
    model?: string;
    status?: "initializing" | "active" | "complete";
    endpoint?: string;
    outputModality?: RealtimeOutputModality;
  };

  return {
    sessionId: payload.sessionId,
    token: payload.token,
    model: payload.model ?? OPENAI_REALTIME_MODEL,
    status: payload.status ?? "active",
    endpoint: payload.endpoint,
    outputModality: payload.outputModality ?? outputModality,
    createdAt: new Date().toISOString(),
  };
}
