import {
  applyDiscoveryLifecycleEvents,
  type DiscoveryLifecycleEvent,
  type DiscoveryLifecycleEventType,
} from "./discoveryLifecycle.ts";
import {
  attachParticipantConfirmation,
  createEvidenceItemFromTurn,
  createExtractedSignal,
  createOpenQuestion,
  type AttachParticipantConfirmationInput,
  type CreateExtractedSignalInput,
  type CreateOpenQuestionInput,
} from "./discoveryEvidence.ts";
import type {
  ConsentAndSharingPolicy,
  DiscoveryId,
  DiscoveryIsoTimestamp,
  DiscoverySession,
  DiscoveryTurn,
  DiscoveryTurnRole,
  EvidenceItem,
  ExtractedSignal,
  OpenQuestion,
  ParticipantConfirmation,
  ParticipantIdentity,
  ProvenanceRecord,
} from "./discoveryTypes.ts";
import type {
  DiscoveryEvent,
  DiscoveryEventLog,
  DiscoveryEventType,
  DiscoverySnapshot,
  DiscoveryWorkspace,
} from "./discoveryWorkspace.ts";

export type CreateDiscoveryWorkspaceInput = {
  workspaceId?: DiscoveryId;
  participantId?: DiscoveryId;
  participant?: Partial<Omit<ParticipantIdentity, "participantId" | "createdAt">>;
  consentPolicy?: Partial<Omit<ConsentAndSharingPolicy, "policyId" | "participantId" | "updatedAt">>;
  createdAt?: DiscoveryIsoTimestamp;
};

export type StartDiscoverySessionInput = {
  sessionId?: DiscoveryId;
  workspaceId: DiscoveryId;
  startedAt?: DiscoveryIsoTimestamp;
  consentPolicyId?: DiscoveryId;
};

export type AppendDiscoveryTurnInput = {
  turnId?: DiscoveryId;
  sessionId: DiscoveryId;
  role: DiscoveryTurnRole;
  content: string;
  capturedAt?: DiscoveryIsoTimestamp;
  source?: DiscoveryTurn["source"];
  provenanceId?: DiscoveryId;
};

export type DeriveEvidenceFromTurnInput = {
  evidenceItemId?: DiscoveryId;
  turnId: DiscoveryId;
  excerpt?: string;
  evidenceKind?: EvidenceItem["evidenceKind"];
  topicTags?: string[];
  provenanceId?: DiscoveryId;
};

export type RecordExtractedSignalInput = Omit<CreateExtractedSignalInput, "signalId" | "evidenceItems" | "createdAt"> & {
  signalId?: DiscoveryId;
  evidenceItemIds: DiscoveryId[];
  createdAt?: DiscoveryIsoTimestamp;
};

export type RecordParticipantConfirmationInput = Omit<AttachParticipantConfirmationInput, "confirmationId" | "recordedAt"> & {
  confirmationId?: DiscoveryId;
  recordedAt?: DiscoveryIsoTimestamp;
};

export type RecordOpenQuestionInput = Omit<CreateOpenQuestionInput, "openQuestionId" | "createdAt"> & {
  openQuestionId?: DiscoveryId;
  createdAt?: DiscoveryIsoTimestamp;
};

export type DiscoveryInMemoryAdapter = {
  createWorkspace(input?: CreateDiscoveryWorkspaceInput): DiscoveryWorkspace;
  getWorkspace(workspaceId: DiscoveryId): DiscoveryWorkspace | undefined;
  startSession(input: StartDiscoverySessionInput): DiscoverySession;
  getSession(sessionId: DiscoveryId): DiscoverySession | undefined;
  appendTurn(workspaceId: DiscoveryId, input: AppendDiscoveryTurnInput): DiscoveryTurn;
  deriveEvidenceFromTurn(workspaceId: DiscoveryId, input: DeriveEvidenceFromTurnInput): EvidenceItem;
  recordExtractedSignal(workspaceId: DiscoveryId, input: RecordExtractedSignalInput): ExtractedSignal;
  recordParticipantConfirmation(workspaceId: DiscoveryId, input: RecordParticipantConfirmationInput): ParticipantConfirmation;
  recordOpenQuestion(workspaceId: DiscoveryId, input: RecordOpenQuestionInput): OpenQuestion;
  markProfileBasicReady(workspaceId: DiscoveryId, occurredAt?: DiscoveryIsoTimestamp): DiscoveryWorkspace;
  produceSnapshot(workspaceId: DiscoveryId, derivedAt?: DiscoveryIsoTimestamp): DiscoverySnapshot;
};

type DiscoveryInMemoryAdapterOptions = {
  idPrefix?: string;
  startAt?: DiscoveryIsoTimestamp;
};

const defaultTimestamp = "2026-06-24T00:00:00.000Z";

export function createDiscoveryInMemoryAdapter(
  options: DiscoveryInMemoryAdapterOptions = {}
): DiscoveryInMemoryAdapter {
  const idPrefix = options.idPrefix ?? "discovery";
  const startAt = options.startAt ?? defaultTimestamp;
  let nextId = 1;
  let nextTick = 0;

  const participants = new Map<DiscoveryId, ParticipantIdentity>();
  const workspaces = new Map<DiscoveryId, DiscoveryWorkspace>();
  const sessions = new Map<DiscoveryId, DiscoverySession>();
  const lifecycleEvents = new Map<DiscoveryId, DiscoveryLifecycleEvent[]>();

  function createId(label: string): DiscoveryId {
    const id = `${idPrefix}-${label}-${String(nextId).padStart(4, "0")}`;
    nextId += 1;
    return id;
  }

  function createTimestamp(): DiscoveryIsoTimestamp {
    const timestamp = new Date(Date.parse(startAt) + nextTick * 1000).toISOString();
    nextTick += 1;
    return timestamp;
  }

  function createWorkspace(input: CreateDiscoveryWorkspaceInput = {}): DiscoveryWorkspace {
    const createdAt = input.createdAt ?? createTimestamp();
    const workspaceId = input.workspaceId ?? createId("workspace");
    const participantId = input.participantId ?? createId("participant");
    const policyId = createId("policy");

    const participant: ParticipantIdentity = {
      participantId,
      displayName: input.participant?.displayName,
      preferredName: input.participant?.preferredName,
      pronouns: input.participant?.pronouns,
      contactHandle: input.participant?.contactHandle,
      consentPolicyId: policyId,
      createdAt,
      updatedAt: input.participant?.updatedAt,
    };

    const consentPolicy: ConsentAndSharingPolicy = {
      policyId,
      participantId,
      shareEvidenceExcerpts: input.consentPolicy?.shareEvidenceExcerpts ?? true,
      shareInferences: input.consentPolicy?.shareInferences ?? true,
      shareUnresolvedQuestions: input.consentPolicy?.shareUnresolvedQuestions ?? true,
      restrictedEvidenceItemIds: input.consentPolicy?.restrictedEvidenceItemIds ?? [],
      restrictedInferenceIds: input.consentPolicy?.restrictedInferenceIds ?? [],
      notes: input.consentPolicy?.notes,
      updatedAt: createdAt,
    };

    const eventLog: DiscoveryEventLog = {
      logId: createId("event-log"),
      workspaceId,
      events: [],
      createdAt,
    };

    const workspace: DiscoveryWorkspace = {
      workspaceId,
      participantId,
      createdAt,
      lifecycleState: "initialized",
      sessionIds: [],
      rawTurns: [],
      evidenceItems: [],
      extractedSignals: [],
      themes: [],
      participantConfirmations: [],
      inferenceRecords: [],
      openQuestions: [],
      profileDraftRefs: [],
      profileGenerationAttempts: [],
      eventLog,
      consentPolicy,
      provenance: [],
    };

    participants.set(participantId, participant);
    workspaces.set(workspaceId, workspace);
    lifecycleEvents.set(workspaceId, []);
    addEvent(workspace, {
      type: "workspace_created",
      lifecycleType: "DISCOVERY_WORKSPACE_CREATED",
      occurredAt: createdAt,
      actor: "system",
      subjectType: "workspace",
      subjectId: workspaceId,
    });

    return cloneWorkspace(workspace);
  }

  function getWorkspace(workspaceId: DiscoveryId): DiscoveryWorkspace | undefined {
    const workspace = workspaces.get(workspaceId);
    return workspace ? cloneWorkspace(workspace) : undefined;
  }

  function startSession(input: StartDiscoverySessionInput): DiscoverySession {
    const workspace = requireWorkspace(input.workspaceId);
    const startedAt = input.startedAt ?? createTimestamp();
    const session: DiscoverySession = {
      sessionId: input.sessionId ?? createId("session"),
      participantId: workspace.participantId,
      workspaceId: workspace.workspaceId,
      startedAt,
      turnIds: [],
      evidenceItemIds: [],
      openQuestionIds: [],
      consentPolicyId: input.consentPolicyId ?? workspace.consentPolicy.policyId,
    };

    sessions.set(session.sessionId, session);
    workspace.sessionIds.push(session.sessionId);
    addEvent(workspace, {
      type: "session_started",
      lifecycleType: "DISCOVERY_SESSION_STARTED",
      occurredAt: startedAt,
      actor: "system",
      subjectType: "session",
      subjectId: session.sessionId,
      sessionId: session.sessionId,
    });

    return cloneSession(session);
  }

  function getSession(sessionId: DiscoveryId): DiscoverySession | undefined {
    const session = sessions.get(sessionId);
    return session ? cloneSession(session) : undefined;
  }

  function appendTurn(workspaceId: DiscoveryId, input: AppendDiscoveryTurnInput): DiscoveryTurn {
    const workspace = requireWorkspace(workspaceId);
    const session = requireSession(input.sessionId, workspaceId);
    const capturedAt = input.capturedAt ?? createTimestamp();
    const turn: DiscoveryTurn = {
      turnId: input.turnId ?? createId("turn"),
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      capturedAt,
      source: input.source ?? "conversation",
      provenanceId: input.provenanceId,
    };

    workspace.rawTurns.push(turn);
    session.turnIds.push(turn.turnId);
    addEvent(workspace, {
      type: "turn_captured",
      lifecycleType: "DISCOVERY_TURN_CAPTURED",
      occurredAt: capturedAt,
      actor: input.role === "participant" ? "participant" : "alice",
      subjectType: "turn",
      subjectId: turn.turnId,
      sessionId: session.sessionId,
      relatedTurnIds: [turn.turnId],
      provenanceId: input.provenanceId,
    });

    return { ...turn };
  }

  function deriveEvidenceFromTurn(workspaceId: DiscoveryId, input: DeriveEvidenceFromTurnInput): EvidenceItem {
    const workspace = requireWorkspace(workspaceId);
    const turn = requireTurn(workspace, input.turnId);
    const session = requireSession(turn.sessionId, workspaceId);
    const evidenceItem = createEvidenceItemFromTurn({
      evidenceItemId: input.evidenceItemId ?? createId("evidence"),
      turn,
      participantId: workspace.participantId,
      excerpt: input.excerpt,
      evidenceKind: input.evidenceKind,
      topicTags: input.topicTags,
      provenanceId: input.provenanceId,
    });

    workspace.evidenceItems.push(evidenceItem);
    session.evidenceItemIds.push(evidenceItem.evidenceItemId);
    addEvent(workspace, {
      type: "evidence_item_created",
      lifecycleType: "EVIDENCE_ITEM_CREATED",
      occurredAt: evidenceItem.observedAt,
      actor: "system",
      subjectType: "evidence_item",
      subjectId: evidenceItem.evidenceItemId,
      sessionId: session.sessionId,
      relatedTurnIds: [turn.turnId],
      relatedEvidenceItemIds: [evidenceItem.evidenceItemId],
      provenanceId: evidenceItem.provenanceId,
    });

    return { ...evidenceItem, topicTags: [...evidenceItem.topicTags] };
  }

  function recordExtractedSignal(workspaceId: DiscoveryId, input: RecordExtractedSignalInput): ExtractedSignal {
    const workspace = requireWorkspace(workspaceId);
    const evidenceItems = input.evidenceItemIds.map((evidenceItemId) => requireEvidenceItem(workspace, evidenceItemId));
    const createdAt = input.createdAt ?? createTimestamp();
    const signal = createExtractedSignal({
      ...input,
      signalId: input.signalId ?? createId("signal"),
      evidenceItems,
      createdAt,
    });

    workspace.extractedSignals.push(signal);
    addEvent(workspace, {
      type: "signal_extracted",
      lifecycleType: "SIGNAL_EXTRACTED",
      occurredAt: createdAt,
      actor: "system",
      subjectType: "signal",
      subjectId: signal.signalId,
      relatedTurnIds: signal.sourceTurnIds,
      relatedEvidenceItemIds: signal.evidenceItemIds,
    });

    return cloneSignal(signal);
  }

  function recordParticipantConfirmation(
    workspaceId: DiscoveryId,
    input: RecordParticipantConfirmationInput
  ): ParticipantConfirmation {
    const workspace = requireWorkspace(workspaceId);
    const recordedAt = input.recordedAt ?? createTimestamp();
    const evidenceItem =
      input.targetType === "evidence_item"
        ? requireEvidenceItem(workspace, input.targetId)
        : (workspace.evidenceItems[0] ?? requireEvidenceItem(workspace, input.targetId));
    const { confirmation } = attachParticipantConfirmation(evidenceItem, {
      ...input,
      confirmationId: input.confirmationId ?? createId("confirmation"),
      recordedAt,
    });

    workspace.participantConfirmations.push(confirmation);
    addEvent(workspace, {
      type: "participant_confirmation_recorded",
      lifecycleType: "PARTICIPANT_CONFIRMATION_RECORDED",
      occurredAt: recordedAt,
      actor: "participant",
      subjectType: "confirmation",
      subjectId: confirmation.confirmationId,
      relatedTurnIds: confirmation.sourceTurnId ? [confirmation.sourceTurnId] : [],
      relatedEvidenceItemIds: evidenceItem ? [evidenceItem.evidenceItemId] : [],
    });

    return { ...confirmation };
  }

  function recordOpenQuestion(workspaceId: DiscoveryId, input: RecordOpenQuestionInput): OpenQuestion {
    const workspace = requireWorkspace(workspaceId);
    const createdAt = input.createdAt ?? createTimestamp();
    const openQuestion = createOpenQuestion({
      ...input,
      openQuestionId: input.openQuestionId ?? createId("open-question"),
      createdAt,
    });

    workspace.openQuestions.push(openQuestion);
    for (const sessionId of workspace.sessionIds) {
      const session = sessions.get(sessionId);
      session?.openQuestionIds.push(openQuestion.openQuestionId);
    }
    addEvent(workspace, {
      type: "open_question_created",
      lifecycleType: "OPEN_QUESTION_CREATED",
      occurredAt: createdAt,
      actor: "system",
      subjectType: "open_question",
      subjectId: openQuestion.openQuestionId,
      relatedEvidenceItemIds: openQuestion.relatedEvidenceItemIds,
    });

    return cloneOpenQuestion(openQuestion);
  }

  function markProfileBasicReady(workspaceId: DiscoveryId, occurredAt: DiscoveryIsoTimestamp = createTimestamp()): DiscoveryWorkspace {
    const workspace = requireWorkspace(workspaceId);
    addEvent(workspace, {
      type: "profile_basic_ready",
      lifecycleType: "PROFILE_BASIC_READY",
      occurredAt,
      actor: "system",
      subjectType: "workspace",
      subjectId: workspace.workspaceId,
    });
    return cloneWorkspace(workspace);
  }

  function produceSnapshot(workspaceId: DiscoveryId, derivedAt: DiscoveryIsoTimestamp = createTimestamp()): DiscoverySnapshot {
    const workspace = requireWorkspace(workspaceId);
    const participant = participants.get(workspace.participantId);
    if (!participant) throw new Error(`Participant not found: ${workspace.participantId}`);

    const snapshot: DiscoverySnapshot = {
      snapshotId: createId("snapshot"),
      workspaceId: workspace.workspaceId,
      derivedFromEventId: workspace.eventLog.events.at(-1)?.eventId ?? workspace.workspaceId,
      lifecycleState: workspace.lifecycleState,
      participant: { ...participant },
      sessionIds: [...workspace.sessionIds],
      rawTurns: workspace.rawTurns.map((turn) => ({ ...turn })),
      evidenceItems: workspace.evidenceItems.map(cloneEvidenceItem),
      extractedSignals: workspace.extractedSignals.map(cloneSignal),
      themes: workspace.themes.map((theme) => ({
        ...theme,
        signalIds: [...theme.signalIds],
        evidenceItemIds: [...theme.evidenceItemIds],
        sourceTurnIds: [...theme.sourceTurnIds],
        uncertaintyNotes: [...theme.uncertaintyNotes],
      })),
      participantConfirmations: workspace.participantConfirmations.map((confirmation) => ({ ...confirmation })),
      inferenceRecords: workspace.inferenceRecords.map((inference) => ({
        ...inference,
        evidenceItemIds: [...inference.evidenceItemIds],
        sourceTurnIds: [...inference.sourceTurnIds],
        uncertaintyNotes: [...inference.uncertaintyNotes],
      })),
      openQuestions: workspace.openQuestions.map(cloneOpenQuestion),
      profileDraftRefs: workspace.profileDraftRefs.map((draft) => ({
        ...draft,
        sourceEvidenceItemIds: [...draft.sourceEvidenceItemIds],
        sourceInferenceIds: [...draft.sourceInferenceIds],
        unresolvedOpenQuestionIds: [...draft.unresolvedOpenQuestionIds],
      })),
      profileGenerationAttempts: workspace.profileGenerationAttempts.map((attempt) => ({
        ...attempt,
        evidenceItemIds: [...attempt.evidenceItemIds],
        inferenceIds: [...attempt.inferenceIds],
        openQuestionIds: [...attempt.openQuestionIds],
        uncertaintyNotes: [...attempt.uncertaintyNotes],
      })),
      consentPolicy: cloneConsentPolicy(workspace.consentPolicy),
      provenance: workspace.provenance.map(cloneProvenanceRecord),
      derivedAt,
    };

    workspace.latestSnapshot = snapshot;
    return cloneSnapshot(snapshot);
  }

  function addEvent(
    workspace: DiscoveryWorkspace,
    input: {
      type: DiscoveryEventType;
      lifecycleType: DiscoveryLifecycleEventType;
      occurredAt: DiscoveryIsoTimestamp;
      actor: DiscoveryEvent["actor"];
      subjectType: DiscoveryEvent["subjectType"];
      subjectId: DiscoveryId;
      sessionId?: DiscoveryId;
      relatedTurnIds?: DiscoveryId[];
      relatedEvidenceItemIds?: DiscoveryId[];
      provenanceId?: DiscoveryId;
    }
  ): void {
    const event: DiscoveryEvent = {
      eventId: createId("event"),
      type: input.type,
      workspaceId: workspace.workspaceId,
      sessionId: input.sessionId,
      occurredAt: input.occurredAt,
      actor: input.actor,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      relatedTurnIds: input.relatedTurnIds ?? [],
      relatedEvidenceItemIds: input.relatedEvidenceItemIds ?? [],
      provenanceId: input.provenanceId,
    };
    workspace.eventLog.events.push(event);
    workspace.eventLog.updatedAt = input.occurredAt;
    workspace.updatedAt = input.occurredAt;

    const lifecycleEvent: DiscoveryLifecycleEvent = {
      eventId: event.eventId,
      type: input.lifecycleType,
      occurredAt: input.occurredAt,
      workspaceId: workspace.workspaceId,
      sessionId: input.sessionId,
      sourceId: input.subjectId,
    };
    const events = lifecycleEvents.get(workspace.workspaceId) ?? [];
    events.push(lifecycleEvent);
    lifecycleEvents.set(workspace.workspaceId, events);
    workspace.lifecycleState = applyDiscoveryLifecycleEvents(events).state;
  }

  function requireWorkspace(workspaceId: DiscoveryId): DiscoveryWorkspace {
    const workspace = workspaces.get(workspaceId);
    if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`);
    return workspace;
  }

  function requireSession(sessionId: DiscoveryId, workspaceId: DiscoveryId): DiscoverySession {
    const session = sessions.get(sessionId);
    if (!session || session.workspaceId !== workspaceId) {
      throw new Error(`Session not found in workspace: ${sessionId}`);
    }
    return session;
  }

  function requireTurn(workspace: DiscoveryWorkspace, turnId: DiscoveryId): DiscoveryTurn {
    const turn = workspace.rawTurns.find((candidate) => candidate.turnId === turnId);
    if (!turn) throw new Error(`Turn not found: ${turnId}`);
    return turn;
  }

  function requireEvidenceItem(workspace: DiscoveryWorkspace, evidenceItemId: DiscoveryId): EvidenceItem {
    const evidenceItem = workspace.evidenceItems.find((candidate) => candidate.evidenceItemId === evidenceItemId);
    if (!evidenceItem) throw new Error(`Evidence item not found: ${evidenceItemId}`);
    return evidenceItem;
  }

  return {
    createWorkspace,
    getWorkspace,
    startSession,
    getSession,
    appendTurn,
    deriveEvidenceFromTurn,
    recordExtractedSignal,
    recordParticipantConfirmation,
    recordOpenQuestion,
    markProfileBasicReady,
    produceSnapshot,
  };
}

function cloneWorkspace(workspace: DiscoveryWorkspace): DiscoveryWorkspace {
  return {
    ...workspace,
    sessionIds: [...workspace.sessionIds],
    rawTurns: workspace.rawTurns.map((turn) => ({ ...turn })),
    evidenceItems: workspace.evidenceItems.map(cloneEvidenceItem),
    extractedSignals: workspace.extractedSignals.map(cloneSignal),
    themes: workspace.themes.map((theme) => ({ ...theme })),
    participantConfirmations: workspace.participantConfirmations.map((confirmation) => ({ ...confirmation })),
    inferenceRecords: workspace.inferenceRecords.map((inference) => ({ ...inference })),
    openQuestions: workspace.openQuestions.map(cloneOpenQuestion),
    profileDraftRefs: workspace.profileDraftRefs.map((draft) => ({ ...draft })),
    profileGenerationAttempts: workspace.profileGenerationAttempts.map((attempt) => ({ ...attempt })),
    eventLog: {
      ...workspace.eventLog,
      events: workspace.eventLog.events.map((event) => ({
        ...event,
        relatedTurnIds: [...event.relatedTurnIds],
        relatedEvidenceItemIds: [...event.relatedEvidenceItemIds],
      })),
    },
    latestSnapshot: workspace.latestSnapshot ? cloneSnapshot(workspace.latestSnapshot) : undefined,
    consentPolicy: cloneConsentPolicy(workspace.consentPolicy),
    provenance: workspace.provenance.map(cloneProvenanceRecord),
  };
}

function cloneSession(session: DiscoverySession): DiscoverySession {
  return {
    ...session,
    turnIds: [...session.turnIds],
    evidenceItemIds: [...session.evidenceItemIds],
    openQuestionIds: [...session.openQuestionIds],
  };
}

function cloneSnapshot(snapshot: DiscoverySnapshot): DiscoverySnapshot {
  return {
    ...snapshot,
    participant: { ...snapshot.participant },
    sessionIds: [...snapshot.sessionIds],
    rawTurns: snapshot.rawTurns.map((turn) => ({ ...turn })),
    evidenceItems: snapshot.evidenceItems.map(cloneEvidenceItem),
    extractedSignals: snapshot.extractedSignals.map(cloneSignal),
    themes: snapshot.themes.map((theme) => ({ ...theme })),
    participantConfirmations: snapshot.participantConfirmations.map((confirmation) => ({ ...confirmation })),
    inferenceRecords: snapshot.inferenceRecords.map((inference) => ({ ...inference })),
    openQuestions: snapshot.openQuestions.map(cloneOpenQuestion),
    profileDraftRefs: snapshot.profileDraftRefs.map((draft) => ({ ...draft })),
    profileGenerationAttempts: snapshot.profileGenerationAttempts.map((attempt) => ({ ...attempt })),
    consentPolicy: cloneConsentPolicy(snapshot.consentPolicy),
    provenance: snapshot.provenance.map(cloneProvenanceRecord),
  };
}

function cloneEvidenceItem(evidenceItem: EvidenceItem): EvidenceItem {
  return {
    ...evidenceItem,
    topicTags: [...evidenceItem.topicTags],
  };
}

function cloneSignal(signal: ExtractedSignal): ExtractedSignal {
  return {
    ...signal,
    evidenceItemIds: [...signal.evidenceItemIds],
    sourceTurnIds: [...signal.sourceTurnIds],
    uncertaintyNotes: [...signal.uncertaintyNotes],
  };
}

function cloneOpenQuestion(openQuestion: OpenQuestion): OpenQuestion {
  return {
    ...openQuestion,
    relatedEvidenceItemIds: [...openQuestion.relatedEvidenceItemIds],
    relatedSignalIds: [...openQuestion.relatedSignalIds],
  };
}

function cloneConsentPolicy(consentPolicy: ConsentAndSharingPolicy): ConsentAndSharingPolicy {
  return {
    ...consentPolicy,
    restrictedEvidenceItemIds: [...consentPolicy.restrictedEvidenceItemIds],
    restrictedInferenceIds: [...consentPolicy.restrictedInferenceIds],
  };
}

function cloneProvenanceRecord(provenance: ProvenanceRecord): ProvenanceRecord {
  return {
    ...provenance,
    protectedPromptRef: provenance.protectedPromptRef ? { ...provenance.protectedPromptRef } : undefined,
  };
}
