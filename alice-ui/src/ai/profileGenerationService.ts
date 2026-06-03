import type { AIMessage, LighthouseProfile } from "../services/lighthouseProfile";
import { createOpenAICompletion, isOpenAIConfigured } from "./lighthouseService";

export type StructuredProfileOutput = {
  observations: string[];
  participantStatements: string[];
  characteristics: Record<string, string>;
  discoveryConfidence: Record<string, number>;
  summary: string;
};

export function buildStructuredProfile(profile: LighthouseProfile): StructuredProfileOutput {
  const characteristics: Record<string, string> = {
    workMotivators: profile.workMotivators,
    workFrustrators: profile.workFrustrators,
    learningCharacteristics: profile.learningCharacteristics,
    problemSolvingCharacteristics: profile.problemSolvingCharacteristics,
    communicationCharacteristics: profile.communicationCharacteristics,
    leadershipCharacteristics: profile.leadershipCharacteristics,
    collaborationCharacteristics: profile.collaborationCharacteristics,
    environmentalAccelerators: profile.environmentalAccelerators,
    environmentalInhibitors: profile.environmentalInhibitors,
    adaptabilityCharacteristics: profile.adaptabilityCharacteristics,
    pressureResponse: profile.pressureResponse,
    opportunityIndicators: profile.opportunityIndicators,
    overlookedCharacteristics: profile.overlookedCharacteristics,
    supportingEvidence: profile.supportingEvidence,
    emergentDiscoveries: profile.emergentDiscoveries,
    notYetDiscovered: profile.notYetDiscovered,
  };

  return {
    observations: profile.observations,
    participantStatements: profile.participantStatements,
    characteristics,
    discoveryConfidence: profile.discoveryConfidence,
    summary: profile.discoverySummary || "",
  };
}

export function buildExportProfileText(profile: LighthouseProfile): string {
  const lines: string[] = [];
  lines.push(`Lighthouse Profile: ${profile.lpId}`);
  lines.push(`Name: ${profile.name}`);
  lines.push(`Email: ${profile.email}`);
  lines.push(`Profile version: ${profile.profileVersion}`);
  lines.push(`Profile type: ${profile.profileType}`);
  lines.push(`Discovery method: ${profile.discoveryMethod}`);
  lines.push(`Discovery status: ${profile.discoveryStatus}`);
  lines.push(`Discovery principles version: ${profile.discoveryPrinciplesVersion}`);
  lines.push(`
Ownership metadata:`);
  lines.push(`  Owner: ${profile.profileOwnership.ownerName}`);
  lines.push(`  Email: ${profile.profileOwnership.ownerEmail}`);
  lines.push(`  Consent at: ${profile.profileOwnership.consentAt}`);
  lines.push(`
Discovery summary:
${profile.discoverySummary || "(pending)"}`);
  lines.push(`
Observations:`);
  lines.push(profile.observations.length ? profile.observations.join("\n") : "(none captured yet)");
  lines.push(`
Participant statements:`);
  lines.push(profile.participantStatements.length ? profile.participantStatements.join("\n") : "(none captured yet)");
  lines.push(`
Characteristics:`);
  Object.entries(profile.characteristics).forEach(([key, value]) => {
    lines.push(`${key}: ${value}`);
  });
  lines.push(`
Discovery confidence:`);
  Object.entries(profile.discoveryConfidence).forEach(([key, value]) => {
    lines.push(`${key}: ${value}`);
  });
  lines.push(`
Coverage metrics:`);
  lines.push(`  Total fields: ${profile.coverageMetrics.totalFields}`);
  lines.push(`  Captured fields: ${profile.coverageMetrics.capturedCount}`);
  lines.push(`  Coverage: ${profile.coverageMetrics.percentage}%`);
  lines.push(`
Discovery notes:
${profile.discoveryNotes}`);
  if (profile.generatedProfile) {
    lines.push(`
Generated profile:
${profile.generatedProfile}`);
  }
  return lines.join("\n");
}

export function buildPdfPayload(profile: LighthouseProfile) {
  return {
    title: `Lighthouse Profile ${profile.lpId}`,
    createdAt: profile.createdAt,
    sections: [
      { title: "Discovery summary", content: profile.discoverySummary || "(pending)" },
      { title: "Profile ownership", content: `Owner: ${profile.profileOwnership.ownerName}\nEmail: ${profile.profileOwnership.ownerEmail}` },
      { title: "Observations", content: profile.observations.join("\n") || "(none captured yet)" },
      { title: "Participant statements", content: profile.participantStatements.join("\n") || "(none captured yet)" },
      { title: "Characteristics", content: Object.entries(profile.characteristics)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n") || "(none captured yet)" },
      { title: "Discovery confidence", content: Object.entries(profile.discoveryConfidence)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n") || "(pending)" },
      { title: "Coverage metrics", content: `Captured ${profile.coverageMetrics.capturedCount} of ${profile.coverageMetrics.totalFields} fields (${profile.coverageMetrics.percentage}%)` },
      { title: "Discovery notes", content: profile.discoveryNotes || "(pending)" },
    ],
  };
}

export function shouldCompleteDiscovery(profile: LighthouseProfile): boolean {
  return (
    profile.coverageMetrics.percentage >= 70 ||
    profile.coverageMetrics.capturedCount >= 10 ||
    profile.generatedProfile !== undefined
  );
}

export async function generateFinalProfileOutput(profile: LighthouseProfile): Promise<string> {
  if (!isOpenAIConfigured()) {
    return buildExportProfileText(profile);
  }

  const prompt = `Create a Human Clarity Profile based on the information below.

Use clean Markdown and this structure:

SECTION 1 — EXECUTIVE SUMMARY
SECTION 2 — CORE THEMES
SECTION 3 — NATURAL STRENGTHS
SECTION 4 — THINKING STYLE
SECTION 5 — LEARNING STYLE
SECTION 6 — CREATIVE PROFILE
SECTION 7 — COLLABORATION PROFILE
SECTION 8 — ENVIRONMENTAL FIT
SECTION 9 — UNIQUE CONTRIBUTIONS
SECTION 10 — OPPORTUNITY ALIGNMENT
SECTION 11 — POTENTIAL BLIND SPOTS
SECTION 12 — LIGHTHOUSE SUMMARY

Use concise but meaningful language. Focus on understanding rather than evaluation. Do not invent facts, scores, diagnoses, or hidden traits.

${buildExportProfileText(profile)}`;

  const messages: AIMessage[] = [
    {
      role: "system",
      content: "You create Human Clarity Profiles from transcript evidence.",
      createdAt: new Date().toISOString(),
    },
    {
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    },
  ];

  return createOpenAICompletion(messages);
}
