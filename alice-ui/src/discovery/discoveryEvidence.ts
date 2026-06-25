import type {
  DiscoveryId,
  DiscoveryIsoTimestamp,
  DiscoveryTheme,
  DiscoveryTurn,
  EvidenceItem,
  ExtractedSignal,
  ExtractedSignalKind,
  InferenceRecord,
  OpenQuestion,
  ParticipantConfirmation,
} from "./discoveryTypes.ts";

export type CreateEvidenceItemFromTurnInput = {
  evidenceItemId: DiscoveryId;
  turn: DiscoveryTurn;
  participantId: DiscoveryId;
  excerpt?: string;
  evidenceKind?: EvidenceItem["evidenceKind"];
  topicTags?: string[];
  provenanceId?: DiscoveryId;
};

export type CreateExtractedSignalInput = {
  signalId: DiscoveryId;
  kind: ExtractedSignalKind;
  label: string;
  summary: string;
  evidenceItems: EvidenceItem[];
  sourceTurnIds?: DiscoveryId[];
  uncertaintyNotes?: string[];
  createdAt: DiscoveryIsoTimestamp;
};

export type CreateInferenceRecordInput = {
  inferenceId: DiscoveryId;
  inferenceType: InferenceRecord["inferenceType"];
  statement: string;
  evidenceItems: EvidenceItem[];
  sourceTurnIds?: DiscoveryId[];
  uncertaintyNotes?: string[];
  participantConfirmationId?: DiscoveryId;
  createdAt: DiscoveryIsoTimestamp;
};

export type CreateOpenQuestionInput = {
  openQuestionId: DiscoveryId;
  question: string;
  reason: string;
  relatedEvidenceItemIds?: DiscoveryId[];
  relatedSignalIds?: DiscoveryId[];
  createdAt: DiscoveryIsoTimestamp;
};

export type AttachParticipantConfirmationInput = {
  confirmationId: DiscoveryId;
  participantId: DiscoveryId;
  targetType: ParticipantConfirmation["targetType"];
  targetId: DiscoveryId;
  response: ParticipantConfirmation["response"];
  correctionText?: string;
  sourceTurnId?: DiscoveryId;
  recordedAt: DiscoveryIsoTimestamp;
};

export type EvidenceWithParticipantConfirmation = {
  evidenceItem: EvidenceItem;
  confirmation: ParticipantConfirmation;
};

export type BuildDiscoveryThemeFromSignalsInput = {
  themeId: DiscoveryId;
  title: string;
  description: string;
  signals: ExtractedSignal[];
  evidenceItems?: EvidenceItem[];
  uncertaintyNotes?: string[];
  createdAt: DiscoveryIsoTimestamp;
};

export function createEvidenceItemFromTurn(input: CreateEvidenceItemFromTurnInput): EvidenceItem {
  return {
    evidenceItemId: input.evidenceItemId,
    sourceTurnId: input.turn.turnId,
    participantId: input.participantId,
    excerpt: input.excerpt ?? input.turn.content,
    observedAt: input.turn.capturedAt,
    evidenceKind: input.evidenceKind ?? "direct_participant_statement",
    topicTags: input.topicTags ?? [],
    provenanceId: input.provenanceId ?? input.turn.provenanceId,
  };
}

export function createExtractedSignal(input: CreateExtractedSignalInput): ExtractedSignal {
  requireEvidenceItems(input.evidenceItems, "createExtractedSignal");

  return {
    signalId: input.signalId,
    kind: input.kind,
    label: input.label,
    summary: input.summary,
    evidenceItemIds: unique(input.evidenceItems.map((item) => item.evidenceItemId)),
    sourceTurnIds: unique([...(input.sourceTurnIds ?? []), ...input.evidenceItems.map((item) => item.sourceTurnId)]),
    uncertaintyNotes: input.uncertaintyNotes ?? [],
    createdAt: input.createdAt,
  };
}

export function createInferenceRecord(input: CreateInferenceRecordInput): InferenceRecord {
  requireEvidenceItems(input.evidenceItems, "createInferenceRecord");

  return {
    inferenceId: input.inferenceId,
    inferenceType: input.inferenceType,
    statement: input.statement,
    evidenceItemIds: unique(input.evidenceItems.map((item) => item.evidenceItemId)),
    sourceTurnIds: unique([...(input.sourceTurnIds ?? []), ...input.evidenceItems.map((item) => item.sourceTurnId)]),
    differsFromDirectEvidence: true,
    uncertaintyNotes: input.uncertaintyNotes ?? [],
    participantConfirmationId: input.participantConfirmationId,
    createdAt: input.createdAt,
  };
}

export function createOpenQuestion(input: CreateOpenQuestionInput): OpenQuestion {
  return {
    openQuestionId: input.openQuestionId,
    question: input.question,
    reason: input.reason,
    relatedEvidenceItemIds: input.relatedEvidenceItemIds ?? [],
    relatedSignalIds: input.relatedSignalIds ?? [],
    createdAt: input.createdAt,
  };
}

export function attachParticipantConfirmation(
  evidenceItem: EvidenceItem,
  input: AttachParticipantConfirmationInput
): EvidenceWithParticipantConfirmation {
  return {
    evidenceItem,
    confirmation: {
      confirmationId: input.confirmationId,
      participantId: input.participantId,
      targetType: input.targetType,
      targetId: input.targetId,
      response: input.response,
      correctionText: input.correctionText,
      sourceTurnId: input.sourceTurnId,
      recordedAt: input.recordedAt,
    },
  };
}

export function buildDiscoveryThemeFromSignals(input: BuildDiscoveryThemeFromSignalsInput): DiscoveryTheme {
  requireSignals(input.signals, "buildDiscoveryThemeFromSignals");

  const evidenceItemIdsFromSignals = input.signals.flatMap((signal) => signal.evidenceItemIds);
  const evidenceItemIdsFromEvidence = input.evidenceItems?.map((item) => item.evidenceItemId) ?? [];
  const sourceTurnIdsFromEvidence = input.evidenceItems?.map((item) => item.sourceTurnId) ?? [];

  return {
    themeId: input.themeId,
    title: input.title,
    description: input.description,
    signalIds: unique(input.signals.map((signal) => signal.signalId)),
    evidenceItemIds: unique([...evidenceItemIdsFromSignals, ...evidenceItemIdsFromEvidence]),
    sourceTurnIds: unique([...input.signals.flatMap((signal) => signal.sourceTurnIds), ...sourceTurnIdsFromEvidence]),
    uncertaintyNotes: unique([
      ...input.signals.flatMap((signal) => signal.uncertaintyNotes),
      ...(input.uncertaintyNotes ?? []),
    ]),
    createdAt: input.createdAt,
  };
}

function requireEvidenceItems(evidenceItems: EvidenceItem[], caller: string): void {
  if (evidenceItems.length === 0) {
    throw new Error(`${caller} requires at least one evidence item`);
  }
}

function requireSignals(signals: ExtractedSignal[], caller: string): void {
  if (signals.length === 0) {
    throw new Error(`${caller} requires at least one signal`);
  }
}

function unique(values: DiscoveryId[]): DiscoveryId[] {
  return [...new Set(values)];
}
