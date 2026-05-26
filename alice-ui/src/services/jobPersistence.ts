import type { JobCard } from "./jobService";

const SAVED_JOBS_KEY = "alice.savedJobs";
const DISMISSED_JOBS_KEY = "alice.dismissedJobIds";

function storageKey(base: string, userId?: string | null): string {
  return userId ? `${base}.${userId}` : base;
}

export function loadSavedJobs(userId?: string | null): JobCard[] {
  try {
    const raw = localStorage.getItem(storageKey(SAVED_JOBS_KEY, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JobCard[]) : [];
  } catch {
    return [];
  }
}

export function loadDismissedJobs(userId?: string | null): string[] {
  try {
    const raw = localStorage.getItem(storageKey(DISMISSED_JOBS_KEY, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function persistSavedJobs(jobs: JobCard[], userId?: string | null): void {
  localStorage.setItem(storageKey(SAVED_JOBS_KEY, userId), JSON.stringify(jobs));
}

export function persistDismissedJobs(ids: string[], userId?: string | null): void {
  localStorage.setItem(storageKey(DISMISSED_JOBS_KEY, userId), JSON.stringify(ids));
}
