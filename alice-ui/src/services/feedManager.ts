import { fetchJobs, type JobCard } from "./jobService";
import { loadDismissedJobs, loadSavedJobs } from "./jobPersistence";
import {
  loadOnboardingProfile,
  createOnboardingProfile,
} from "./onboardingProfile";
import { recommendJobs } from "./recommendationEngine";

export const ADAPTIVE_PREFERENCES_KEY = "alice.adaptivePreferences";

export async function loadOpportunityFeed(userId?: string | null): Promise<JobCard[]> {
  const dismissedIds = loadDismissedJobs(userId);
  const savedJobs = loadSavedJobs(userId);
  const currentProfile = loadOnboardingProfile(userId) ?? createOnboardingProfile({ mode: "exploration" });
  const jobs = await fetchJobs();
  const activeJobs = jobs.filter((job) => !dismissedIds.includes(job.id));
  const ranked = recommendJobs(activeJobs, currentProfile, savedJobs, dismissedIds);

  if (import.meta.env.DEV) {
    console.debug("ALICE recommendation diagnostics:", {
      mode: currentProfile.mode,
      certainty: currentProfile.certaintyScore,
      preferredIndustries: currentProfile.preferredIndustries,
      clusterAffinities: currentProfile.clusterAffinities,
      topRecommendations: ranked.slice(0, 3).map((item) => ({
        role: item.job.role,
        company: item.job.company,
        score: Number(item.score.toFixed(3)),
        topClusters: item.topClusters,
        reasoning: item.reason,
      })),
    });
  }

  return ranked.map((item) => item.job);
}

export async function refreshOpportunities(userId?: string | null): Promise<JobCard[]> {
  return loadOpportunityFeed(userId);
}

export function clearAdaptivePreferences(): void {
  try {
    localStorage.removeItem(ADAPTIVE_PREFERENCES_KEY);
  } catch {
    // ignore storage failures
  }
}
