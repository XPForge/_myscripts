// Plain-assertion self-test for the Oz-driven coverage/readiness math --
// there's no test framework configured in this project (no vitest/jest).
// Run directly with:
//   npx tsx scripts/ozSchemaCoverage.selftest.mjs
import assert from "node:assert/strict";
import { computeOzSchemaCoverage, OZ_SCHEMA_AREAS } from "../src/services/ozSchemaCoverage.ts";

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok   - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function mapping(schemaArea, overrides = {}) {
  return { schemaArea, evidenceItemIds: [], possibleSignalIds: [], notes: [], ...overrides };
}

check("null capture -> all 10 fields empty, 0% coverage, 0% readiness", () => {
  const report = computeOzSchemaCoverage(null, 10);
  assert.equal(report.fields.length, 10);
  assert.ok(report.fields.every((f) => f.status === "empty"));
  assert.equal(report.coveragePercentage, 0);
  assert.equal(report.profileReadinessPercentage, 0);
});

check("capture with empty schemaAreaMappings array behaves like null", () => {
  const report = computeOzSchemaCoverage({ schemaAreaMappings: [] }, 10);
  assert.equal(report.coveragePercentage, 0);
  assert.equal(report.profileReadinessPercentage, 0);
});

check("one area with evidence is 'filled', others stay empty", () => {
  const capture = { schemaAreaMappings: [mapping("capabilities", { evidenceItemIds: ["e1"] })] };
  const report = computeOzSchemaCoverage(capture, 10);
  const capabilities = report.fields.find((f) => f.field === "capabilities");
  assert.equal(capabilities.status, "filled");
  assert.equal(report.filledCount, 1);
  assert.equal(report.fields.filter((f) => f.field !== "capabilities").every((f) => f.status === "empty"), true);
});

check("area with only a possible signal (no evidence) is 'touched'", () => {
  const capture = { schemaAreaMappings: [mapping("values", { possibleSignalIds: ["s1"] })] };
  const report = computeOzSchemaCoverage(capture, 10);
  assert.equal(report.fields.find((f) => f.field === "values").status, "touched");
  assert.equal(report.touchedCount, 1);
});

check("area with only a note (no evidence, no signal) is 'touched'", () => {
  const capture = { schemaAreaMappings: [mapping("uncertainty", { notes: ["still fuzzy"] })] };
  const report = computeOzSchemaCoverage(capture, 10);
  assert.equal(report.fields.find((f) => f.field === "uncertainty").status, "touched");
});

check("duplicate mapping entries for the same area are unioned, not overwritten or double-counted", () => {
  const capture = {
    schemaAreaMappings: [
      mapping("motivations", { evidenceItemIds: ["e1"] }),
      mapping("motivations", { evidenceItemIds: ["e1", "e2"] }),
    ],
  };
  const report = computeOzSchemaCoverage(capture, 10);
  const motivations = report.fields.find((f) => f.field === "motivations");
  assert.equal(motivations.status, "filled");
  assert.equal(motivations.matchCount, 2); // e1/e2 unioned, not 1 + 2 = 3
});

check("coverage percentage: 5 filled + 2 touched out of 10 -> 60%", () => {
  const filledAreas = OZ_SCHEMA_AREAS.slice(0, 5);
  const touchedAreas = OZ_SCHEMA_AREAS.slice(5, 7);
  const capture = {
    schemaAreaMappings: [
      ...filledAreas.map((area) => mapping(area, { evidenceItemIds: ["e1"] })),
      ...touchedAreas.map((area) => mapping(area, { possibleSignalIds: ["s1"] })),
    ],
  };
  const report = computeOzSchemaCoverage(capture, 10);
  assert.equal(report.filledCount, 5);
  assert.equal(report.touchedCount, 2);
  assert.equal(report.coveragePercentage, 60);
});

check("readiness stays 0 below the minimum participant-turn floor, even at 100% coverage", () => {
  const capture = { schemaAreaMappings: OZ_SCHEMA_AREAS.map((area) => mapping(area, { evidenceItemIds: ["e1"] })) };
  const report = computeOzSchemaCoverage(capture, 1);
  assert.equal(report.coveragePercentage, 100);
  assert.equal(report.profileReadinessPercentage, 0);
});

check("readiness hits 100 at/above the full threshold once the turn floor is met", () => {
  const capture = { schemaAreaMappings: OZ_SCHEMA_AREAS.map((area) => mapping(area, { evidenceItemIds: ["e1"] })) };
  const report = computeOzSchemaCoverage(capture, 10);
  assert.equal(report.coveragePercentage, 100);
  assert.equal(report.profileReadinessPercentage, 100);
  assert.equal(report.readinessUnlocked, true);
});

check("readiness stays 0 at/below the start threshold", () => {
  // 3 filled = 30% coverage, which sits at the current START threshold.
  const capture = { schemaAreaMappings: OZ_SCHEMA_AREAS.slice(0, 3).map((area) => mapping(area, { evidenceItemIds: ["e1"] })) };
  const report = computeOzSchemaCoverage(capture, 10);
  assert.equal(report.coveragePercentage, 30);
  assert.equal(report.profileReadinessPercentage, 0);
});

check("readiness interpolates linearly strictly between the two thresholds", () => {
  // START=30, FULL=75, midpoint coverage ~52.5%: 5 filled + 1 touched = 55%.
  const capture = {
    schemaAreaMappings: [
      ...OZ_SCHEMA_AREAS.slice(0, 5).map((area) => mapping(area, { evidenceItemIds: ["e1"] })),
      mapping(OZ_SCHEMA_AREAS[5], { possibleSignalIds: ["s1"] }),
    ],
  };
  const report = computeOzSchemaCoverage(capture, 10);
  assert.equal(report.coveragePercentage, 55);
  // (55 - 30) / (75 - 30) * 100 = 55.55... -> rounds to 56
  assert.equal(report.profileReadinessPercentage, 56);
});

console.log(`\n${passed} check(s) passed.`);
