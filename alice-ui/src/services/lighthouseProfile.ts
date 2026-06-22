export type LighthouseDiscoveryMethod = "voice" | "voice-to-text" | "text" | "hybrid";
export type LighthouseDiscoveryStatus = "started" | "in-progress" | "complete";

export type ProfileOwnershipMetadata = {
  ownerName: string;
  ownerEmail: string;
  consentAt: string;
  ownershipNote: string;
};

export type DiscoveryCoverageMetrics = {
  capturedFields: string[];
  totalFields: number;
  capturedCount: number;
  percentage: number;
};

export type LighthouseProfile = {
  id: string;
  lpId: string;
  profileType: "lighthouse" | "opportunity";
  name: string;
  email: string;
  profileVersion: string;
  discoveryPrinciplesVersion: string;
  discoveryStatus: LighthouseDiscoveryStatus;
  discoveryMethod: LighthouseDiscoveryMethod;
  profileOwnership: ProfileOwnershipMetadata;
  transcript: string;
  observations: string[];
  participantStatements: string[];
  characteristics: Record<string, string>;
  discoveryConfidence: Record<string, number>;
  coverageMetrics: DiscoveryCoverageMetrics;
  generatedProfile?: string;
  profilePdfUrl?: string;
  emailSentAt?: string;
  discoverySummary: string;
  workMotivators: string;
  workFrustrators: string;
  learningCharacteristics: string;
  problemSolvingCharacteristics: string;
  communicationCharacteristics: string;
  leadershipCharacteristics: string;
  collaborationCharacteristics: string;
  environmentalAccelerators: string;
  environmentalInhibitors: string;
  adaptabilityCharacteristics: string;
  pressureResponse: string;
  opportunityIndicators: string;
  overlookedCharacteristics: string;
  supportingEvidence: string;
  emergentDiscoveries: string;
  notYetDiscovered: string;
  discoveryNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
};

const PROFILE_STORE_KEY = "alice.lighthouse.profiles";

const DISCOVERY_FIELD_KEYS = [
  "workMotivators",
  "workFrustrators",
  "learningCharacteristics",
  "problemSolvingCharacteristics",
  "communicationCharacteristics",
  "leadershipCharacteristics",
  "collaborationCharacteristics",
  "environmentalAccelerators",
  "environmentalInhibitors",
  "adaptabilityCharacteristics",
  "pressureResponse",
  "opportunityIndicators",
  "overlookedCharacteristics",
  "supportingEvidence",
  "emergentDiscoveries",
  "notYetDiscovered",
] as const;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function persistStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function loadStorage<T>(key: string): T | null {
  try {
    return safeParse<T>(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function padLpId(value: number): string {
  return `LP-${String(value).padStart(6, "0")}`;
}

function calculateCoverageMetrics(profile: LighthouseProfile) {
  const capturedFields = DISCOVERY_FIELD_KEYS.filter(
    (field) => String(profile[field]).trim().length > 0
  );
  const totalFields = DISCOVERY_FIELD_KEYS.length;
  const capturedCount = capturedFields.length;
  const percentage = totalFields
    ? Math.round((capturedCount / totalFields) * 100)
    : 0;

  return {
    capturedFields: capturedFields as string[],
    totalFields,
    capturedCount,
    percentage,
  };
}

export function loadLighthouseProfiles(): LighthouseProfile[] {
  const stored = loadStorage<LighthouseProfile[]>(PROFILE_STORE_KEY);
  return Array.isArray(stored) ? stored : [];
}

export function loadLighthouseProfile(profileId: string): LighthouseProfile | null {
  return loadLighthouseProfiles().find((profile) => profile.id === profileId) ?? null;
}

export function persistLighthouseProfile(profile: LighthouseProfile): void {
  const profiles = loadLighthouseProfiles();
  const existingIndex = profiles.findIndex((item) => item.id === profile.id);
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  persistStorage(PROFILE_STORE_KEY, profiles);
}

export function deleteLighthouseProfile(profileId: string): void {
  const profiles = loadLighthouseProfiles();
  persistStorage(
    PROFILE_STORE_KEY,
    profiles.filter((profile) => profile.id !== profileId)
  );
}

export function createLighthouseProfile(name: string, email: string): LighthouseProfile {
  const profiles = loadLighthouseProfiles();
  const nextNumber = profiles.reduce((max, current) => {
    const match = current.lpId.match(/LP-(\d+)/);
    const numeric = match ? Number(match[1]) : 0;
    return Math.max(max, numeric);
  }, 0) + 1;
  const now = new Date().toISOString();
  const blankProfile = {
    id: `lighthouse-${now}`,
    lpId: padLpId(nextNumber),
    profileType: "lighthouse" as const,
    name: name.trim() || "Participant",
    email: email.trim().toLowerCase(),
    profileVersion: "1.0",
    discoveryPrinciplesVersion: "1.0",
    discoveryStatus: "started" as const,
    discoveryMethod: "voice" as const,
    profileOwnership: {
      ownerName: name.trim() || "Participant",
      ownerEmail: email.trim().toLowerCase(),
      consentAt: now,
      ownershipNote: "Profile ownership belongs to the participant.",
    },
    transcript: "",
    observations: [],
    participantStatements: [],
    characteristics: {},
    discoveryConfidence: {},
    coverageMetrics: {
      capturedFields: [],
      totalFields: DISCOVERY_FIELD_KEYS.length,
      capturedCount: 0,
      percentage: 0,
    },
    generatedProfile: undefined,
    profilePdfUrl: undefined,
    emailSentAt: undefined,
    discoverySummary: "",
    workMotivators: "",
    workFrustrators: "",
    learningCharacteristics: "",
    problemSolvingCharacteristics: "",
    communicationCharacteristics: "",
    leadershipCharacteristics: "",
    collaborationCharacteristics: "",
    environmentalAccelerators: "",
    environmentalInhibitors: "",
    adaptabilityCharacteristics: "",
    pressureResponse: "",
    opportunityIndicators: "",
    overlookedCharacteristics: "",
    supportingEvidence: "",
    emergentDiscoveries: "",
    notYetDiscovered: "",
    discoveryNotes: "",
    createdAt: now,
    updatedAt: now,
  };

  const profile: LighthouseProfile = {
    ...blankProfile,
    coverageMetrics: calculateCoverageMetrics(blankProfile),
  };

  persistLighthouseProfile(profile);
  return profile;
}

export function updateLighthouseProfile(
  profileId: string,
  updates: Partial<Omit<LighthouseProfile, "id" | "lpId" | "createdAt">>
): LighthouseProfile | null {
  const existing = loadLighthouseProfile(profileId);
  if (!existing) return null;
  const updated: LighthouseProfile = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  updated.coverageMetrics = calculateCoverageMetrics(updated);
  persistLighthouseProfile(updated);
  return updated;
}
