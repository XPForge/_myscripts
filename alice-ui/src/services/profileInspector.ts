import { jobClusters } from "./jobClusterEngine";
import type { OnboardingProfile } from "./onboardingProfile";
import { calculateProfileConfidence } from "./profileConfidence";

const modeDescriptions: Record<OnboardingProfile["mode"], string> = {
  precision: "Narrow fit focus with aligned opportunity exposure.",
  exploration: "Broad exploration across adjacent industries.",
  discovery: "Discovery-driven recommendations for new identity signals.",
  reset: "Sustainable reset orientation with lower-friction roles.",
  hybrid: "Balanced hybrid fit for creative-technical opportunities.",
};

function labelCluster(clusterId: string): string {
  return jobClusters.find((cluster) => cluster.id === clusterId)?.label ?? clusterId;
}

export type ProfileSummary = {
  headline: string;
  details: string[];
  recommendations: string[];
};

export function summarizeProfile(profile: OnboardingProfile): ProfileSummary {
  const confidence = calculateProfileConfidence(profile);
  const topClusters = Object.entries(profile.clusterAffinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([clusterId, value]) => `${labelCluster(clusterId)} (${(value * 100).toFixed(0)}%)`);

  const headline = profile.mode
    ? `ALICE is currently operating in ${profile.mode} mode.`
    : "ALICE has not yet established a strong onboarding mode.";

  const details: string[] = [];
  details.push(modeDescriptions[profile.mode] ?? "ALICE is calibrating a strategic recommendation intent.");
  details.push(
    `Profile confidence is ${(confidence.profileConfidence * 100).toFixed(0)}% with identity coverage at ${(confidence.identityCoverage * 100).toFixed(0)}%.
  `
  );

  if (profile.preferredIndustries.length > 0) {
    details.push(`Preferred industries: ${profile.preferredIndustries.join(", ")}.`);
  } else {
    details.push("Industry interests are still open and can guide exploration.");
  }

  if (profile.excludedIndustries.length > 0) {
    details.push(`Excluded industries: ${profile.excludedIndustries.join(", ")}.`);
  }

  if (topClusters.length > 0) {
    details.push(`Top inferred cluster affinities: ${topClusters.join(", ")}.`);
  } else {
    details.push("Cluster alignment remains broad; ALICE is gathering more signal.");
  }

  if (profile.confirmedObservations.length > 0) {
    details.push(`Confirmed observations: ${profile.confirmedObservations.join("; ")}.`);
  }

  if (profile.rejectedObservations.length > 0) {
    details.push(`Previously rejected interpretations: ${profile.rejectedObservations.join("; ")}.`);
  }

  const recommendations: string[] = [];
  if (profile.explorationLevel >= 0.8) {
    recommendations.push("Maintain discovery momentum with adjacent clusters.");
  }
  if (profile.certaintyScore >= 0.8) {
    recommendations.push("Strengthen precision by refining top-fit clusters.");
  }
  if (confidence.missingSignals.length > 0) {
    recommendations.push(
      `Signal gaps detected: ${confidence.missingSignals.join(", ")}. Collect more onboarding or observation feedback.`
    );
  }

  return {
    headline,
    details,
    recommendations,
  };
}
