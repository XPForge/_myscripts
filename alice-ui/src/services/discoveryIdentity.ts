import { notifyNewLead } from "./leadAlerts";
import { clearOzDiscoveryCaptures } from "../oz/ozDiscoveryCapture";

export type DiscoveryIdentity = { name: string; email: string; capturedAt: string };

const IDENTITY_KEY = "alice.discovery.identity";
// Must match DiscoveryPage.tsx's own STORAGE_KEY for the turns/session record.
const DISCOVERY_SESSION_KEY = "lighthouse.discovery.run1";

export function loadDiscoveryIdentity(): DiscoveryIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as DiscoveryIdentity) : null;
  } catch {
    return null;
  }
}

export function saveDiscoveryIdentity(name: string, email: string): DiscoveryIdentity {
  const identity: DiscoveryIdentity = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    capturedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // ignore storage errors
  }
  notifyNewLead(identity.name, identity.email);
  return identity;
}

export function clearDiscoveryIdentity(): void {
  try {
    localStorage.removeItem(IDENTITY_KEY);
  } catch {
    // ignore storage errors
  }
}

export function hasSavedDiscoverySession(): boolean {
  try {
    return localStorage.getItem(DISCOVERY_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

// Clears the saved conversation only — the participant's identity (name,
// email) is kept, since they're still the same person starting fresh.
export function clearSavedDiscoverySession(): void {
  try {
    localStorage.removeItem(DISCOVERY_SESSION_KEY);
  } catch {
    // ignore storage errors
  }
  clearOzDiscoveryCaptures();
}
