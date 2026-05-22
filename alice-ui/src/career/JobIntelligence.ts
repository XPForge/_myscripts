export type IntelligenceInput = {
  title: string;
  company: string;
  description?: string;
};

const contains = (text: string, words: string[]) =>
  words.some((w) => text.includes(w));

export function buildJobIntelligence(
  job: IntelligenceInput,
) {
  const text = [
    job.title,
    job.description,
  ]
    .join(" ")
    .toLowerCase();

  const strengths: string[] = [];
  const concerns: string[] = [];
  const positioning: string[] = [];

  if (
    contains(text, [
      "technician",
      "maintenance",
      "repair",
      "systems",
      "equipment",
    ])
  ) {
    strengths.push(
      "F-16 troubleshooting background strongly supports systems-oriented technical roles.",
    );

    positioning.push(
      "Emphasize pattern recognition, diagnostics, and ability to learn unfamiliar equipment quickly.",
    );
  }

  if (
    contains(text, [
      "print",
      "production",
      "workflow",
      "manufacturing",
      "operator",
    ])
  ) {
    strengths.push(
      "Real-world HP Indigo production experience aligns with high-volume workflow environments.",
    );

    positioning.push(
      "Focus on reliability, production flow awareness, and troubleshooting under pressure.",
    );
  }

  if (
    contains(text, [
      "design",
      "creative",
      "branding",
      "adobe",
    ])
  ) {
    strengths.push(
      "Strong crossover between creative execution and technical production.",
    );

    positioning.push(
      "Position as someone who understands both creative intent and real-world execution.",
    );
  }

  if (
    contains(text, [
      "automotive",
      "body shop",
      "collision",
    ])
  ) {
    concerns.push(
      "Possible domain mismatch despite overlapping technical terminology.",
    );
  }

  if (strengths.length === 0) {
    strengths.push(
      "Role may rely more on transferable systems-thinking and adaptability than direct title matching.",
    );
  }

  return {
    strengths,
    concerns,
    positioning,
  };
}
