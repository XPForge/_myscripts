export type SubjectType =
  | "source"
  | "subject"
  | "system"
  | "group"
  | "collection"
  | "unknown";

export type SourceRole =
  | "primary_source"
  | "secondary_source"
  | "observer"
  | "module"
  | "system"
  | "external";

export type SourceIdentity = {
  id: string;
  role: SourceRole;
  label?: string;
  subjectType?: SubjectType;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type ObservationType =
  | "statement"
  | "pattern"
  | "signal"
  | "contradiction"
  | "uncertainty"
  | "confirmation"
  | "resolution"
  | "artifact_note";

export type InferenceLevel =
  | "none"
  | "low"
  | "moderate"
  | "high"
  | "derived";

export type ConfidenceLevel =
  | "unknown"
  | "low"
  | "moderate"
  | "high"
  | "confirmed";

export type ConfirmationStatus =
  | "unconfirmed"
  | "partially_confirmed"
  | "confirmed"
  | "disputed"
  | "contradicted"
  | "not_applicable";

export type VisibilityScope =
  | "internal_only"
  | "module_only"
  | "source_visible"
  | "artifact_eligible"
  | "export_eligible"
  | "restricted";

export type ArtifactPurpose =
  | "synthesis"
  | "reflection"
  | "comparison"
  | "decision_support"
  | "transfer"
  | "record"
  | "presentation"
  | "custom";

export type ResolutionState =
  | "unresolved"
  | "partially_resolved"
  | "resolved_for_now"
  | "needs_more_evidence"
  | "contradicted"
  | "superseded"
  | "stale"
  | "ready_for_artifact"
  | "archived"
  | "reopened";

export type VersionInfo = {
  id: string;
  createdAt: string;
  createdBy?: SourceIdentity;
  label?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type EvidenceReference = {
  id: string;
  workspaceId: string;
  sessionId?: string;
  turnId?: string;
  observationId?: string;
  sourceId?: string;
  quote?: string;
  range?: {
    start?: number;
    end?: number;
  };
  createdAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type ResolutionEvent = {
  id: string;
  workspaceId: string;
  sessionId?: string;
  observationId?: string;
  previousState?: ResolutionState;
  nextState: ResolutionState;
  reason?: string;
  evidenceRefs: EvidenceReference[];
  moduleId?: string;
  eventId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type DiscoveryEventType = string;

export const coreDiscoveryEventTypes = [
  "workspace_created",
  "session_created",
  "turn_added",
  "observation_added",
  "resolution_changed",
  "artifact_attempted",
  "artifact_version_created",
  "export_created",
  "import_created",
  "reinstantiated",
] as const;

export type DiscoveryEvent = {
  id: string;
  workspaceId: string;
  sessionId?: string;
  type: DiscoveryEventType;
  message?: string;
  relatedIds?: string[];
  moduleId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type ContentBlock = {
  id: string;
  kind: "text" | "transcript" | "reference" | "attachment" | "system_note" | "custom";
  content?: string;
  referenceId?: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type ConversationTurn = {
  id: string;
  workspaceId: string;
  sessionId: string;
  source: SourceIdentity;
  content: string;
  contentBlocks?: ContentBlock[];
  createdAt: string;
  evidenceRefs: EvidenceReference[];
  visibility?: VisibilityScope;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type Observation = {
  id: string;
  workspaceId: string;
  sessionId?: string;
  moduleId: string;
  schemaVersion: string;
  type: ObservationType;
  content: string;
  evidenceRefs: EvidenceReference[];
  inferenceLevel: InferenceLevel;
  confidenceLevel: ConfidenceLevel;
  confirmationStatus: ConfirmationStatus;
  resolutionState: ResolutionState;
  resolutionHistory: ResolutionEvent[];
  visibility?: VisibilityScope;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type DiscoverySession = {
  id: string;
  workspaceId: string;
  moduleId: string;
  schemaVersion: string;
  status: "active" | "paused" | "closed" | "archived";
  turns: ConversationTurn[];
  observations: Observation[];
  eventLog: DiscoveryEvent[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type ArtifactGenerationAttempt = {
  id: string;
  workspaceId: string;
  sessionId?: string;
  moduleId: string;
  artifactPurpose: ArtifactPurpose;
  status: "queued" | "running" | "succeeded" | "failed" | "superseded";
  inputEvidenceRefs: EvidenceReference[];
  outputArtifactVersionId?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type ArtifactVersion = {
  id: string;
  workspaceId: string;
  moduleId: string;
  artifactPurpose: ArtifactPurpose;
  version: VersionInfo;
  content: string;
  contentType: "text/plain" | "text/markdown" | "application/json" | "custom";
  evidenceRefs: EvidenceReference[];
  createdAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type DiscoveryWorkspace = {
  id: string;
  moduleId: string;
  schemaVersion: string;
  activeSessionId?: string;
  sessions: DiscoverySession[];
  observations: Observation[];
  artifacts: ArtifactVersion[];
  artifactAttempts: ArtifactGenerationAttempt[];
  eventLog: DiscoveryEvent[];
  resolutionHistory: ResolutionEvent[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};

export type ExportBundle = {
  id: string;
  exportBundleVersion: string;
  workspace: DiscoveryWorkspace;
  artifacts: ArtifactVersion[];
  events: DiscoveryEvent[];
  exportedAt: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
};
