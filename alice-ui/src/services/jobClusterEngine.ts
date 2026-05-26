import type { JobCard } from "./jobService";

export type JobCluster = {
  id: string;
  label: string;
  keywords: string[];
};

export type JobClusterAssignment = {
  clusterId: string;
  label: string;
  weight: number;
};

export const jobClusters: JobCluster[] = [
  {
    id: "systems-thinking",
    label: "Systems Thinking",
    keywords: ["systems", "architecture", "platform", "automation", "infrastructure", "operations"],
  },
  {
    id: "creative-technology",
    label: "Creative Technology",
    keywords: ["creative", "design", "ux", "motion", "studio", "experience", "brand"],
  },
  {
    id: "leadership",
    label: "Leadership",
    keywords: ["lead", "manager", "director", "head", "chief", "strategy", "executive"],
  },
  {
    id: "tactical-operations",
    label: "Tactical Operations",
    keywords: ["operations", "logistics", "support", "coordination", "execution", "process"],
  },
  {
    id: "process-improvement",
    label: "Process Improvement",
    keywords: ["process", "optimiza", "efficien", "lean", "kaizen", "workflow"],
  },
  {
    id: "innovation",
    label: "Innovation",
    keywords: ["innovation", "transformation", "experiment", "growth", "incubation", "venture"],
  },
  {
    id: "experiential-design",
    label: "Experiential Design",
    keywords: ["experience", "experiential", "journey", "product design", "customer", "service design"],
  },
  {
    id: "technical-problem-solving",
    label: "Technical Problem Solving",
    keywords: ["engineer", "developer", "technical", "software", "algorithm", "analysis", "data"],
  },
  {
    id: "hybrid-creative-technical",
    label: "Hybrid Creative/Technical",
    keywords: ["hybrid", "creative technology", "ux/ui", "product design", "innovation", "studio"],
  },
  {
    id: "operational-management",
    label: "Operational Management",
    keywords: ["program manager", "project manager", "operational", "management", "operations", "delivery"],
  },
];

export function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[\W_]+/g, " ");
}

export function assignJobClusters(job: JobCard): JobClusterAssignment[] {
  const text = normalizeText(`${job.role} ${job.company} ${job.description}`);
  return jobClusters
    .map((cluster) => {
      const hits = cluster.keywords.reduce(
        (count, keyword) => count + (text.includes(keyword) ? 1 : 0),
        0
      );
      return {
        clusterId: cluster.id,
        label: cluster.label,
        weight: hits > 0 ? Math.min(1, hits / 3) : 0,
      };
    })
    .filter((assignment) => assignment.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

export function buildClusterAffinityMap(assignments: JobClusterAssignment[]) {
  return assignments.reduce<Record<string, number>>((map, assignment) => {
    map[assignment.clusterId] = assignment.weight;
    return map;
  }, {});
}
