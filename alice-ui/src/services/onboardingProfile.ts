export type OnboardingMode =
  | "precision"
  | "exploration"
  | "discovery"
  | "reset"
  | "hybrid";
import type { ConfidenceDomains } from "./confidenceDomains";

export type OnboardingProfile = {
  id: string;
  mode: OnboardingMode;
  certaintyScore: number;
  explorationLevel: number;
  preferredIndustries: string[];
  excludedIndustries: string[];
  directionInterests: string[];
  promptHistory: string[];
  clusterAffinities: Record<string, number>;
  confirmedObservations: string[];
  rejectedObservations: string[];
  domainStates?: ConfidenceDomains;
  createdAt: string;
  lastUpdated: string;
};

const PROFILE_KEY_PREFIX = "alice.onboardingProfile.";

function storageKey(userId?: string | null): string {
  return `${PROFILE_KEY_PREFIX}${userId ?? "anonymous"}`;
}

function safeParse(raw: string | null): OnboardingProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
      return parsed as OnboardingProfile;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadOnboardingProfile(userId?: string | null): OnboardingProfile | null {
  if (typeof window === "undefined") return null;
  return safeParse(localStorage.getItem(storageKey(userId)));
}

export function persistOnboardingProfile(
  userId: string | null | undefined,
  profile: OnboardingProfile
): void {
  if (!profile || typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(profile));
  } catch {
    // ignore storage failures
  }
}

export function createOnboardingProfile(options: {
  mode: OnboardingMode;
  certaintyScore?: number;
  explorationLevel?: number;
  preferredIndustries?: string[];
  excludedIndustries?: string[];
  promptHistory?: string[];
  directionInterests?: string[];
  clusterAffinities?: Record<string, number>;
  confirmedObservations?: string[];
  rejectedObservations?: string[];
  domainStates?: ConfidenceDomains;
}): OnboardingProfile {
  const now = new Date().toISOString();
  return {
    id: `alice-profile-${now}`,
    mode: options.mode,
    certaintyScore: options.certaintyScore ?? 0.7,
    explorationLevel: options.explorationLevel ?? 0.7,
    preferredIndustries: options.preferredIndustries ?? [],
    excludedIndustries: options.excludedIndustries ?? [],
    directionInterests: options.directionInterests ?? [],
    promptHistory: options.promptHistory ?? [],
    clusterAffinities: options.clusterAffinities ?? {},
    confirmedObservations: options.confirmedObservations ?? [],
    rejectedObservations: options.rejectedObservations ?? [],
    domainStates: options.domainStates,
    createdAt: now,
    lastUpdated: now,
  };
}

export function updateOnboardingProfile(
  profile: OnboardingProfile,
  updates: Partial<Omit<OnboardingProfile, "id" | "createdAt">>
): OnboardingProfile {
  return {
    ...profile,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
}
