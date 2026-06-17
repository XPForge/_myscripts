import type { AlignmentDimensionId } from "../../alignment/dimensions";
import type { HumanDiscoverySchemaArea } from "./schema";

export type HumanAlignmentMapEntry = {
  schemaArea: HumanDiscoverySchemaArea;
  alignmentDimensionIds: AlignmentDimensionId[];
};

export const humanAlignmentMap: HumanAlignmentMapEntry[] = [
  {
    schemaArea: "capability_patterns",
    alignmentDimensionIds: ["capability_to_work"],
  },
  {
    schemaArea: "operating_style",
    alignmentDimensionIds: ["thinking_style_to_problem_type"],
  },
  {
    schemaArea: "learning_pattern",
    alignmentDimensionIds: ["learning_style_to_ramp_support"],
  },
  {
    schemaArea: "communication_pattern",
    alignmentDimensionIds: ["communication_to_team_norms"],
  },
  {
    schemaArea: "motivation_pattern",
    alignmentDimensionIds: ["motivation_to_reward_structure"],
  },
  {
    schemaArea: "environment_needs",
    alignmentDimensionIds: ["environmental_fit_to_culture_reality"],
  },
  {
    schemaArea: "pressure_response",
    alignmentDimensionIds: ["pressure_response_to_pace_stakes"],
  },
  {
    schemaArea: "creative_technical_synthesis",
    alignmentDimensionIds: [
      "creativity_to_innovation_tolerance",
      "thinking_style_to_problem_type",
    ],
  },
  {
    schemaArea: "misread_risks",
    alignmentDimensionIds: ["misread_risk_to_evaluation_style"],
  },
  {
    schemaArea: "growth_direction",
    alignmentDimensionIds: ["growth_direction_to_growth_path"],
  },
  {
    schemaArea: "values_pattern",
    alignmentDimensionIds: ["values_to_mission_reality"],
  },
  {
    schemaArea: "uncertainty_notes",
    alignmentDimensionIds: [],
  },
  {
    schemaArea: "evidence_examples",
    alignmentDimensionIds: [],
  },
];

export function getHumanAlignmentDimensions(
  schemaArea: HumanDiscoverySchemaArea
): AlignmentDimensionId[] {
  return humanAlignmentMap.find((entry) => entry.schemaArea === schemaArea)
    ?.alignmentDimensionIds ?? [];
}
