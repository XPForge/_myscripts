import { fetchJobs, type JobCard } from "./jobService";
import { loadDismissedJobs } from "./jobPersistence";

export const ADAPTIVE_PREFERENCES_KEY = "alice.adaptivePreferences";

export async function loadOpportunityFeed(): Promise<JobCard[]> {
  const dismissedSet = new Set(loadDismissedJobs());
  const jobs = await fetchJobs();
  return jobs.filter((job) => !dismissedSet.has(job.id));
}

export async function refreshOpportunities(): Promise<JobCard[]> {
  return loadOpportunityFeed();
}

export function clearAdaptivePreferences(): void {
  try {
    localStorage.removeItem(ADAPTIVE_PREFERENCES_KEY);
  } catch {
    // ignore storage failures
  }
}
