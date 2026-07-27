import { evaluateOzConversation } from "./ozConversationEvaluator.ts";
import { ozConversationScenarios } from "./ozConversationScenarios.ts";
import type { OzBehaviorTag, OzEvaluationReport } from "./ozConversationEvaluatorTypes.ts";

export type OzScenarioSimulationResult = {
  id: string;
  name: string;
  passed: boolean;
  expectedDetections: OzBehaviorTag[];
  missingDetections: OzBehaviorTag[];
  aggregateBehaviorScore: number;
  qualityBand: OzEvaluationReport["qualityBand"];
  regressionWarnings: string[];
};

export type OzSimulationReport = {
  createdAt: string;
  scenarioCount: number;
  passedCount: number;
  failedCount: number;
  scenarios: OzScenarioSimulationResult[];
};

function countDetection(report: OzEvaluationReport, tag: OzBehaviorTag) {
  if (tag in report.desiredBehaviorDetections) {
    return report.desiredBehaviorDetections[tag as keyof typeof report.desiredBehaviorDetections];
  }
  return report.undesiredBehaviorDetections[tag as keyof typeof report.undesiredBehaviorDetections];
}

export function runOzConversationSimulations(): OzSimulationReport {
  const scenarios = ozConversationScenarios.map((scenario) => {
    const report = evaluateOzConversation(scenario.transcript, {
      createdAt: "2026-06-24T00:00:00.000Z",
      evaluationId: `oz-sim-${scenario.id}`,
    });
    const missingDetections = scenario.expectedDetections.filter((tag) => countDetection(report, tag) < 1);
    return {
      id: scenario.id,
      name: scenario.name,
      passed: missingDetections.length === 0,
      expectedDetections: scenario.expectedDetections,
      missingDetections,
      aggregateBehaviorScore: report.aggregateBehaviorScore,
      qualityBand: report.qualityBand,
      regressionWarnings: report.regressionWarnings,
    };
  });

  return {
    createdAt: "2026-06-24T00:00:00.000Z",
    scenarioCount: scenarios.length,
    passedCount: scenarios.filter((scenario) => scenario.passed).length,
    failedCount: scenarios.filter((scenario) => !scenario.passed).length,
    scenarios,
  };
}
