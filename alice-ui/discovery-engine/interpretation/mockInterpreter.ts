import type {
  DisallowedInterpretationOutput,
  InterpretationBoundaryViolation,
} from "./interpretationBoundary";
import type { InterpretationRequest } from "./interpretationRequest";
import type { InterpretationResult } from "./interpretationResult";

export type DeterministicMockInterpreterResponse = {
  result: InterpretationResult;
  boundaryViolations: InterpretationBoundaryViolation[];
  accepted: boolean;
};

function isDisallowedInterpretationOutput(
  value: unknown,
  disallowedOutputs: DisallowedInterpretationOutput[]
): value is DisallowedInterpretationOutput {
  return typeof value === "string" && disallowedOutputs.includes(value as DisallowedInterpretationOutput);
}

function requestedOutputsFromMetadata(request: InterpretationRequest): DisallowedInterpretationOutput[] {
  const requestedOutputs = request.metadata?.requestedOutputs;
  if (!Array.isArray(requestedOutputs)) {
    return [];
  }

  return requestedOutputs.filter((value): value is DisallowedInterpretationOutput =>
    isDisallowedInterpretationOutput(value, request.boundaryPolicy.disallowedOutputs)
  );
}

function createBoundaryViolation(
  request: InterpretationRequest,
  violationType: DisallowedInterpretationOutput
): InterpretationBoundaryViolation {
  return {
    id: `mock_boundary_violation_${request.id}_${violationType}`,
    requestId: request.id,
    violationType,
    message: `Deterministic mock interpreter flagged disallowed output request: ${violationType}.`,
    evidenceReferenceIds: request.evidenceReferenceIds,
    createdAt: request.createdAt,
    metadata: {
      behavior: "deterministic_mock_interpreter_boundary_check",
    },
  };
}

export function runDeterministicMockInterpreter(
  request: InterpretationRequest
): DeterministicMockInterpreterResponse {
  const missingEvidence = request.evidenceReferenceIds.length === 0;
  const requestedDisallowedOutputs = requestedOutputsFromMetadata(request);
  const violations = requestedDisallowedOutputs.map((violationType) =>
    createBoundaryViolation(request, violationType)
  );

  if (missingEvidence) {
    violations.push(
      createBoundaryViolation(request, "unsupported_claim_without_evidence")
    );
  }

  const result: InterpretationResult = {
    id: `mock_interpretation_result_${request.id}`,
    requestId: request.id,
    workspaceId: request.workspaceId,
    sessionId: request.sessionId,
    moduleId: request.moduleId,
    generatedObservationIds: [],
    evidenceReferenceIdsUsed: [...request.evidenceReferenceIds],
    uncertaintyNotes: [
      "Deterministic mock output only; no live interpretation was performed.",
      missingEvidence
        ? "No evidence references were supplied, so no claim should be advanced."
        : "Evidence references were preserved for future interpretation review.",
    ],
    boundaryNotes: [
      "No LLM call was made.",
      "No protected prompt body was loaded.",
      "No profile or artifact body was generated.",
      "No scoring, matching, ranking, recommendation, percentage, qualification, or fit conclusion was produced.",
    ],
    confirmationStatus: "unconfirmed",
    inferenceLevel: "none",
    createdAt: request.createdAt,
    metadata: {
      behavior: "deterministic_mock_interpreter",
      mode: request.mode,
      violationCount: violations.length,
    },
  };

  return {
    result,
    boundaryViolations: violations,
    accepted: violations.length === 0,
  };
}
