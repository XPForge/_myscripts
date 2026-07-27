import { DISCOVERY_FIELD_KEYS, type DiscoveryFieldKey } from "./lighthouseProfile";

// Relative path — served by api/profile-author.js locally (via the Vite dev
// plugin) and on Vercel (as a real serverless function), so it works the same
// way in both places instead of pointing at a hardcoded localhost port.
const PROFILE_AUTHORING_API_URL = "/api/profile-author";
const SEND_PROFILE_EMAIL_API_URL = "/api/send-profile-email";
const GENERATE_PROFILE_PDF_API_URL = "/api/generate-profile-pdf";

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

export async function sendProfileEmail(
  participantName: string,
  participantEmail: string,
  fields: AuthoredProfileFields
): Promise<void> {
  const response = await fetch(SEND_PROFILE_EMAIL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantName, participantEmail, profile: fields }),
  });

  if (!response.ok) {
    let errorMessage = `Email delivery failed: ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") errorMessage = payload.error;
    } catch {
      // keep default message
    }
    throw new Error(errorMessage);
  }
}

export async function downloadProfilePdf(participantName: string, fields: AuthoredProfileFields): Promise<void> {
  const response = await fetch(GENERATE_PROFILE_PDF_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantName, profile: fields }),
  });

  if (!response.ok) {
    throw new Error(`PDF generation failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lighthouse-discovery-profile.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
