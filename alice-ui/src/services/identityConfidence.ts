export type IdentityProfile = {
  id: string;
  archetype: string;
  createdAt: string;
  lastSeen: string;
  sessionCount: number;
  promptHistory: string[];
  directionInterests: string[];
  knownToAlice: boolean;
};

const IDENTITY_KEY_PREFIX = "alice.identityProfile.";

function storageKey(userId: string): string {
  return `${IDENTITY_KEY_PREFIX}${userId}`;
}

function safeParse(raw: string | null): IdentityProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
      return parsed as IdentityProfile;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadIdentityProfile(userId: string | null): IdentityProfile | null {
  if (!userId || typeof window === "undefined") return null;
  return safeParse(localStorage.getItem(storageKey(userId)));
}

export function hasKnownIdentity(userId: string | null): boolean {
  return Boolean(loadIdentityProfile(userId));
}

export function persistIdentityProfile(userId: string, profile: IdentityProfile): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(profile));
  } catch {
    // ignore storage failures
  }
}

export function createIdentityProfile(options: {
  archetype: string;
  promptHistory?: string[];
  directionInterests?: string[];
  knownToAlice?: boolean;
}): IdentityProfile {
  const now = new Date().toISOString();
  return {
    id: `alice-${now}`,
    archetype: options.archetype,
    createdAt: now,
    lastSeen: now,
    sessionCount: 1,
    promptHistory: options.promptHistory || [],
    directionInterests: options.directionInterests || [],
    knownToAlice: Boolean(options.knownToAlice),
  };
}

export function updateIdentitySession(profile: IdentityProfile): IdentityProfile {
  const now = new Date().toISOString();
  return {
    ...profile,
    lastSeen: now,
    sessionCount: profile.sessionCount + 1,
  };
}

export function inferArchetypeFromSelection(
  prompts: string[],
  directions: string[]
): string {
  if (directions.includes("Creative Technology") || prompts.includes("Help me discover what I’d be great at")) {
    return "Creative Strategic Explorer";
  }
  if (directions.includes("Systems & Engineering") || prompts.includes("I know exactly what I want")) {
    return "Systems-focused Achiever";
  }
  if (directions.includes("Experiential Design") || prompts.includes("I’m exploring new directions")) {
    return "Experience-led Innovator";
  }
  if (directions.includes("Process Improvement") || prompts.includes("I’m burned out and need a change")) {
    return "Operational Rebuilder";
  }
  return "Strategic Opportunity Seeker";
}
