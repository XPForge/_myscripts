import type { AIMessage, LighthouseDiscoveryMethod, LighthouseDiscoveryStatus } from "./lighthouseProfile";

export type LighthouseSessionStatus = "active" | "paused" | "complete";
export type LighthouseSessionStep =
  | "capture"
  | "launching"
  | "discovering"
  | "complete";

export type LighthouseSession = {
  sessionId: string;
  profileId: string;
  lpId: string;
  profileType: "lighthouse" | "opportunity";
  name: string;
  email: string;
  realtimeSessionId?: string;
  status: LighthouseSessionStatus;
  discoveryStatus: LighthouseDiscoveryStatus;
  discoveryMethod: LighthouseDiscoveryMethod;
  conversationHistory: AIMessage[];
  transcript: string;
  step: LighthouseSessionStep;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const SESSION_STORE_KEY = "alice.lighthouse.session";

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
    // ignore storage failure
  }
}

export function loadLighthouseSession(): LighthouseSession | null {
  return safeParse<LighthouseSession>(localStorage.getItem(SESSION_STORE_KEY));
}

export function persistLighthouseSession(session: LighthouseSession | null): void {
  if (session === null) {
    localStorage.removeItem(SESSION_STORE_KEY);
    return;
  }
  persistStorage(SESSION_STORE_KEY, session);
}

export function clearLighthouseSession(): void {
  localStorage.removeItem(SESSION_STORE_KEY);
}
