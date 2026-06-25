import type {
  CapabilityDescriptor,
  ConstraintDescriptor,
  DiscoveryId,
  DiscoveryIsoTimestamp,
  EnvironmentFitSignal,
  ExtractedSignal,
  ExtractedSignalKind,
  InferenceRecord,
  MotivationDescriptor,
  OpportunityAlignmentInput,
  PreferenceDescriptor,
} from "./discoveryTypes.ts";
import type { DiscoverySnapshot, DiscoveryWorkspace } from "./discoveryWorkspace.ts";

export type DiscoveryAlignmentSource = DiscoverySnapshot | DiscoveryWorkspace;

export type BuildOpportunityAlignmentInputOptions = {
  inputId: DiscoveryId;
  createdAt: DiscoveryIsoTimestamp;
};

export function buildOpportunityAlignmentInput(
  source: DiscoveryAlignmentSource,
  options: BuildOpportunityAlignmentInputOptions
): OpportunityAlignmentInput {
  const uncertaintyNotes = collectUncertaintyNotes(source);

  return {
    inputId: options.inputId,
    participantId: getParticipantId(source),
    workspaceId: source.workspaceId,
    capabilities: buildCapabilityDescriptors(source.extractedSignals, source.inferenceRecords),
    themes: source.themes,
    constraints: buildConstraintDescriptors(source.extractedSignals, source.inferenceRecords),
    preferences: buildPreferenceDescriptors(source.extractedSignals, source.inferenceRecords),
    motivations: buildMotivationDescriptors(source.extractedSignals, source.inferenceRecords),
    environmentSignals: buildEnvironmentFitSignals(source.extractedSignals, source.inferenceRecords),
    evidence: source.evidenceItems,
    openQuestions: source.openQuestions,
    consentPolicy: source.consentPolicy,
    uncertaintyNotes,
    provenance: source.provenance,
    createdAt: options.createdAt,
  };
}

function buildCapabilityDescriptors(
  signals: ExtractedSignal[],
  inferences: InferenceRecord[]
): CapabilityDescriptor[] {
  return buildDescriptorsForKind(signals, inferences, "capability", (signal, inferenceIds) => ({
    capabilityId: signal.signalId,
    label: signal.label,
    description: signal.summary,
    evidenceItemIds: signal.evidenceItemIds,
    inferenceIds,
    uncertaintyNotes: signal.uncertaintyNotes,
  }));
}

function buildConstraintDescriptors(
  signals: ExtractedSignal[],
  inferences: InferenceRecord[]
): ConstraintDescriptor[] {
  return buildDescriptorsForKind(signals, inferences, "constraint", (signal, inferenceIds) => ({
    constraintId: signal.signalId,
    label: signal.label,
    description: signal.summary,
    evidenceItemIds: signal.evidenceItemIds,
    inferenceIds,
    uncertaintyNotes: signal.uncertaintyNotes,
  }));
}

function buildPreferenceDescriptors(
  signals: ExtractedSignal[],
  inferences: InferenceRecord[]
): PreferenceDescriptor[] {
  return buildDescriptorsForKind(signals, inferences, "preference", (signal, inferenceIds) => ({
    preferenceId: signal.signalId,
    label: signal.label,
    description: signal.summary,
    evidenceItemIds: signal.evidenceItemIds,
    inferenceIds,
    uncertaintyNotes: signal.uncertaintyNotes,
  }));
}

function buildMotivationDescriptors(
  signals: ExtractedSignal[],
  inferences: InferenceRecord[]
): MotivationDescriptor[] {
  return buildDescriptorsForKind(signals, inferences, "motivation", (signal, inferenceIds) => ({
    motivationId: signal.signalId,
    label: signal.label,
    description: signal.summary,
    evidenceItemIds: signal.evidenceItemIds,
    inferenceIds,
    uncertaintyNotes: signal.uncertaintyNotes,
  }));
}

function buildEnvironmentFitSignals(
  signals: ExtractedSignal[],
  inferences: InferenceRecord[]
): EnvironmentFitSignal[] {
  return buildDescriptorsForKind(signals, inferences, "environment_fit", (signal, inferenceIds) => ({
    environmentSignalId: signal.signalId,
    label: signal.label,
    description: signal.summary,
    evidenceItemIds: signal.evidenceItemIds,
    inferenceIds,
    uncertaintyNotes: signal.uncertaintyNotes,
  }));
}

function buildDescriptorsForKind<TDescriptor>(
  signals: ExtractedSignal[],
  inferences: InferenceRecord[],
  kind: ExtractedSignalKind,
  build: (signal: ExtractedSignal, inferenceIds: DiscoveryId[]) => TDescriptor
): TDescriptor[] {
  return signals
    .filter((signal) => signal.kind === kind)
    .map((signal) => build(signal, findRelatedInferenceIds(signal, inferences)));
}

function findRelatedInferenceIds(signal: ExtractedSignal, inferences: InferenceRecord[]): DiscoveryId[] {
  return inferences
    .filter((inference) => hasOverlap(signal.evidenceItemIds, inference.evidenceItemIds))
    .map((inference) => inference.inferenceId);
}

function collectUncertaintyNotes(source: DiscoveryAlignmentSource): string[] {
  return unique([
    ...source.extractedSignals.flatMap((signal) => signal.uncertaintyNotes),
    ...source.themes.flatMap((theme) => theme.uncertaintyNotes),
    ...source.inferenceRecords.flatMap((inference) => inference.uncertaintyNotes),
    ...source.openQuestions.map((question) => question.reason),
  ]);
}

function getParticipantId(source: DiscoveryAlignmentSource): DiscoveryId {
  return "participant" in source ? source.participant.participantId : source.participantId;
}

function hasOverlap(left: DiscoveryId[], right: DiscoveryId[]): boolean {
  return left.some((value) => right.includes(value));
}

function unique(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0);
}
