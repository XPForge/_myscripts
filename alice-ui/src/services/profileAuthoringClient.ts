import { OZ_SCHEMA_AREAS } from "./ozSchemaCoverage";
import type { OzSchemaArea } from "../oz/ozDiscoveryCaptureTypes";

// Relative path — served by api/profile-author.js locally (via the Vite dev
// plugin) and on Vercel (as a real serverless function), so it works the same
// way in both places instead of pointing at a hardcoded localhost port.
const PROFILE_AUTHORING_API_URL = "/api/profile-author";
const PROFILE_DELIVERY_API_URL = "/api/profile-delivery";

export type AuthoredProfileFields = Record<OzSchemaArea, string> & {
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
  retainForDevelopment: boolean,
  sessionId?: string
): Promise<AuthorProfileResult> {
  const response = await fetch(PROFILE_AUTHORING_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sessionId ? { "X-Lighthouse-Session-Id": sessionId } : {}) },
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
    OZ_SCHEMA_AREAS.map((key) => [key, toFieldString(rawProfile[key])])
  ) as Record<OzSchemaArea, string>;

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
  fields: AuthoredProfileFields,
  sessionId?: string
): Promise<void> {
  const response = await fetch(PROFILE_DELIVERY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sessionId ? { "X-Lighthouse-Session-Id": sessionId } : {}) },
    body: JSON.stringify({ mode: "email", participantName, participantEmail, profile: fields }),
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
  const response = await fetch(PROFILE_DELIVERY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "pdf", participantName, profile: fields }),
  });

  if (!response.ok) {
    throw new Error(`PDF generation failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const slug = participantName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "participant";
  a.download = `lighthouse-discovery-profile-${slug}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
