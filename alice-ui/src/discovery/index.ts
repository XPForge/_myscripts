export type {
  AlignmentExplanation,
  AlignmentQuestion,
  AlignmentResult,
  CapabilityDescriptor,
  ConsentAndSharingPolicy,
  ConstraintDescriptor,
  DiscoveryId,
  DiscoveryIsoTimestamp,
  DiscoveryTheme,
  DiscoveryTurn,
  DiscoveryTurnRole,
  EnvironmentFitSignal,
  EvidenceItem,
  ExtractedSignal,
  ExtractedSignalKind,
  InferenceRecord,
  MotivationDescriptor,
  OpenQuestion,
  OpportunityAlignmentInput,
  ParticipantConfirmation,
  ParticipantIdentity,
  PreferenceDescriptor,
  ProvenanceRecord,
  ProtectedPromptRef,
} from "./discoveryTypes.ts";
export type {
  DiscoveryLifecycleContext,
  DiscoveryLifecycleEvent,
  DiscoveryLifecycleEventType,
  DiscoveryLifecycleState,
} from "./discoveryLifecycle.ts";
export {
  applyDiscoveryLifecycleEvents,
  initialDiscoveryLifecycleContext,
  reduceDiscoveryLifecycle,
} from "./discoveryLifecycle.ts";
export type {
  DiscoveryEvent,
  DiscoveryEventLog,
  DiscoveryEventType,
  DiscoverySnapshot,
  DiscoveryWorkspace,
  ProfileDraftRef,
  ProfileGenerationAttempt,
} from "./discoveryWorkspace.ts";
export type {
  AttachParticipantConfirmationInput,
  BuildDiscoveryThemeFromSignalsInput,
  CreateEvidenceItemFromTurnInput,
  CreateExtractedSignalInput,
  CreateInferenceRecordInput,
  CreateOpenQuestionInput,
  EvidenceWithParticipantConfirmation,
} from "./discoveryEvidence.ts";
export {
  attachParticipantConfirmation,
  buildDiscoveryThemeFromSignals,
  createEvidenceItemFromTurn,
  createExtractedSignal,
  createInferenceRecord,
  createOpenQuestion,
} from "./discoveryEvidence.ts";
export type { BuildOpportunityAlignmentInputOptions, DiscoveryAlignmentSource } from "./discoveryAlignmentInput.ts";
export { buildOpportunityAlignmentInput } from "./discoveryAlignmentInput.ts";
export type {
  DiscoveryBoundaryWarning,
  DiscoveryExplorationArea,
  DiscoveryProfileBasicReadyOptions,
} from "./discoveryOzBoundaryHelpers.ts";
export {
  canOzMarkProfileBasicReady,
  getDiscoveryBoundaryWarnings,
  getLightlyExploredAreas,
} from "./discoveryOzBoundaryHelpers.ts";
