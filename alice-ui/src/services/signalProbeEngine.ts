import type { ConfidenceDomains, ConfidenceDomainKey } from "./confidenceDomains";
import { mergeDomainSignal } from "./confidenceDomains";
import type { OnboardingMode } from "./onboardingEngine";

export type ProbeType = "multipleChoice" | "keyword" | "industry" | "shortText";

export type SignalProbeOption = {
  id: string;
  label: string;
  domainSignals: Partial<Record<ConfidenceDomainKey, { value: string | number; confidence: number }>>;
};

export type SignalProbe = {
  id: string;
  type: ProbeType;
  title: string;
  prompt: string;
  description: string;
  options?: SignalProbeOption[];
  relatedDomains: ConfidenceDomainKey[];
};

export function createSignalProbes(mode: OnboardingMode): SignalProbe[] {
  const baseProbes: SignalProbe[] = [
    {
      id: "autonomy-style",
      type: "multipleChoice",
      title: "How do you prefer to own work?",
      prompt: "Pick the sentence that best describes how you want to work.",
      description: "This helps ALICE gauge autonomy, leadership, and operational expectation.",
      relatedDomains: ["autonomyPreference", "leadershipInterest", "operationalPreference"],
      options: [
        {
          id: "autonomy-first",
          label: "I prefer wide ownership and freedom to shape the outcome.",
          domainSignals: {
            autonomyPreference: { value: "high", confidence: 0.85 },
            leadershipInterest: { value: "moderate", confidence: 0.55 },
          },
        },
        {
          id: "structured-support",
          label: "I want a clear process and strong team alignment.",
          domainSignals: {
            autonomyPreference: { value: "balanced", confidence: 0.6 },
            stabilityPreference: { value: "moderate", confidence: 0.7 },
          },
        },
        {
          id: "team-leadership",
          label: "I enjoy coordinating people and steering how work gets done.",
          domainSignals: {
            leadershipInterest: { value: "high", confidence: 0.8 },
            operationalPreference: { value: "moderate", confidence: 0.6 },
          },
        },
      ],
    },
    {
      id: "innovation-vs-refinement",
      type: "multipleChoice",
      title: "What motivates your next role?",
      prompt: "Choose the option that feels truest right now.",
      description: "ALICE uses this signal to tune creativity, innovation, and systems focus.",
      relatedDomains: ["innovationPreference", "creativeOrientation", "systemsThinking"],
      options: [
        {
          id: "build-new",
          label: "I want to invent new products, experiences, or business models.",
          domainSignals: {
            innovationPreference: { value: "high", confidence: 0.85 },
            creativeOrientation: { value: "high", confidence: 0.75 },
          },
        },
        {
          id: "improve-existing",
          label: "I prefer refining systems that already exist.",
          domainSignals: {
            systemsThinking: { value: "high", confidence: 0.8 },
            stabilityPreference: { value: "moderate", confidence: 0.6 },
          },
        },
        {
          id: "blend-both",
          label: "I want a role that balances creation with practical execution.",
          domainSignals: {
            innovationPreference: { value: "moderate", confidence: 0.65 },
            creativeOrientation: { value: "moderate", confidence: 0.6 },
            systemsThinking: { value: "moderate", confidence: 0.55 },
          },
        },
      ],
    },
    {
      id: "system-vs-creative",
      type: "industry",
      title: "Which signal matters most in your work?",
      prompt: "Select the direction that feels most aligned with your current energy.",
      description: "This clarifies whether the profile should lean technical, creative, or operational.",
      relatedDomains: ["technicalOrientation", "creativeOrientation", "systemsThinking"],
      options: [
        {
          id: "technical",
          label: "Technical systems, platform thinking, or product architecture.",
          domainSignals: {
            technicalOrientation: { value: "high", confidence: 0.8 },
            systemsThinking: { value: "moderate", confidence: 0.6 },
          },
        },
        {
          id: "creative",
          label: "Creative strategy, experience design, or storytelling-led work.",
          domainSignals: {
            creativeOrientation: { value: "high", confidence: 0.8 },
            innovationPreference: { value: "moderate", confidence: 0.6 },
          },
        },
        {
          id: "operational",
          label: "Process, delivery, operations, and reliable execution.",
          domainSignals: {
            operationalPreference: { value: "high", confidence: 0.8 },
            stabilityPreference: { value: "moderate", confidence: 0.6 },
          },
        },
      ],
    },
    {
      id: "signal-keywords",
      type: "keyword",
      title: "What keywords feel most relevant to you?",
      prompt: "Type a few words that capture what you want more of in your next role.",
      description: "Short keywords help ALICE anchor signal strength against emerging patterns.",
      relatedDomains: ["creativeOrientation", "technicalOrientation", "innovationPreference", "explorationBreadth"],
    },
    {
      id: "future-pace",
      type: "shortText",
      title: "How fast do you want your next career step to move?",
      prompt: "A short answer helps shape pace, stability, and exploration readiness.",
      description: "This probe helps ALICE estimate onboarding readiness without forcing a long form.",
      relatedDomains: ["stabilityPreference", "explorationBreadth"],
    },
  ];

  if (mode === "precision") {
    return baseProbes.filter((probe) => probe.id !== "signal-keywords");
  }

  if (mode === "discovery") {
    return [...baseProbes, {
      id: "discover-interests",
      type: "shortText",
      title: "What would you like to learn about next?",
      prompt: "One short phrase is enough.",
      description: "This adds a low-friction discovery signal for broader recommendation adaptation.",
      relatedDomains: ["explorationBreadth", "innovationPreference"],
    }];
  }

  return baseProbes;
}

export function evaluateProbeResponse(
  probe: SignalProbe,
  response: string | string[] | null,
  existingDomains: ConfidenceDomains
): ConfidenceDomains {
  if (!response) return existingDomains;

  let next = existingDomains;

  if (probe.options && typeof response === "string") {
    const selected = probe.options.find((option) => option.id === response);
    if (selected) {
      Object.entries(selected.domainSignals).forEach(([key, signal]) => {
        next = mergeDomainSignal(
          next,
          key as ConfidenceDomainKey,
          signal.value,
          signal.confidence,
          "onboarding"
        );
      });
    }

    return next;
  }

  const text = typeof response === "string" ? response.toLowerCase() : response.join(" ").toLowerCase();

  if (probe.type === "keyword" || probe.type === "shortText") {
    if (text.includes("creative") || text.includes("design") || text.includes("brand")) {
      next = mergeDomainSignal(next, "creativeOrientation", "high", 0.7, "onboarding");
      next = mergeDomainSignal(next, "innovationPreference", "moderate", 0.55, "onboarding");
    }
    if (text.includes("engineer") || text.includes("systems") || text.includes("architecture")) {
      next = mergeDomainSignal(next, "technicalOrientation", "high", 0.75, "onboarding");
      next = mergeDomainSignal(next, "systemsThinking", "high", 0.65, "onboarding");
    }
    if (text.includes("slow") || text.includes("steady") || text.includes("stable")) {
      next = mergeDomainSignal(next, "stabilityPreference", "high", 0.75, "onboarding");
    }
    if (text.includes("fast") || text.includes("growth") || text.includes("experiment")) {
      next = mergeDomainSignal(next, "explorationBreadth", "high", 0.7, "onboarding");
    }
    if (text.includes("operate") || text.includes("process") || text.includes("execute")) {
      next = mergeDomainSignal(next, "operationalPreference", "high", 0.7, "onboarding");
    }
  }

  return next;
}
