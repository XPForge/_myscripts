import { runMinimalDiscoveryRuntimeSlice } from "../harness/runtimeSlice/runtimeSlice";
import { defaultInterpretationBoundaryPolicy } from "./interpretationBoundary";
import { runDeterministicMockInterpreter } from "./mockInterpreter";
import type { DeterministicMockInterpreterResponse } from "./mockInterpreter";
import type { InterpretationRequest } from "./interpretationRequest";

export type MockInterpreterVerificationCheck = {
  id: string;
  passed: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

export type MockInterpreterVerificationResult = {
  request: InterpretationRequest;
  response: DeterministicMockInterpreterResponse;
  checks: MockInterpreterVerificationCheck[];
};

function check(
  id: string,
  passed: boolean,
  message: string,
  metadata?: Record<string, unknown>
): MockInterpreterVerificationCheck {
  return { id, passed, message, metadata };
}

export async function runDeterministicMockInterpreterVerification(): Promise<MockInterpreterVerificationResult> {
  const runtimeResult = await runMinimalDiscoveryRuntimeSlice({
    text: "Verification input for deterministic mock interpretation.",
    sourceLabel: "Phase 10 mock interpreter verification",
    includeOpportunityFixtureProof: false,
  });

  const request: InterpretationRequest = {
    id: `mock_interpretation_request_${runtimeResult.turnId}`,
    workspaceId: runtimeResult.workspace.id,
    sessionId: runtimeResult.sessionId,
    moduleId: runtimeResult.workspace.moduleId,
    sourceTurnIds: [runtimeResult.turnId],
    evidenceReferenceIds: [runtimeResult.evidenceReferenceId],
    mode: "exploratory_observation",
    protectedPromptRef: {
      id: "phase_10_mock_prompt_ref",
      moduleId: runtimeResult.workspace.moduleId,
      purpose: "deterministic_mock_interpreter_verification",
      version: "0.1.0",
      visibility: "reference_only",
      description: "Reference only; no prompt body is loaded.",
    },
    boundaryPolicy: defaultInterpretationBoundaryPolicy,
    createdAt: new Date().toISOString(),
    metadata: {
      behavior: "phase_10_deterministic_mock_verification",
    },
  };

  const response = runDeterministicMockInterpreter(request);
  const checks: MockInterpreterVerificationCheck[] = [
    check("mock.request.evidence-linked", request.evidenceReferenceIds.length > 0, "Request preserves evidence references."),
    check("mock.result.evidence-preserved", response.result.evidenceReferenceIdsUsed.includes(runtimeResult.evidenceReferenceId), "Result preserves evidence references used."),
    check("mock.result.uncertainty-preserved", response.result.uncertaintyNotes.length > 0, "Result includes uncertainty notes."),
    check("mock.result.boundary-notes-present", response.result.boundaryNotes.length > 0, "Result includes boundary notes."),
    check("mock.no-observation-generation", response.result.generatedObservationIds.length === 0, "Mock interpreter did not generate real observations."),
    check("mock.no-boundary-violations", response.boundaryViolations.length === 0, "No disallowed output was requested."),
    check("mock.accepted", response.accepted, "Mock response was accepted for verification."),
  ];

  return {
    request,
    response,
    checks,
  };
}
