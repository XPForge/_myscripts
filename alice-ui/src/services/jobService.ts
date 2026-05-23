
export type JobCard = {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  applyUrl: string;
  why: string;
  alignment: string;
};

function inferAlignment(job: any) {
  const text = `${job.title} ${job.description}`.toLowerCase();

  let score = 72;

  if (text.includes("creative")) score += 6;
  if (text.includes("systems")) score += 6;
  if (text.includes("lead")) score += 5;
  if (text.includes("strategy")) score += 4;
  if (text.includes("design")) score += 4;
  if (text.includes("innovation")) score += 5;

  return `${Math.min(score, 98)}%`;
}

function inferWhy(job: any) {
  const text = `${job.title} ${job.description}`.toLowerCase();

  if (text.includes("systems")) {
    return "Strong systems-thinking overlap detected.";
  }

  if (text.includes("creative")) {
    return "Creative and technical blend strongly aligned.";
  }

  if (text.includes("lead")) {
    return "Leadership and operational strengths highly relevant.";
  }

  return "Potential strategic alignment detected.";
}

export async function fetchJobs(): Promise<JobCard[]> {
  const response = await fetch(
    "https://remotive.com/api/remote-jobs"
  );

  const data = await response.json();

  return data.jobs.slice(0, 20).map((job: any) => ({
    id: String(job.id),
    role: job.title,
    company: job.company_name,
    location: job.candidate_required_location || "Remote",
    salary: job.salary || "Compensation not listed",
    description: job.description
      .replace(/<[^>]*>?/gm, "")
      .slice(0, 420),
    applyUrl: job.url,
    why: inferWhy(job),
    alignment: inferAlignment(job),
  }));
}
