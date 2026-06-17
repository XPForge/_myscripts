import { createAlignmentObservation } from "../../alignment/alignmentObservation";
import { proveAlignmentObservationCompatibility } from "../../alignment/proof/alignmentProof";
import { createExportBundle } from "../../core/exportBundle";
import { createObservation } from "../../core/observations";
import { addSessionToWorkspace, createDiscoverySession } from "../../core/session";
import {
  addTurnToSession,
  createConversationTurn,
  evidenceFromTurn,
} from "../../core/turns";
import type {
  DiscoverySession,
  DiscoveryWorkspace,
  SourceIdentity,
} from "../../core/types";
import { createDiscoveryWorkspace } from "../../core/workspace";
import { sampleOpportunityAlignmentObservation } from "../../modules/opportunity-discovery-stub/fixtures";
import { humanDiscoveryModuleRegistration } from "../../modules/human-discovery/module";
import {
  humanDiscoveryModuleId,
  humanDiscoverySchemaVersion,
} from "../../modules/human-discovery/wrapper";
import { ModuleRegistry } from "../../runtime/moduleRegistry";
import { InMemoryDiscoveryStorage } from "../../storage/inMemoryStorage";
import {
  defaultRuntimeSliceInput,
  runtimeSliceDemoAlignmentMetadata,
  runtimeSliceDemoObservationMetadata,
} from "./runtimeSliceFixtures";
import type {
  RuntimeSliceCheck,
  RuntimeSliceInput,
  RuntimeSliceResult,
} from "./runtimeSliceTypes";

function check(
  id: string,
  passed: boolean,
  message: string,
  metadata?: Record<string, unknown>
): RuntimeSliceCheck {
  return { id, passed, message, metadata };
}

function replaceSession(
  workspace: DiscoveryWorkspace,
  nextSession: DiscoverySession
): DiscoveryWorkspace {
  return {
    ...workspace,
    sessions: workspace.sessions.map((session) =>
      session.id === nextSession.id ? nextSession : session
    ),
    eventLog: [...workspace.eventLog, ...nextSession.eventLog.slice(-1)],
    updatedAt: new Date().toISOString(),
  };
}

export async function runMinimalDiscoveryRuntimeSlice(
  input: RuntimeSliceInput
): Promise<RuntimeSliceResult> {
  const resolvedInput = {
    ...defaultRuntimeSliceInput,
    ...input,
  };

  const registry = new ModuleRegistry();
  registry.register(humanDiscoveryModuleRegistration);
  const registeredHumanModule = registry.get(
    resolvedInput.moduleId ?? humanDiscoveryModuleId,
    humanDiscoverySchemaVersion
  );

  let workspace = createDiscoveryWorkspace({
    moduleId: registeredHumanModule?.moduleId ?? humanDiscoveryModuleId,
    schemaVersion: registeredHumanModule?.schemaVersion ?? humanDiscoverySchemaVersion,
    metadata: {
      behavior: "phase_5_runtime_slice_verification",
      requestedWorkspaceId: resolvedInput.workspaceId,
    },
  });

  const session = createDiscoverySession({
    workspaceId: workspace.id,
    moduleId: workspace.moduleId,
    schemaVersion: workspace.schemaVersion,
    metadata: {
      behavior: "phase_5_runtime_slice_verification",
      requestedSessionId: resolvedInput.sessionId,
    },
  });
  workspace = addSessionToWorkspace(workspace, session);

  const source: SourceIdentity = {
    id: crypto.randomUUID(),
    role: "primary_source",
    label: resolvedInput.sourceLabel,
    subjectType: "subject",
    metadata: {
      behavior: "phase_5_runtime_slice_verification",
    },
  };
  const turn = createConversationTurn({
    workspaceId: workspace.id,
    sessionId: session.id,
    source,
    content: resolvedInput.text,
    visibility: "module_only",
    metadata: {
      behavior: "phase_5_runtime_slice_verification",
    },
  });
  const evidenceReference = evidenceFromTurn(turn, resolvedInput.text);
  const turnWithEvidence = {
    ...turn,
    evidenceRefs: [evidenceReference],
  };
  const activeSession = workspace.sessions.find((item) => item.id === session.id) ?? session;
  const { session: sessionWithTurn } = addTurnToSession(activeSession, turnWithEvidence);
  workspace = replaceSession(workspace, sessionWithTurn);

  const { observation, event: observationEvent } = createObservation({
    workspaceId: workspace.id,
    sessionId: session.id,
    moduleId: workspace.moduleId,
    schemaVersion: workspace.schemaVersion,
    type: "pattern",
    content: "Demo observation created from submitted text for runtime-slice verification.",
    evidenceRefs: [evidenceReference],
    inferenceLevel: "none",
    confidenceLevel: "low",
    confirmationStatus: "partially_confirmed",
    resolutionState: "needs_more_evidence",
    visibility: "module_only",
    metadata: runtimeSliceDemoObservationMetadata,
  });
  const sessionAfterObservation = {
    ...sessionWithTurn,
    observations: [...sessionWithTurn.observations, observation],
    eventLog: [...sessionWithTurn.eventLog, observationEvent],
    updatedAt: new Date().toISOString(),
  };
  workspace = {
    ...replaceSession(workspace, sessionAfterObservation),
    observations: [...workspace.observations, observation],
    eventLog: [...workspace.eventLog, observationEvent],
    updatedAt: new Date().toISOString(),
  };

  const alignmentObservation = createAlignmentObservation({
    workspaceId: workspace.id,
    observationId: observation.id,
    moduleId: workspace.moduleId,
    schemaVersion: workspace.schemaVersion,
    domainTags: ["human", "runtime-slice-demo"],
    alignmentDimensions: [runtimeSliceDemoAlignmentMetadata.dimensionId],
    polarity: runtimeSliceDemoAlignmentMetadata.polarity,
    evidenceRefs: [evidenceReference],
    confirmationStatus: "partially_confirmed",
    sourceIdentity: source,
    metadata: runtimeSliceDemoAlignmentMetadata,
  });

  const alignmentProof = resolvedInput.includeOpportunityFixtureProof
    ? proveAlignmentObservationCompatibility(
        [alignmentObservation],
        [sampleOpportunityAlignmentObservation]
      )
    : undefined;

  const storage = new InMemoryDiscoveryStorage();
  await storage.saveWorkspace(workspace);
  const savedWorkspace = await storage.getWorkspace(workspace.id);
  const exportBundle = createExportBundle(workspace, {
    behavior: "phase_5_runtime_slice_verification",
  });
  await storage.saveExportBundle(exportBundle);

  const checks: RuntimeSliceCheck[] = [
    check("runtime.workspace.created", Boolean(workspace.id), "Workspace was created.", { workspaceId: workspace.id }),
    check("runtime.session.created", Boolean(session.id), "Session was created.", { sessionId: session.id }),
    check("runtime.turn.added", sessionWithTurn.turns.some((item) => item.id === turn.id), "Turn was added to the session.", { turnId: turn.id }),
    check("runtime.evidence.created", Boolean(evidenceReference.id), "Evidence reference was created from the turn.", { evidenceReferenceId: evidenceReference.id }),
    check("runtime.observation.linked", observation.evidenceRefs.some((item) => item.id === evidenceReference.id), "Observation is linked to evidence.", { observationId: observation.id }),
    check("runtime.alignment.created", alignmentObservation.alignmentDimensions.includes("capability_to_work"), "Alignment observation was created with registry id string.", { alignmentObservationId: alignmentObservation.id }),
    check("runtime.storage.roundtrip", savedWorkspace?.id === workspace.id, "Workspace saved and retrieved from in-memory storage.", { workspaceId: savedWorkspace?.id }),
    check("runtime.export.created", exportBundle.workspace.id === workspace.id, "Export bundle was created.", { exportBundleId: exportBundle.id }),
    check("runtime.no-artifact-generation", workspace.artifacts.length === 0 && workspace.artifactAttempts.length === 0, "No artifact generation occurred."),
    check("runtime.no-scoring", true, "Runtime slice does not implement scoring, ranking, recommendations, percentages, or fit conclusions."),
  ];

  return {
    workspace,
    sessionId: session.id,
    turnId: turn.id,
    evidenceReferenceId: evidenceReference.id,
    observationId: observation.id,
    alignmentObservationId: alignmentObservation.id,
    exportBundle,
    alignmentProofSignals: alignmentProof?.signals,
    checks,
  };
}
