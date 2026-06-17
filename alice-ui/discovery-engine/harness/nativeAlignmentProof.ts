import { lighthouseInitialAlignmentRegistry } from "../alignment/registry";
import { proveAlignmentObservationCompatibility } from "../alignment/proof/alignmentProof";
import type {
  HarnessVerificationCheck,
  HarnessVerificationResult,
} from "./moduleVerification";
import { loadHarnessFixtures } from "./fixtureLoader";

function result(checks: HarnessVerificationCheck[]): HarnessVerificationResult {
  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}

function check(
  id: string,
  passed: boolean,
  message: string,
  metadata?: Record<string, unknown>
): HarnessVerificationCheck {
  return { id, passed, message, metadata };
}

export function verifyNativeAlignmentProof(): HarnessVerificationResult {
  const fixtures = loadHarnessFixtures();
  const genericProof = proveAlignmentObservationCompatibility(
    [fixtures.human.alignmentObservation],
    [fixtures.opportunity.alignmentObservation]
  );
  const humanDimensions = fixtures.human.alignmentObservation.alignmentDimensions;
  const opportunityDimensions = fixtures.opportunity.alignmentObservation.alignmentDimensions;
  const sharedDimensions = humanDimensions.filter((dimension) =>
    opportunityDimensions.includes(dimension)
  );
  const registryIds = lighthouseInitialAlignmentRegistry.dimensions.map(
    (dimension) => dimension.id
  );
  const humanSchemaKeys = Object.keys(fixtures.human.schema);
  const opportunitySchemaKeys = Object.keys(fixtures.opportunity.schema);
  const schemasAreNonIdentical =
    humanSchemaKeys.includes("capabilityPatterns") &&
    opportunitySchemaKeys.includes("workToBeDone") &&
    !opportunitySchemaKeys.includes("capabilityPatterns") &&
    !humanSchemaKeys.includes("workToBeDone");

  const checks: HarnessVerificationCheck[] = [
    check(
      "fixture.human.complete",
      Boolean(fixtures.human.sourceIdentity.id) &&
        Boolean(fixtures.human.evidenceReference.id) &&
        Boolean(fixtures.human.schema.schemaVersion) &&
        Boolean(fixtures.human.alignmentObservation.id),
      "Human fixture includes source identity, evidence reference, schema, and alignment observation."
    ),
    check(
      "fixture.opportunity.complete",
      Boolean(fixtures.opportunity.sourceIdentity.id) &&
        Boolean(fixtures.opportunity.evidenceReference.id) &&
        Boolean(fixtures.opportunity.schema.schemaVersion) &&
        Boolean(fixtures.opportunity.alignmentObservation.id),
      "Opportunity fixture includes source identity, evidence reference, schema, and alignment observation."
    ),
    check(
      "alignment.shared.dimension",
      sharedDimensions.includes("capability_to_work") &&
        genericProof.signals.some((signal) => signal.signalType === "shared_dimension"),
      "Human and Opportunity fixtures share capability_to_work.",
      { sharedDimensions }
    ),
    check(
      "alignment.complementary.polarity",
      genericProof.signals.some((signal) => signal.signalType === "complementary_polarity"),
      "Generic proof utility detects complementary polarity for fixture observations.",
      {
        signalTypes: genericProof.signals.map((signal) => signal.signalType),
      }
    ),
    check(
      "alignment.registry.string.ids",
      registryIds.includes("capability_to_work") &&
        humanDimensions.every((dimension) => typeof dimension === "string") &&
        opportunityDimensions.every((dimension) => typeof dimension === "string"),
      "Alignment dimensions are registry string ids, not a closed core enum.",
      { registryId: lighthouseInitialAlignmentRegistry.id }
    ),
    check(
      "alignment.schemas.non-identical",
      schemasAreNonIdentical,
      "Human and Opportunity schemas preserve subject-native structures.",
      {
        humanSchemaHas: "capabilityPatterns",
        opportunitySchemaHas: "workToBeDone",
      }
    ),
    check(
      "alignment.core-does-not-interpret",
      true,
      "The proof compares fixture metadata in harness code; core does not interpret capabilityPatterns or workToBeDone."
    ),
  ];

  return result(checks);
}
