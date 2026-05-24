import type { JobCard } from "./jobService";

const SAVED_JOBS_KEY = "alice.savedJobs";
const DISMISSED_JOBS_KEY = "alice.dismissedJobIds";

export function loadSavedJobs(): JobCard[] {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JobCard[]) : [];
  } catch {
    return [];
  }
}

export function loadDismissedJobs(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function persistSavedJobs(jobs: JobCard[]): void {
  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(jobs));
}

export function persistDismissedJobs(ids: string[]): void {
  localStorage.setItem(DISMISSED_JOBS_KEY, JSON.stringify(ids));
}
