import type { OnboardingProfile } from "./onboardingProfile";

export type ProfileConfidence = {
  profileConfidence: number;
  identityCoverage: number;
  signalStrength: number;
  missingSignals: string[];
};

export function calculateProfileConfidence(profile: OnboardingProfile): ProfileConfidence {
  const modeScore = profile.mode ? 1 : 0;
  const promptScore = Math.min(profile.promptHistory.length / 2, 1);
  const industryScore = profile.preferredIndustries.length > 0 ? 1 : 0;
  const directionScore = profile.directionInterests.length > 0 ? 1 : 0;
  const clusterCount = Object.keys(profile.clusterAffinities).length;
  const clusterScore = Math.min(clusterCount / 3, 1);
  const observationScore = Math.min((profile.confirmedObservations.length * 0.14 + profile.rejectedObservations.length * 0.07) / 0.2, 1);

  const rawConfidence =
    0.25 * modeScore +
    0.2 * promptScore +
    0.18 * industryScore +
    0.12 * directionScore +
    0.15 * clusterScore +
    0.1 * observationScore;

  const profileConfidence = Math.min(Math.max(rawConfidence, 0), 1);
  const identityCoverage = (modeScore + promptScore + industryScore + directionScore + clusterScore + observationScore) / 6;
  const signalStrength = Math.min((profile.certaintyScore + profile.explorationLevel) / 2, 1);

  const missingSignals: string[] = [];
  if (!profile.mode) missingSignals.push("onboarding mode");
  if (profile.promptHistory.length === 0) missingSignals.push("prompt signals");
  if (profile.preferredIndustries.length === 0) missingSignals.push("industry interests");
  if (profile.directionInterests.length === 0) missingSignals.push("directional signals");
  if (clusterCount < 2) missingSignals.push("cluster affinity diversity");
  if (profile.confirmedObservations.length === 0 && profile.rejectedObservations.length === 0) {
    missingSignals.push("observation feedback");
  }

  return {
    profileConfidence,
    identityCoverage,
    signalStrength,
    missingSignals,
  };
}
