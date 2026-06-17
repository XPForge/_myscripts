import type { ResolutionState } from "../../core/types";
import type { OpportunityDiscoveryArtifactType } from "./wrapper";

export type OpportunityResolutionInterpretation = {
  state: ResolutionState;
  meaning: string;
  artifactTypes?: OpportunityDiscoveryArtifactType[];
  evidenceExpectation?: string;
};

export const opportunityResolutionInterpretations: OpportunityResolutionInterpretation[] = [
  {
    state: "unresolved",
    meaning: "The module has not yet formed a stable opportunity-reality interpretation.",
  },
  {
    state: "partially_resolved",
    meaning: "Some opportunity conditions are source-backed while others remain ambiguous.",
  },
  {
    state: "resolved_for_now",
    meaning: "The current interpretation is usable for a present artifact and remains open to new source data.",
  },
  {
    state: "needs_more_evidence",
    meaning: "The opportunity reality is under-specified or lacks enough source-backed observations.",
    evidenceExpectation: "Key operating claims should have at least one source-backed evidence reference.",
  },
  {
    state: "contradicted",
    meaning: "Opportunity claims conflict with other source evidence or observed conditions.",
  },
  {
    state: "superseded",
    meaning: "Newer source data should replace this opportunity interpretation.",
  },
  {
    state: "stale",
    meaning: "The opportunity data may no longer represent the current reality.",
  },
  {
    state: "ready_for_artifact",
    meaning: "The module has enough source-backed observations for a specific opportunity artifact.",
    artifactTypes: [
      "opportunity_reality_snapshot",
      "opportunity_alignment_input",
      "role_conditions_brief",
      "opportunity_risk_notes",
    ],
  },
  {
    state: "archived",
    meaning: "The interpretation is retained for record but should not drive active synthesis.",
  },
  {
    state: "reopened",
    meaning: "New source data or uncertainty reopened a previously stable interpretation.",
  },
];

export function interpretOpportunityResolutionState(
  state: ResolutionState
): OpportunityResolutionInterpretation | undefined {
  return opportunityResolutionInterpretations.find(
    (interpretation) => interpretation.state === state
  );
}
