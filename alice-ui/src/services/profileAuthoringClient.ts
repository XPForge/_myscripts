import { DISCOVERY_FIELD_KEYS, type DiscoveryFieldKey } from "./lighthouseProfile";

const PROFILE_AUTHORING_API_URL = "http://localhost:3001/api/profile/author";

export type AuthoredProfileFields = Record<DiscoveryFieldKey, string> & {
  discoverySummary: string;
  generatedProfile: string;
};

export type AuthorProfileResult = {
  model: string;
  fields: AuthoredProfileFields;
};

function toFieldString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function authorLighthouseProfile(
  transcript: string,
  participantName: string,
  participantEmail: string,
  retainForDevelopment: boolean
): Promise<AuthorProfileResult> {
  const response = await fetch(PROFILE_AUTHORING_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, participantName, participantEmail, retainForDevelopment }),
  });

  if (!response.ok) {
    let errorMessage = `Profile authoring failed: ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") errorMessage = payload.error;
    } catch {
      // keep default message
    }
    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as { model?: string; profile?: Record<string, unknown> };
  const rawProfile = payload.profile ?? {};

  const fields = Object.fromEntries(
    DISCOVERY_FIELD_KEYS.map((key) => [key, toFieldString(rawProfile[key])])
  ) as Record<DiscoveryFieldKey, string>;

  return {
    model: payload.model ?? "unknown",
    fields: {
      ...fields,
      discoverySummary: toFieldString(rawProfile.discoverySummary),
      generatedProfile: toFieldString(rawProfile.generatedProfile),
    },
  };
}
