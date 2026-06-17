import type { ResolutionState } from "../../core/types";
import type { HumanDiscoveryArtifactType } from "./wrapper";

export type HumanResolutionInterpretation = {
  state: ResolutionState;
  meaning: string;
  artifactTypes?: HumanDiscoveryArtifactType[];
  evidenceExpectation?: string;
};

export const humanResolutionInterpretations: HumanResolutionInterpretation[] = [
  {
    state: "unresolved",
    meaning: "The module has not yet formed a stable human-discovery interpretation.",
  },
  {
    state: "partially_resolved",
    meaning: "Some schema areas have evidence-linked observations while others remain open.",
  },
  {
    state: "resolved_for_now",
    meaning: "The current interpretation is usable for a present artifact and may still evolve.",
  },
  {
    state: "needs_more_evidence",
    meaning: "The module needs more evidence examples or clearer confirmation before synthesis.",
    evidenceExpectation: "At least one evidence-linked example should support major claims.",
  },
  {
    state: "contradicted",
    meaning: "Evidence-linked statements or patterns conflict and need clarification.",
  },
  {
    state: "superseded",
    meaning: "A newer evidence-linked interpretation should replace this one.",
  },
  {
    state: "stale",
    meaning: "The interpretation may no longer represent the source accurately.",
  },
  {
    state: "ready_for_artifact",
    meaning: "The module has enough evidence-linked observations for a specific artifact.",
    artifactTypes: [
      "human_clarity_profile",
      "human_capability_brief",
      "private_reflection_summary",
      "alignment_input_brief",
    ],
  },
  {
    state: "archived",
    meaning: "The interpretation is retained for record but should not drive active synthesis.",
  },
  {
    state: "reopened",
    meaning: "New evidence or uncertainty reopened a previously stable interpretation.",
  },
];

export function interpretHumanResolutionState(
  state: ResolutionState
): HumanResolutionInterpretation | undefined {
  return humanResolutionInterpretations.find(
    (interpretation) => interpretation.state === state
  );
}
