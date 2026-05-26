import type { OnboardingMode } from "./onboardingEngine";

export type ConfidenceDomainKey =
  | "autonomyPreference"
  | "leadershipInterest"
  | "technicalOrientation"
  | "creativeOrientation"
  | "explorationBreadth"
  | "systemsThinking"
  | "operationalPreference"
  | "stabilityPreference"
  | "innovationPreference";

export type ConfidenceDomainSource =
  | "onboarding"
  | "interaction"
  | "observation"
  | "default";

export type DomainConfidenceState = {
  value: string | number | null;
  confidence: number;
  source: ConfidenceDomainSource;
  lastUpdated: string;
};

export type ConfidenceDomains = Record<ConfidenceDomainKey, DomainConfidenceState>;

export const confidenceDomainKeys: ConfidenceDomainKey[] = [
  "autonomyPreference",
  "leadershipInterest",
  "technicalOrientation",
  "creativeOrientation",
  "explorationBreadth",
  "systemsThinking",
  "operationalPreference",
  "stabilityPreference",
  "innovationPreference",
];

export function createConfidenceDomains(): ConfidenceDomains {
  const now = new Date().toISOString();
  return Object.fromEntries(
    confidenceDomainKeys.map((key) => [
      key,
      {
        value: null,
        confidence: 0,
        source: "default",
        lastUpdated: now,
      },
    ])
  ) as ConfidenceDomains;
}

export function mergeDomainSignal(
  domains: ConfidenceDomains,
  key: ConfidenceDomainKey,
  value: string | number | null,
  confidence: number,
  source: ConfidenceDomainSource = "onboarding"
): ConfidenceDomains {
  const existing = domains[key];
  const nextConfidence = Math.max(existing.confidence, Math.min(Math.max(confidence, 0), 1));
  const nextValue = value ?? existing.value;
  return {
    ...domains,
    [key]: {
      value: nextValue,
      confidence: nextConfidence,
      source,
      lastUpdated: new Date().toISOString(),
    },
  };
}

const modeDomainHints: Record<OnboardingMode, Partial<Record<ConfidenceDomainKey, { value: string | number; confidence: number }>>> = {
  precision: {
    autonomyPreference: { value: "high", confidence: 0.8 },
    stabilityPreference: { value: "moderate", confidence: 0.6 },
    systemsThinking: { value: "moderate", confidence: 0.65 },
    innovationPreference: { value: "moderate", confidence: 0.55 },
  },
  exploration: {
    explorationBreadth: { value: "broad", confidence: 0.85 },
    innovationPreference: { value: "high", confidence: 0.75 },
    creativeOrientation: { value: "moderate", confidence: 0.6 },
  },
  discovery: {
    creativeOrientation: { value: "high", confidence: 0.8 },
    explorationBreadth: { value: "high", confidence: 0.85 },
    innovationPreference: { value: "high", confidence: 0.8 },
  },
  reset: {
    stabilityPreference: { value: "high", confidence: 0.8 },
    operationalPreference: { value: "moderate", confidence: 0.65 },
    autonomyPreference: { value: "balanced", confidence: 0.55 },
  },
  hybrid: {
    technicalOrientation: { value: "moderate", confidence: 0.65 },
    creativeOrientation: { value: "moderate", confidence: 0.65 },
    autonomyPreference: { value: "moderate", confidence: 0.55 },
    explorationBreadth: { value: "moderate", confidence: 0.6 },
  },
};

const directionDomainHints: Record<string, Partial<Record<ConfidenceDomainKey, { value: string | number; confidence: number }>>> = {
  "creative-tech": {
    creativeOrientation: { value: "high", confidence: 0.8 },
    innovationPreference: { value: "moderate", confidence: 0.6 },
  },
  "systems-engineering": {
    systemsThinking: { value: "high", confidence: 0.85 },
    technicalOrientation: { value: "high", confidence: 0.82 },
  },
  "experiential-design": {
    creativeOrientation: { value: "high", confidence: 0.78 },
    autonomyPreference: { value: "moderate", confidence: 0.6 },
  },
  "process-improvement": {
    operationalPreference: { value: "high", confidence: 0.8 },
    stabilityPreference: { value: "moderate", confidence: 0.65 },
  },
};

function applyDomainHints(
  domains: ConfidenceDomains,
  hints: Partial<Record<ConfidenceDomainKey, { value: string | number; confidence: number }>>,
  source: ConfidenceDomainSource
): ConfidenceDomains {
  return Object.entries(hints).reduce((next, [key, hint]) => {
    const typedKey = key as ConfidenceDomainKey;
    return mergeDomainSignal(next, typedKey, hint?.value ?? null, hint?.confidence ?? 0, source);
  }, domains);
}

export function estimateDomainsFromSelection(
  prompts: string[],
  directions: string[]
): ConfidenceDomains {
  let domains = createConfidenceDomains();

  prompts.forEach((promptId) => {
    const hint = modeDomainHints[promptId as OnboardingMode];
    if (hint) {
      domains = applyDomainHints(domains, hint, "onboarding");
    }
  });

  directions.forEach((directionId) => {
    const hint = directionDomainHints[directionId];
    if (hint) {
      domains = applyDomainHints(domains, hint, "onboarding");
    }
  });

  return domains;
}
