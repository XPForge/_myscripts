import type { AlignmentDimensionId } from "../../alignment/dimensions";
import type { OpportunityDiscoverySchemaArea } from "./schema";

export type OpportunityAlignmentMapEntry = {
  schemaArea: OpportunityDiscoverySchemaArea;
  alignmentDimensionIds: AlignmentDimensionId[];
};

export const opportunityAlignmentMap: OpportunityAlignmentMapEntry[] = [
  {
    schemaArea: "work_to_be_done",
    alignmentDimensionIds: ["capability_to_work"],
  },
  {
    schemaArea: "operating_reality",
    alignmentDimensionIds: [
      "thinking_style_to_problem_type",
      "environmental_fit_to_culture_reality",
    ],
  },
  {
    schemaArea: "ambiguity_level",
    alignmentDimensionIds: ["learning_style_to_ramp_support"],
  },
  {
    schemaArea: "decision_rights",
    alignmentDimensionIds: ["autonomy_to_decision_rights"],
  },
  {
    schemaArea: "autonomy_level",
    alignmentDimensionIds: ["autonomy_to_decision_rights"],
  },
  {
    schemaArea: "creativity_tolerance",
    alignmentDimensionIds: ["creativity_to_innovation_tolerance"],
  },
  {
    schemaArea: "pace_and_pressure",
    alignmentDimensionIds: ["pressure_response_to_pace_stakes"],
  },
  {
    schemaArea: "communication_expectations",
    alignmentDimensionIds: ["communication_to_team_norms"],
  },
  {
    schemaArea: "collaboration_pattern",
    alignmentDimensionIds: ["communication_to_team_norms"],
  },
  {
    schemaArea: "success_conditions",
    alignmentDimensionIds: ["motivation_to_reward_structure"],
  },
  {
    schemaArea: "reward_structure",
    alignmentDimensionIds: ["motivation_to_reward_structure"],
  },
  {
    schemaArea: "growth_path",
    alignmentDimensionIds: ["growth_direction_to_growth_path"],
  },
  {
    schemaArea: "evaluation_style",
    alignmentDimensionIds: ["misread_risk_to_evaluation_style"],
  },
  {
    schemaArea: "hidden_risks",
    alignmentDimensionIds: ["misread_risk_to_evaluation_style"],
  },
  {
    schemaArea: "mission_reality",
    alignmentDimensionIds: ["values_to_mission_reality"],
  },
  {
    schemaArea: "failure_conditions",
    alignmentDimensionIds: [],
  },
  {
    schemaArea: "constraints",
    alignmentDimensionIds: [],
  },
  {
    schemaArea: "uncertainty_notes",
    alignmentDimensionIds: [],
  },
];

export function getOpportunityAlignmentDimensions(
  schemaArea: OpportunityDiscoverySchemaArea
): AlignmentDimensionId[] {
  return opportunityAlignmentMap.find((entry) => entry.schemaArea === schemaArea)
    ?.alignmentDimensionIds ?? [];
}
