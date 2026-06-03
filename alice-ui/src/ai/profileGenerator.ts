import type { AIMessage, LighthouseProfile } from "../services/lighthouseProfile";
import { isOpenAIConfigured, createOpenAICompletion } from "./lighthouseService";

export function buildExportProfileText(profile: LighthouseProfile): string {
  return [`Lighthouse Profile: ${profile.lpId}`,
    `Name: ${profile.name}`,
    `Email: ${profile.email}`,
    `Profile version: ${profile.profileVersion}`,
    `Discovery method: ${profile.discoveryMethod}`,
    `Discovery status: ${profile.discoveryStatus}`,
    "",
    `Discovery summary:\n${profile.discoverySummary || "(summary pending)"}`,
    "",
    `Work motivators:\n${profile.workMotivators}`,
    "",
    `Work frustrators:\n${profile.workFrustrators}`,
    "",
    `Learning characteristics:\n${profile.learningCharacteristics}`,
    "",
    `Problem-solving characteristics:\n${profile.problemSolvingCharacteristics}`,
    "",
    `Communication characteristics:\n${profile.communicationCharacteristics}`,
    "",
    `Leadership characteristics:\n${profile.leadershipCharacteristics}`,
    "",
    `Collaboration characteristics:\n${profile.collaborationCharacteristics}`,
    "",
    `Environmental accelerators:\n${profile.environmentalAccelerators}`,
    "",
    `Environmental inhibitors:\n${profile.environmentalInhibitors}`,
    "",
    `Adaptability characteristics:\n${profile.adaptabilityCharacteristics}`,
    "",
    `Pressure / setback response:\n${profile.pressureResponse}`,
    "",
    `Opportunity indicators:\n${profile.opportunityIndicators}`,
    "",
    `Frequently overlooked characteristics:\n${profile.overlookedCharacteristics}`,
    "",
    `Supporting evidence / examples:\n${profile.supportingEvidence}`,
    "",
    `Emergent employment-relevant discoveries:\n${profile.emergentDiscoveries}`,
    "",
    `Not yet discovered:\n${profile.notYetDiscovered}`,
    "",
    `Discovery notes:\n${profile.discoveryNotes}`,
  ].join("\n");
}

export function buildPdfPayload(profile: LighthouseProfile) {
  return {
    title: `Lighthouse Profile ${profile.lpId}`,
    createdAt: profile.createdAt,
    sections: [
      { title: "Discovery summary", content: profile.discoverySummary || "(pending)" },
      { title: "Work motivators", content: profile.workMotivators },
      { title: "Work frustrators", content: profile.workFrustrators },
      { title: "Learning characteristics", content: profile.learningCharacteristics },
      { title: "Problem-solving characteristics", content: profile.problemSolvingCharacteristics },
      { title: "Communication characteristics", content: profile.communicationCharacteristics },
      { title: "Leadership characteristics", content: profile.leadershipCharacteristics },
      { title: "Collaboration characteristics", content: profile.collaborationCharacteristics },
      { title: "Environmental accelerators", content: profile.environmentalAccelerators },
      { title: "Environmental inhibitors", content: profile.environmentalInhibitors },
      { title: "Adaptability characteristics", content: profile.adaptabilityCharacteristics },
      { title: "Pressure / setback response", content: profile.pressureResponse },
      { title: "Opportunity indicators", content: profile.opportunityIndicators },
      { title: "Frequently overlooked characteristics", content: profile.overlookedCharacteristics },
      { title: "Supporting evidence / examples", content: profile.supportingEvidence },
      { title: "Emergent discoveries", content: profile.emergentDiscoveries },
      { title: "Not yet discovered", content: profile.notYetDiscovered },
      { title: "Discovery notes", content: profile.discoveryNotes },
    ],
  };
}

export function shouldCompleteDiscovery(profile: LighthouseProfile): boolean {
  const fields = [
    profile.workMotivators,
    profile.workFrustrators,
    profile.learningCharacteristics,
    profile.problemSolvingCharacteristics,
    profile.communicationCharacteristics,
    profile.leadershipCharacteristics,
    profile.collaborationCharacteristics,
    profile.environmentalAccelerators,
    profile.environmentalInhibitors,
    profile.adaptabilityCharacteristics,
    profile.pressureResponse,
    profile.opportunityIndicators,
    profile.overlookedCharacteristics,
    profile.supportingEvidence,
    profile.emergentDiscoveries,
    profile.notYetDiscovered,
  ];
  const filled = fields.filter((value) => value.trim().length > 0).length;
  return filled >= 10;
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
    { role: "system", content: "You create Human Clarity Profiles from transcript evidence.", createdAt: new Date().toISOString() },
    { role: "user", content: prompt, createdAt: new Date().toISOString() },
  ];

  return createOpenAICompletion(messages);
}
