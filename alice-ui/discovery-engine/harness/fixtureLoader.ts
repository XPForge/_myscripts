import {
  sampleHumanAlignmentObservation,
  sampleHumanDiscoverySchema,
  sampleHumanEvidenceReference,
  sampleHumanSourceIdentity,
} from "../modules/human-discovery/fixtures";
import {
  sampleOpportunityAlignmentObservation,
  sampleOpportunityDiscoverySchema,
  sampleOpportunityEvidenceReference,
  sampleOpportunitySourceIdentity,
} from "../modules/opportunity-discovery-stub/fixtures";

export function loadHumanDiscoveryFixture() {
  return {
    sourceIdentity: sampleHumanSourceIdentity,
    evidenceReference: sampleHumanEvidenceReference,
    schema: sampleHumanDiscoverySchema,
    alignmentObservation: sampleHumanAlignmentObservation,
  };
}

export function loadOpportunityDiscoveryStubFixture() {
  return {
    sourceIdentity: sampleOpportunitySourceIdentity,
    evidenceReference: sampleOpportunityEvidenceReference,
    schema: sampleOpportunityDiscoverySchema,
    alignmentObservation: sampleOpportunityAlignmentObservation,
  };
}

export function loadHarnessFixtures() {
  return {
    human: loadHumanDiscoveryFixture(),
    opportunity: loadOpportunityDiscoveryStubFixture(),
  };
}
