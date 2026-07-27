import { createInitialDiscoverySession, type DiscoverySession } from "./discoveryState";

const STORAGE_KEY = "project-lighthouse.discovery-session.v1";

export function loadDiscoverySession(): DiscoverySession {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialDiscoverySession();
    return { ...createInitialDiscoverySession(), ...JSON.parse(stored) } as DiscoverySession;
  } catch {
    return createInitialDiscoverySession();
  }
}

export function saveDiscoverySession(session: DiscoverySession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearDiscoverySession() {
  localStorage.removeItem(STORAGE_KEY);
}

