import { evaluateAliceBehaviorScenario, aliceBehaviorPreservationRubric } from "./aliceBehaviorPreservationEvaluator.ts";
import { aliceBehaviorPreservationScenarios } from "./aliceBehaviorPreservationScenarios.ts";
import type {
  AliceBehaviorRegressionGateReport,
  AliceBehaviorDegradationFlag,
  AliceBehaviorQualityBand,
  AliceBehaviorSimulationReport,
  AliceOzBoundaryReport,
} from "./aliceBehaviorPreservationTypes.ts";

function aggregateQualityBand(averageScore: number, flags: AliceBehaviorDegradationFlag[]): AliceBehaviorQualityBand {
  if (
    flags.includes("PREMATURE_PROFILE_OUTPUT") ||
    flags.includes("SCRIPTED_INTAKE_FEEL") ||
    flags.includes("OVERCONTROLLED_OR_NERFED_FEEL")
  ) {
    return "failed-founder-feel-test";
  }
  if (flags.length > 0) return "degraded";
  if (averageScore >= 4.5) return "excellent";
  if (averageScore >= 4) return "good";
  return "watch";
}

export function runAliceBehaviorPreservationSimulations(): AliceBehaviorSimulationReport {
  const scenarios = aliceBehaviorPreservationScenarios.map(evaluateAliceBehaviorScenario);
  const behaviorPreservationScenarios = scenarios.filter(
    (scenario) =>
      aliceBehaviorPreservationScenarios.find((fixture) => fixture.id === scenario.id)?.baselineType ===
      "deterministic-expected-good-fixture"
  );
  const degradationFlags = [...new Set(behaviorPreservationScenarios.flatMap((scenario) => scenario.degradationFlags))];
  const averageScore =
    behaviorPreservationScenarios.reduce((sum, scenario) => sum + scenario.averageScore, 0) /
    Math.max(1, behaviorPreservationScenarios.length);
  const qualityBand = aggregateQualityBand(averageScore, degradationFlags);
  const passed =
    scenarios.every((scenario) => scenario.passed) &&
    degradationFlags.length === 0 &&
    qualityBand !== "degraded" &&
    qualityBand !== "failed-founder-feel-test";

  return {
    createdAt: "2026-06-24T00:00:00.000Z",
    passed,
    baselineType: "deterministic-expected-good-fixture",
    rubric: aliceBehaviorPreservationRubric,
    scenarioCount: scenarios.length,
    passedCount: scenarios.filter((scenario) => scenario.passed).length,
    failedCount: scenarios.filter((scenario) => !scenario.passed).length,
    averageScore: Number(averageScore.toFixed(2)),
    qualityBand,
    degradationFlags,
    scenarios,
  };
}

export function buildAliceOzBoundaryReport(
  report: AliceBehaviorSimulationReport = runAliceBehaviorPreservationSimulations()
): AliceOzBoundaryReport {
  const boundaryViolations = report.scenarios
    .filter((scenario) => scenario.degradationFlags.length > 0)
    .map((scenario) => ({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      baselineType: scenario.baselineType,
      expected: scenario.passed && scenario.notes.some((note) => note.startsWith("expected flag ")),
      degradationFlags: scenario.degradationFlags,
    }));
  const firstFailedScenario = report.scenarios.find((scenario) => !scenario.passed);
  const recommendedAction =
    !report.passed || report.qualityBand === "degraded" || report.qualityBand === "failed-founder-feel-test"
      ? "stop_for_founder_review"
      : report.qualityBand === "watch"
        ? "watch"
        : "continue";

  return {
    passed: report.passed,
    qualityBand: report.qualityBand,
    averageScore: report.averageScore,
    degradationFlags: report.degradationFlags,
    boundaryViolations,
    recommendedAction,
    firstFailureReason: firstFailedScenario
      ? `${firstFailedScenario.id}: ${firstFailedScenario.notes.join("; ")}`
      : undefined,
  };
}

export function runAliceBehaviorPreservationRegressionGate(): AliceBehaviorRegressionGateReport {
  const report = runAliceBehaviorPreservationSimulations();
  const expectedBadFixtureResults = aliceBehaviorPreservationScenarios
    .filter((fixture) => fixture.baselineType === "deterministic-expected-boundary-violation")
    .map((fixture) => {
      const evaluation = report.scenarios.find((scenario) => scenario.id === fixture.id);
      const expectedDegradationFlags = fixture.expectedDegradationFlags ?? [];
      const actualDegradationFlags = evaluation?.degradationFlags ?? [];

      return {
        scenarioId: fixture.id,
        scenarioName: fixture.name,
        passed: Boolean(evaluation?.passed),
        expectedDegradationFlags,
        actualDegradationFlags,
        missingExpectedFlags: expectedDegradationFlags.filter((flag) => !actualDegradationFlags.includes(flag)),
        unexpectedFlags: actualDegradationFlags.filter((flag) => !expectedDegradationFlags.includes(flag)),
      };
    });

  return {
    passed: report.passed,
    scenarioCount: report.scenarioCount,
    averageScore: report.averageScore,
    qualityBand: report.qualityBand,
    degradationFlags: report.degradationFlags,
    expectedBadFixtureResults,
    ozBoundaryReport: buildAliceOzBoundaryReport(report),
  };
}
