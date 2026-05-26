import type { JobCard } from "./jobService";
import { assignJobClusters, type JobClusterAssignment } from "./jobClusterEngine";
import type { OnboardingProfile } from "./onboardingProfile";

type ModeWeights = {
  alignment: number;
  diversity: number;
  learning: number;
  exploration: number;
};

const recommendationModeWeights: Record<OnboardingProfile["mode"], ModeWeights> = {
  precision: { alignment: 1.25, diversity: 0.6, learning: 0.9, exploration: 0.4 },
  exploration: { alignment: 0.95, diversity: 1.2, learning: 1.05, exploration: 1.1 },
  discovery: { alignment: 0.85, diversity: 1.35, learning: 1.2, exploration: 1.25 },
  reset: { alignment: 0.95, diversity: 1.0, learning: 1.0, exploration: 0.85 },
  hybrid: { alignment: 1.0, diversity: 1.0, learning: 1.1, exploration: 1.0 },
};

function parseAlignment(job: JobCard): number {
  const parsed = parseInt(job.alignment.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(parsed)) return 0.7;
  return Math.min(Math.max(parsed / 100, 0.2), 1);
}

function computeClusterAffinity(
  assignments: JobClusterAssignment[],
  profile: OnboardingProfile
): number {
  return assignments.reduce((score, assignment) => {
    const affinity = profile.clusterAffinities[assignment.clusterId] ?? 0;
    return score + affinity * assignment.weight;
  }, 0);
}

function computeIndustryAlignment(
  assignments: JobClusterAssignment[],
  profile: OnboardingProfile
): number {
  if (profile.preferredIndustries.length === 0) return 0;
  const directionMap: Record<string, string> = {
    "creative-tech": "creative-technology",
    "systems-engineering": "systems-thinking",
    "experiential-design": "experiential-design",
    "process-improvement": "process-improvement",
  };

  const preferredClusters = profile.preferredIndustries
    .map((dir) => directionMap[dir])
    .filter((value): value is string => Boolean(value));

  if (preferredClusters.length === 0) return 0;

  return assignments.reduce((score, assignment) => {
    if (preferredClusters.includes(assignment.clusterId)) {
      return score + assignment.weight * 0.12;
    }
    return score;
  }, 0);
}

function computeDiversityScore(
  assignments: JobClusterAssignment[],
  profile: OnboardingProfile,
  weights: ModeWeights
): number {
  if (assignments.length === 0) return 0;
  const topWeight = assignments[0].weight;
  const explorationFactor = profile.explorationLevel * weights.exploration;
  const inverseAffinity = 1 - topWeight;
  return inverseAffinity * explorationFactor * 0.16;
}

export type RecommendationResult = {
  job: JobCard;
  score: number;
  topClusters: string[];
  reason: string[];
};

export function recommendJobs(
  jobs: JobCard[],
  profile: OnboardingProfile,
  savedJobs: JobCard[],
  dismissedIds: string[]
): RecommendationResult[] {
  const savedSet = new Set(savedJobs.map((job) => job.id));
  const weights = recommendationModeWeights[profile.mode];

  return jobs
    .map((job) => {
      const assignments = assignJobClusters(job);
      const clusterAffinity = computeClusterAffinity(assignments, profile);
      const industryAlignment = computeIndustryAlignment(assignments, profile);
      const alignment = parseAlignment(job);
      const alignmentScore = alignment * weights.alignment;
      const clusterScore = clusterAffinity * 0.18;
      const explorationScore = computeDiversityScore(assignments, profile, weights);
      const savedBoost = savedSet.has(job.id) ? 0.1 : 0;
      const dismissalPenalty = dismissedIds.includes(job.id) ? -0.7 : 0;

      const score =
        alignmentScore +
        clusterScore +
        industryAlignment +
        explorationScore +
        savedBoost +
        weights.learning * 0.05 +
        dismissalPenalty;

      const reason: string[] = [];
      reason.push(`base alignment ${alignment.toFixed(2)}`);
      if (clusterScore > 0) reason.push(`cluster affinity +${clusterScore.toFixed(2)}`);
      if (industryAlignment > 0) reason.push(`industry alignment +${industryAlignment.toFixed(2)}`);
      if (explorationScore > 0) reason.push(`exploration bonus +${explorationScore.toFixed(2)}`);
      if (savedBoost > 0) reason.push("saved job reinforcement");
      if (dismissalPenalty < 0) reason.push("dismissal penalty");

      const topClusters = assignments.slice(0, 3).map((assignment) => assignment.label);

      return {
        job,
        score,
        topClusters,
        reason,
      };
    })
    .sort((a, b) => b.score - a.score);
}
