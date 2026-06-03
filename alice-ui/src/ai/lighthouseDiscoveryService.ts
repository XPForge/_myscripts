import type { LighthouseProfile } from "../services/lighthouseProfile";
import type { RealtimeSessionConfig } from "../engine/runtime";

const OPENAI_REALTIME_TOKEN_ENDPOINT =
  import.meta.env.VITE_OPENAI_REALTIME_TOKEN_ENDPOINT || "";
const OPENAI_REALTIME_MODEL =
  import.meta.env.VITE_OPENAI_REALTIME_MODEL || "gpt-realtime";
const USE_MOCK_REALTIME_DISCOVERY =
  import.meta.env.VITE_MOCK_REALTIME_DISCOVERY === "true";

export type RealtimeDiscoverySession = RealtimeSessionConfig;

export function isRealtimeDiscoveryConfigured(): boolean {
  return USE_MOCK_REALTIME_DISCOVERY || Boolean(OPENAI_REALTIME_TOKEN_ENDPOINT);
}

export function buildRealtimeSessionPayload(
  profile: LighthouseProfile,
  sessionId?: string
) {
  return {
    model: OPENAI_REALTIME_MODEL,
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
  sessionId?: string
): Promise<RealtimeSessionConfig> {
  if (USE_MOCK_REALTIME_DISCOVERY) {
    return {
      sessionId: `mock-realtime-${profile.id}`,
      token: "mock-realtime-token",
      model: "mock-realtime",
      status: "active",
      endpoint: "mock://realtime-discovery",
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
    body: JSON.stringify(buildRealtimeSessionPayload(profile, sessionId)),
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
  };

  return {
    sessionId: payload.sessionId,
    token: payload.token,
    model: payload.model ?? OPENAI_REALTIME_MODEL,
    status: payload.status ?? "active",
    endpoint: payload.endpoint,
    createdAt: new Date().toISOString(),
  };
}
