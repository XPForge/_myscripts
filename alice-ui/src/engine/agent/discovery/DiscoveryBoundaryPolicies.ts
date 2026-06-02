import type { AgentBoundaryPolicySet } from "../boundary";

export const DiscoveryBoundaryPolicies: AgentBoundaryPolicySet = {
  id: "lighthouse-discovery-boundary-policies",
  name: "Lighthouse Discovery Boundary Policies",
  description:
    "Disclosure, transparency, explanation, trust, and auditability policies for Discovery configuration.",
  disclosurePolicy: {
    id: "lighthouse-discovery-disclosure",
    name: "Discovery Disclosure Policy",
    description:
      "Participant-facing disclosure should emphasize provisional observations, participant-confirmed insights, confidence, evidence, and open questions while keeping internal mechanics undisclosed by default.",
    defaultDomain: "participant",
    rules: [
      {
        category: "observations",
        domain: "participant",
        level: "explainable",
        requiresRequest: false,
        description: "Participant-facing observations may be explained directly but should remain provisional until participant-confirmed.",
      },
      {
        category: "insights",
        domain: "participant",
        level: "explainable",
        requiresRequest: false,
        description: "Insights may be shared with supporting context, uncertainty, and an invitation for participant correction or refinement.",
      },
      {
        category: "confidence",
        domain: "participant",
        level: "summary",
        requiresRequest: false,
        description: "Confidence should be visible enough to prevent overstatement.",
      },
      {
        category: "supportingEvidence",
        domain: "participant",
        level: "detailed",
        requiresRequest: true,
        description: "Supporting evidence should be available when explanation is requested.",
      },
      {
        category: "promptConstruction",
        domain: "internal",
        level: "hidden",
        requiresRequest: true,
        description: "Internal prompt construction is not participant-facing by default.",
      },
      {
        category: "pipelineMechanics",
        domain: "internal",
        level: "hidden",
        requiresRequest: true,
        description: "Internal perception mechanics are not participant-facing by default.",
      },
    ],
  },
  transparencyPolicy: {
    id: "lighthouse-discovery-transparency",
    name: "Discovery Transparency Policy",
    description:
      "Discovery conclusions should be explainable, confidence-aware, evidence-linked, explicit about uncertainty, and subordinate to participant self-understanding.",
    explainConclusions: true,
    exposeConfidence: true,
    exposeEvidenceLinks: true,
    exposeUncertainty: true,
    defaultExplanationDepth: "standard",
  },
  explanationPolicy: {
    id: "lighthouse-discovery-explanation",
    name: "Discovery Explanation Policy",
    description:
      "Discovery explanations should surface evidence, reasoning summaries, and open questions without exposing internal implementation details or claiming authority over participant identity.",
    evidenceDisclosureLevel: "detailed",
    reasoningDisclosureLevel: "summary",
    includeConfidenceRationale: true,
    includeContradictingEvidence: true,
    includeRemainingQuestions: true,
  },
  boundaryDefinition: {
    id: "lighthouse-discovery-boundary",
    name: "Discovery Boundary Definition",
    description:
      "Defines participant-facing and internal information domains for Discovery.",
    public: {
      domain: "public",
      description: "General information about Discovery as an experience.",
      allowedCategories: ["insights"],
      defaultDisclosureLevel: "summary",
    },
    participant: {
      domain: "participant",
      description:
        "Information available to the participant about provisional observations, participant-confirmed insights, confidence, evidence, explanations, and open questions.",
      allowedCategories: [
        "observations",
        "insights",
        "confidence",
        "supportingEvidence",
        "reasoningSummary",
      ],
      defaultDisclosureLevel: "explainable",
    },
    administrative: {
      domain: "administrative",
      description:
        "Operational information needed for responsible session administration.",
      allowedCategories: ["runtimeMetadata", "supportingEvidence"],
      defaultDisclosureLevel: "summary",
    },
    internal: {
      domain: "internal",
      description:
        "Framework mechanics and implementation details kept separate from participant experience.",
      allowedCategories: [
        "runtimeMetadata",
        "promptConstruction",
        "internalSchema",
        "pipelineMechanics",
        "implementationDetails",
      ],
      defaultDisclosureLevel: "hidden",
    },
  },
  trustPolicy: {
    id: "lighthouse-discovery-trust",
    name: "Discovery Trust Policy",
    description:
      "Participant trust depends on evidence-grounded insights, visible uncertainty, participant ownership, and participant authority over identity and meaning.",
    requiresEvidenceForInsights: true,
    requiresConfidenceDisclosure: true,
    requiresUncertaintyDisclosure: true,
    participantAccessToEvidence: "detailed",
    participantAccessToMechanics: "hidden",
  },
  auditabilityPolicy: {
    id: "lighthouse-discovery-auditability",
    name: "Discovery Auditability Policy",
    description:
      "Discovery insights should remain traceable to evidence, observations, participant confirmation status, and understanding while preserving internal mechanics separately.",
    traceabilityLevel: "evidence-linked",
    traceObservationsToEvidence: true,
    traceInsightsToObservations: true,
    traceReflectionsToUnderstanding: true,
    retainInternalMechanicsTrace: true,
  },
};
