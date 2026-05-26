import type { OnboardingMode } from "./onboardingEngine";
import type { ConfidenceDomains } from "./confidenceDomains";
import type { SignalProbe } from "./signalProbeEngine";
import { calculateProfileCoverage } from "./profileCoverage";

const modeMinimumProbes: Record<OnboardingMode, number> = {
  precision: 2,
  exploration: 3,
  discovery: 4,
  reset: 3,
  hybrid: 3,
};

export function shouldContinueOnboarding(
  domains: ConfidenceDomains,
  mode: OnboardingMode,
  completedProbeCount: number,
  probePool: SignalProbe[]
): boolean {
  const coverage = calculateProfileCoverage(domains, mode);
  if (completedProbeCount < modeMinimumProbes[mode]) return true;
  return !coverage.onboardingReadiness && completedProbeCount < probePool.length;
}

export function selectNextProbe(
  domains: ConfidenceDomains,
  mode: OnboardingMode,
  completedProbeIds: string[],
  availableProbes: SignalProbe[]
): SignalProbe | null {
  const coverage = calculateProfileCoverage(domains, mode);
  const remaining = availableProbes.filter((probe) => !completedProbeIds.includes(probe.id));
  if (remaining.length === 0) return null;

  const priorityDomains = coverage.missingDomains;
  const candidate = remaining.find((probe) =>
    probe.relatedDomains.some((key) => priorityDomains.includes(key))
  );

  return candidate ?? remaining[0];
}
