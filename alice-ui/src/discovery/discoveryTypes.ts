export type DiscoveryId = string;

export type DiscoveryIsoTimestamp = string;

export type ParticipantIdentity = {
  participantId: DiscoveryId;
  displayName?: string;
  preferredName?: string;
  pronouns?: string;
  contactHandle?: string;
  consentPolicyId?: DiscoveryId;
  createdAt: DiscoveryIsoTimestamp;
  updatedAt?: DiscoveryIsoTimestamp;
};

export type DiscoverySession = {
  sessionId: DiscoveryId;
  participantId: DiscoveryId;
  workspaceId?: DiscoveryId;
  startedAt: DiscoveryIsoTimestamp;
  endedAt?: DiscoveryIsoTimestamp;
  turnIds: DiscoveryId[];
  evidenceItemIds: DiscoveryId[];
  openQuestionIds: DiscoveryId[];
  consentPolicyId?: DiscoveryId;
};

export type DiscoveryTurnRole = "participant" | "alice" | "system_note";

export type DiscoveryTurn = {
  turnId: DiscoveryId;
  sessionId: DiscoveryId;
  role: DiscoveryTurnRole;
  content: string;
  capturedAt: DiscoveryIsoTimestamp;
  source: "conversation" | "imported_note" | "participant_edit";
  provenanceId?: DiscoveryId;
};

export type EvidenceItem = {
  evidenceItemId: DiscoveryId;
  sourceTurnId: DiscoveryId;
  participantId: DiscoveryId;
  excerpt: string;
  observedAt: DiscoveryIsoTimestamp;
  evidenceKind: "direct_participant_statement" | "participant_correction" | "observed_context";
  topicTags: string[];
  provenanceId?: DiscoveryId;
};

export type ExtractedSignalKind =
  | "capability"
  | "constraint"
  | "preference"
  | "motivation"
  | "environment_fit"
  | "theme";

export type ExtractedSignal = {
  signalId: DiscoveryId;
  kind: ExtractedSignalKind;
  label: string;
  summary: string;
  evidenceItemIds: DiscoveryId[];
  sourceTurnIds: DiscoveryId[];
  uncertaintyNotes: string[];
  createdAt: DiscoveryIsoTimestamp;
};

export type DiscoveryTheme = {
  themeId: DiscoveryId;
  title: string;
  description: string;
  signalIds: DiscoveryId[];
  evidenceItemIds: DiscoveryId[];
  sourceTurnIds: DiscoveryId[];
  uncertaintyNotes: string[];
  createdAt: DiscoveryIsoTimestamp;
};

export type ParticipantConfirmation = {
  confirmationId: DiscoveryId;
  participantId: DiscoveryId;
  targetType: "evidence_item" | "extracted_signal" | "theme" | "inference" | "open_question";
  targetId: DiscoveryId;
  response: "confirmed" | "corrected" | "not_sure" | "declined_to_answer";
  correctionText?: string;
  sourceTurnId?: DiscoveryId;
  recordedAt: DiscoveryIsoTimestamp;
};

export type InferenceRecord = {
  inferenceId: DiscoveryId;
  inferenceType: ExtractedSignalKind | "relationship" | "gap" | "question";
  statement: string;
  evidenceItemIds: DiscoveryId[];
  sourceTurnIds: DiscoveryId[];
  differsFromDirectEvidence: true;
  uncertaintyNotes: string[];
  participantConfirmationId?: DiscoveryId;
  createdAt: DiscoveryIsoTimestamp;
};

export type CapabilityDescriptor = {
  capabilityId: DiscoveryId;
  label: string;
  description: string;
  evidenceItemIds: DiscoveryId[];
  inferenceIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type ConstraintDescriptor = {
  constraintId: DiscoveryId;
  label: string;
  description: string;
  evidenceItemIds: DiscoveryId[];
  inferenceIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type PreferenceDescriptor = {
  preferenceId: DiscoveryId;
  label: string;
  description: string;
  evidenceItemIds: DiscoveryId[];
  inferenceIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type MotivationDescriptor = {
  motivationId: DiscoveryId;
  label: string;
  description: string;
  evidenceItemIds: DiscoveryId[];
  inferenceIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type EnvironmentFitSignal = {
  environmentSignalId: DiscoveryId;
  label: string;
  description: string;
  evidenceItemIds: DiscoveryId[];
  inferenceIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type OpenQuestion = {
  openQuestionId: DiscoveryId;
  question: string;
  reason: string;
  relatedEvidenceItemIds: DiscoveryId[];
  relatedSignalIds: DiscoveryId[];
  createdAt: DiscoveryIsoTimestamp;
  resolvedByTurnId?: DiscoveryId;
  resolutionNote?: string;
};

export type AlignmentQuestion = {
  questionId: DiscoveryId;
  question: string;
  relatedEvidenceItemIds: DiscoveryId[];
  relatedOpenQuestionIds: DiscoveryId[];
};

export type AlignmentExplanation = {
  explanationId: DiscoveryId;
  summary: string;
  evidenceItemIds: DiscoveryId[];
  inferenceIds: DiscoveryId[];
  openQuestionIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type AlignmentResult = {
  resultId: DiscoveryId;
  opportunityId?: DiscoveryId;
  correspondence: AlignmentExplanation[];
  gaps: AlignmentExplanation[];
  questions: AlignmentQuestion[];
  uncertaintyNotes: string[];
  createdAt: DiscoveryIsoTimestamp;
};

export type OpportunityAlignmentInput = {
  inputId: DiscoveryId;
  participantId: DiscoveryId;
  workspaceId: DiscoveryId;
  capabilities: CapabilityDescriptor[];
  themes: DiscoveryTheme[];
  constraints: ConstraintDescriptor[];
  preferences: PreferenceDescriptor[];
  motivations: MotivationDescriptor[];
  environmentSignals: EnvironmentFitSignal[];
  evidence: EvidenceItem[];
  openQuestions: OpenQuestion[];
  consentPolicy: ConsentAndSharingPolicy;
  uncertaintyNotes: string[];
  provenance: ProvenanceRecord[];
  createdAt: DiscoveryIsoTimestamp;
};

export type ConsentAndSharingPolicy = {
  policyId: DiscoveryId;
  participantId: DiscoveryId;
  shareEvidenceExcerpts: boolean;
  shareInferences: boolean;
  shareUnresolvedQuestions: boolean;
  restrictedEvidenceItemIds: DiscoveryId[];
  restrictedInferenceIds: DiscoveryId[];
  notes?: string;
  updatedAt: DiscoveryIsoTimestamp;
};

export type ProtectedPromptRef = {
  promptRefId: DiscoveryId;
  owner: "alice" | "oz" | "system";
  label: string;
  versionRef?: string;
};

export type ProvenanceRecord = {
  provenanceId: DiscoveryId;
  sourceType: "turn" | "evidence_item" | "signal" | "theme" | "inference" | "participant_confirmation";
  sourceId: DiscoveryId;
  capturedAt: DiscoveryIsoTimestamp;
  protectedPromptRef?: ProtectedPromptRef;
  notes?: string;
};
