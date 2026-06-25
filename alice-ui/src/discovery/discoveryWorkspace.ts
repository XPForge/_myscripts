import type { DiscoveryLifecycleState } from "./discoveryLifecycle.ts";
import type {
  ConsentAndSharingPolicy,
  DiscoveryId,
  DiscoveryIsoTimestamp,
  DiscoveryTheme,
  DiscoveryTurn,
  EvidenceItem,
  ExtractedSignal,
  InferenceRecord,
  OpenQuestion,
  ParticipantConfirmation,
  ParticipantIdentity,
  ProvenanceRecord,
} from "./discoveryTypes.ts";

export type DiscoveryEventType =
  | "workspace_created"
  | "session_started"
  | "turn_captured"
  | "evidence_item_created"
  | "signal_extracted"
  | "theme_identified"
  | "participant_confirmation_recorded"
  | "open_question_created"
  | "profile_basic_ready"
  | "profile_generation_started"
  | "profile_generation_completed"
  | "profile_reviewed"
  | "participant_correction_recorded"
  | "discovery_paused"
  | "discovery_resumed"
  | "discovery_closed";

export type DiscoveryEvent = {
  eventId: DiscoveryId;
  type: DiscoveryEventType;
  workspaceId: DiscoveryId;
  sessionId?: DiscoveryId;
  occurredAt: DiscoveryIsoTimestamp;
  actor: "participant" | "alice" | "system";
  subjectType:
    | "workspace"
    | "session"
    | "turn"
    | "evidence_item"
    | "signal"
    | "theme"
    | "confirmation"
    | "open_question"
    | "profile_generation_attempt"
    | "profile_draft";
  subjectId: DiscoveryId;
  relatedTurnIds: DiscoveryId[];
  relatedEvidenceItemIds: DiscoveryId[];
  note?: string;
  provenanceId?: DiscoveryId;
};

export type DiscoveryEventLog = {
  logId: DiscoveryId;
  workspaceId: DiscoveryId;
  events: DiscoveryEvent[];
  createdAt: DiscoveryIsoTimestamp;
  updatedAt?: DiscoveryIsoTimestamp;
};

export type ProfileDraftRef = {
  profileDraftId: DiscoveryId;
  attemptId?: DiscoveryId;
  label: string;
  createdAt: DiscoveryIsoTimestamp;
  sourceEvidenceItemIds: DiscoveryId[];
  sourceInferenceIds: DiscoveryId[];
  unresolvedOpenQuestionIds: DiscoveryId[];
};

export type ProfileGenerationAttempt = {
  attemptId: DiscoveryId;
  workspaceId: DiscoveryId;
  startedAt: DiscoveryIsoTimestamp;
  completedAt?: DiscoveryIsoTimestamp;
  state: "requested" | "draft_created" | "reviewed" | "abandoned";
  inputSnapshotId?: DiscoveryId;
  outputProfileDraftId?: DiscoveryId;
  evidenceItemIds: DiscoveryId[];
  inferenceIds: DiscoveryId[];
  openQuestionIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type DiscoverySnapshot = {
  snapshotId: DiscoveryId;
  workspaceId: DiscoveryId;
  derivedFromEventId: DiscoveryId;
  lifecycleState: DiscoveryLifecycleState;
  participant: ParticipantIdentity;
  sessionIds: DiscoveryId[];
  rawTurns: DiscoveryTurn[];
  evidenceItems: EvidenceItem[];
  extractedSignals: ExtractedSignal[];
  themes: DiscoveryTheme[];
  participantConfirmations: ParticipantConfirmation[];
  inferenceRecords: InferenceRecord[];
  openQuestions: OpenQuestion[];
  profileDraftRefs: ProfileDraftRef[];
  profileGenerationAttempts: ProfileGenerationAttempt[];
  consentPolicy: ConsentAndSharingPolicy;
  provenance: ProvenanceRecord[];
  derivedAt: DiscoveryIsoTimestamp;
};

export type DiscoveryWorkspace = {
  workspaceId: DiscoveryId;
  participantId: DiscoveryId;
  createdAt: DiscoveryIsoTimestamp;
  updatedAt?: DiscoveryIsoTimestamp;
  lifecycleState: DiscoveryLifecycleState;
  sessionIds: DiscoveryId[];
  rawTurns: DiscoveryTurn[];
  evidenceItems: EvidenceItem[];
  extractedSignals: ExtractedSignal[];
  themes: DiscoveryTheme[];
  participantConfirmations: ParticipantConfirmation[];
  inferenceRecords: InferenceRecord[];
  openQuestions: OpenQuestion[];
  profileDraftRefs: ProfileDraftRef[];
  profileGenerationAttempts: ProfileGenerationAttempt[];
  eventLog: DiscoveryEventLog;
  latestSnapshot?: DiscoverySnapshot;
  consentPolicy: ConsentAndSharingPolicy;
  provenance: ProvenanceRecord[];
};
