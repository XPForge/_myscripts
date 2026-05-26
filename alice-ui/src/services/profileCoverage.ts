import type { ConfidenceDomains, ConfidenceDomainKey } from "./confidenceDomains";
import type { OnboardingMode } from "./onboardingEngine";

export type ProfileCoverage = {
  domainConfidence: Record<ConfidenceDomainKey, number>;
  totalProfileConfidence: number;
  onboardingReadiness: boolean;
  missingDomains: string[];
  ambiguousDomains: string[];
  modeReadinessThreshold: number;
};

const modeReadinessThresholds: Record<OnboardingMode, number> = {
  precision: 0.78,
  exploration: 0.68,
  discovery: 0.58,
  reset: 0.62,
  hybrid: 0.7,
};

export function calculateProfileCoverage(
  domains: ConfidenceDomains,
  mode: OnboardingMode
): ProfileCoverage {
  const domainConfidence = Object.fromEntries(
    Object.entries(domains).map(([key, domain]) => [key, domain.confidence])
  ) as Record<ConfidenceDomainKey, number>;

  const totalProfileConfidence =
    Object.values(domainConfidence).reduce((sum, value) => sum + value, 0) /
    Object.keys(domainConfidence).length;

  const missingDomains = Object.entries(domains)
    .filter(([, domain]) => domain.confidence < 0.35)
    .map(([key]) => key);

  const ambiguousDomains = Object.entries(domains)
    .filter(([, domain]) => domain.confidence >= 0.35 && domain.confidence < 0.6)
    .map(([key]) => key);

  const modeReadinessThreshold = modeReadinessThresholds[mode] ?? 0.65;
  const onboardingReadiness =
    totalProfileConfidence >= modeReadinessThreshold && missingDomains.length <= 2;

  return {
    domainConfidence,
    totalProfileConfidence,
    onboardingReadiness,
    missingDomains,
    ambiguousDomains,
    modeReadinessThreshold,
  };
}
