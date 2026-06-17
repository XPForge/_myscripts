import { runMinimalDiscoveryRuntimeSlice } from "../harness/runtimeSlice/runtimeSlice";

export async function runRuntimeSliceDemo(): Promise<void> {
  const result = await runMinimalDiscoveryRuntimeSlice({
    text: "I tend to understand complex systems by tracing where they break, then mapping what the break reveals.",
    sourceLabel: "Local runtime slice demo source",
    includeOpportunityFixtureProof: true,
  });

  const checkLines = result.checks.map((check) =>
    `  - ${check.passed ? "PASS" : "FAIL"} ${check.id}: ${check.message}`
  );
  const signalTypes = [
    ...new Set(result.alignmentProofSignals?.map((signal) => signal.signalType) ?? []),
  ];

  console.log("Discovery Engine Runtime Slice Demo");
  console.log("Deterministic local verification only.");
  console.log("Not AI interpretation. Not profile generation. Not a match or fit score.");
  console.log("");
  console.log(`Workspace: ${result.workspace.id}`);
  console.log(`Session: ${result.sessionId}`);
  console.log(`Turn: ${result.turnId}`);
  console.log(`Evidence Reference: ${result.evidenceReferenceId}`);
  console.log(`Observation: ${result.observationId}`);
  console.log(`Alignment Observation: ${result.alignmentObservationId ?? "not created"}`);
  console.log(`Export Bundle: ${result.exportBundle?.id ?? "not created"}`);
  console.log("");
  console.log("Checks:");
  console.log(checkLines.join("\n"));
  console.log("");
  console.log("Alignment Signal Types:");
  console.log(signalTypes.length > 0 ? signalTypes.map((signal) => `  - ${signal}`).join("\n") : "  - none");
}

void runRuntimeSliceDemo();
