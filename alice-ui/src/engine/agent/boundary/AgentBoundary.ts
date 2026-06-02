export type InformationDomain =
  | "public"
  | "participant"
  | "administrative"
  | "internal";

export type DisclosureCategory =
  | "observations"
  | "insights"
  | "confidence"
  | "supportingEvidence"
  | "reasoningSummary"
  | "runtimeMetadata"
  | "promptConstruction"
  | "internalSchema"
  | "pipelineMechanics"
  | "implementationDetails";

export type DisclosureLevel =
  | "hidden"
  | "summary"
  | "explainable"
  | "detailed"
  | "full";

export type ExplanationDepth = "brief" | "standard" | "detailed";

export type TraceabilityLevel = "none" | "summary" | "evidence-linked" | "full";

export interface DisclosureRule {
  category: DisclosureCategory;
  domain: InformationDomain;
  level: DisclosureLevel;
  requiresRequest: boolean;
  description: string;
}

export interface DisclosurePolicy {
  id: string;
  name: string;
  description: string;
  defaultDomain: InformationDomain;
  rules: DisclosureRule[];
  metadata?: Record<string, unknown>;
}

export interface TransparencyPolicy {
  id: string;
  name: string;
  description: string;
  explainConclusions: boolean;
  exposeConfidence: boolean;
  exposeEvidenceLinks: boolean;
  exposeUncertainty: boolean;
  defaultExplanationDepth: ExplanationDepth;
  metadata?: Record<string, unknown>;
}

export interface ExplanationPolicy {
  id: string;
  name: string;
  description: string;
  evidenceDisclosureLevel: DisclosureLevel;
  reasoningDisclosureLevel: DisclosureLevel;
  includeConfidenceRationale: boolean;
  includeContradictingEvidence: boolean;
  includeRemainingQuestions: boolean;
  metadata?: Record<string, unknown>;
}

export interface BoundaryDomainDefinition {
  domain: InformationDomain;
  description: string;
  allowedCategories: DisclosureCategory[];
  defaultDisclosureLevel: DisclosureLevel;
}

export interface BoundaryDefinition {
  id: string;
  name: string;
  description: string;
  public: BoundaryDomainDefinition;
  participant: BoundaryDomainDefinition;
  administrative: BoundaryDomainDefinition;
  internal: BoundaryDomainDefinition;
  metadata?: Record<string, unknown>;
}

export interface TrustPolicy {
  id: string;
  name: string;
  description: string;
  requiresEvidenceForInsights: boolean;
  requiresConfidenceDisclosure: boolean;
  requiresUncertaintyDisclosure: boolean;
  participantAccessToEvidence: DisclosureLevel;
  participantAccessToMechanics: DisclosureLevel;
  metadata?: Record<string, unknown>;
}

export interface AuditabilityPolicy {
  id: string;
  name: string;
  description: string;
  traceabilityLevel: TraceabilityLevel;
  traceObservationsToEvidence: boolean;
  traceInsightsToObservations: boolean;
  traceReflectionsToUnderstanding: boolean;
  retainInternalMechanicsTrace: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentBoundaryPolicySet {
  id: string;
  name: string;
  description: string;
  disclosurePolicy: DisclosurePolicy;
  transparencyPolicy: TransparencyPolicy;
  explanationPolicy: ExplanationPolicy;
  boundaryDefinition: BoundaryDefinition;
  trustPolicy: TrustPolicy;
  auditabilityPolicy: AuditabilityPolicy;
  metadata?: Record<string, unknown>;
}
