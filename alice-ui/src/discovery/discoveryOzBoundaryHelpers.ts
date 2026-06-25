import type { DiscoveryLifecycleState } from "./discoveryLifecycle.ts";
import type {
  DiscoveryId,
  ExtractedSignalKind,
  OpportunityAlignmentInput,
  ProtectedPromptRef,
  ProvenanceRecord,
} from "./discoveryTypes.ts";
import type { DiscoverySnapshot, DiscoveryWorkspace } from "./discoveryWorkspace.ts";

export type DiscoveryBoundaryWarning =
  | "unsupportedInference"
  | "participantConfirmationMissing"
  | "profileReadinessDoesNotCloseDiscovery"
  | "alignmentPayloadInsufficientEvidence"
  | "protectedPromptReferenceViolation";

export type DiscoveryExplorationArea = {
  area: ExtractedSignalKind;
  evidenceItemIds: DiscoveryId[];
  openQuestionIds: DiscoveryId[];
  uncertaintyNotes: string[];
};

export type DiscoveryProfileBasicReadyOptions = {
  minimumEvidenceItems: number;
  requiredSignalKinds: ExtractedSignalKind[];
};

const defaultProfileBasicReadyOptions: DiscoveryProfileBasicReadyOptions = {
  minimumEvidenceItems: 3,
  requiredSignalKinds: ["capability", "preference", "motivation"],
};

const discoverySignalKinds: ExtractedSignalKind[] = [
  "capability",
  "constraint",
  "preference",
  "motivation",
  "environment_fit",
  "theme",
];

export function canOzMarkProfileBasicReady(
  source: DiscoverySnapshot | DiscoveryWorkspace,
  options: DiscoveryProfileBasicReadyOptions = defaultProfileBasicReadyOptions
): boolean {
  if (source.lifecycleState === "closed") return false;
  if (source.evidenceItems.length < options.minimumEvidenceItems) return false;
  if (hasUnsupportedInference(source)) return false;
  return options.requiredSignalKinds.every((kind) =>
    source.extractedSignals.some((signal) => signal.kind === kind && signal.evidenceItemIds.length > 0)
  );
}

export function getLightlyExploredAreas(source: DiscoverySnapshot | DiscoveryWorkspace): DiscoveryExplorationArea[] {
  return discoverySignalKinds
    .map((area) => {
      const signals = source.extractedSignals.filter((signal) => signal.kind === area);
      const evidenceItemIds = unique(signals.flatMap((signal) => signal.evidenceItemIds));
      const openQuestionIds = source.openQuestions
        .filter((question) => signals.some((signal) => question.relatedSignalIds.includes(signal.signalId)))
        .map((question) => question.openQuestionId);
      const uncertaintyNotes = unique(signals.flatMap((signal) => signal.uncertaintyNotes));

      return {
        area,
        evidenceItemIds,
        openQuestionIds,
        uncertaintyNotes,
      };
    })
    .filter((area) => area.evidenceItemIds.length < 2 || area.uncertaintyNotes.length > 0);
}

export function getDiscoveryBoundaryWarnings(
  source: DiscoverySnapshot | DiscoveryWorkspace | OpportunityAlignmentInput
): DiscoveryBoundaryWarning[] {
  const warnings: DiscoveryBoundaryWarning[] = [];

  if (isAlignmentInput(source)) {
    if (hasAlignmentPayloadInsufficientEvidence(source)) warnings.push("alignmentPayloadInsufficientEvidence");
    if (hasProtectedPromptReferenceViolation(source.provenance)) warnings.push("protectedPromptReferenceViolation");
    return uniqueWarnings(warnings);
  }

  if (hasUnsupportedInference(source)) warnings.push("unsupportedInference");
  if (hasMissingParticipantConfirmation(source)) warnings.push("participantConfirmationMissing");
  if (profileReadinessStillRequiresChoice(source.lifecycleState)) warnings.push("profileReadinessDoesNotCloseDiscovery");
  if (hasProtectedPromptReferenceViolation(source.provenance)) warnings.push("protectedPromptReferenceViolation");

  return uniqueWarnings(warnings);
}

function hasUnsupportedInference(source: DiscoverySnapshot | DiscoveryWorkspace): boolean {
  return source.inferenceRecords.some(
    (inference) => inference.evidenceItemIds.length === 0 || inference.sourceTurnIds.length === 0
  );
}

function hasMissingParticipantConfirmation(source: DiscoverySnapshot | DiscoveryWorkspace): boolean {
  const confirmedTargetIds = new Set(
    source.participantConfirmations
      .filter((confirmation) => confirmation.response === "confirmed" || confirmation.response === "corrected")
      .map((confirmation) => confirmation.targetId)
  );

  return source.inferenceRecords.some((inference) => !confirmedTargetIds.has(inference.inferenceId));
}

function profileReadinessStillRequiresChoice(state: DiscoveryLifecycleState): boolean {
  return state === "profile_basic_ready" || state === "profile_ready_for_review";
}

function hasAlignmentPayloadInsufficientEvidence(input: OpportunityAlignmentInput): boolean {
  const descriptorEvidenceCounts = [
    ...input.capabilities.map((descriptor) => descriptor.evidenceItemIds.length),
    ...input.constraints.map((descriptor) => descriptor.evidenceItemIds.length),
    ...input.preferences.map((descriptor) => descriptor.evidenceItemIds.length),
    ...input.motivations.map((descriptor) => descriptor.evidenceItemIds.length),
    ...input.environmentSignals.map((descriptor) => descriptor.evidenceItemIds.length),
    ...input.themes.map((theme) => theme.evidenceItemIds.length),
  ];

  return input.evidence.length === 0 || descriptorEvidenceCounts.some((count) => count === 0);
}

function hasProtectedPromptReferenceViolation(provenance: ProvenanceRecord[]): boolean {
  return provenance.some((record) => {
    const ref = record.protectedPromptRef;
    return ref ? protectedPromptRefContainsBodyLikeText(ref) : false;
  });
}

function protectedPromptRefContainsBodyLikeText(ref: ProtectedPromptRef): boolean {
  return [ref.promptRefId, ref.label, ref.versionRef ?? ""].some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("system prompt:") ||
      normalized.includes("provider instruction:") ||
      normalized.includes("api key") ||
      normalized.includes("client secret") ||
      normalized.includes("bearer ")
    );
  });
}

function isAlignmentInput(source: DiscoverySnapshot | DiscoveryWorkspace | OpportunityAlignmentInput): source is OpportunityAlignmentInput {
  return "inputId" in source && "capabilities" in source && "workspaceId" in source;
}

function unique(values: DiscoveryId[]): DiscoveryId[] {
  return [...new Set(values)];
}

function uniqueWarnings(warnings: DiscoveryBoundaryWarning[]): DiscoveryBoundaryWarning[] {
  return [...new Set(warnings)];
}
