export type AlignmentDimensionId = string;

export type AlignmentDimensionDefinition = {
  id: AlignmentDimensionId;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export const lighthouseInitialAlignmentDimensions: AlignmentDimensionDefinition[] = [
  { id: "capability_to_work", label: "Capability to work" },
  { id: "thinking_style_to_problem_type", label: "Thinking style to problem type" },
  { id: "learning_style_to_ramp_support", label: "Learning style to ramp support" },
  { id: "autonomy_to_decision_rights", label: "Autonomy to decision rights" },
  { id: "creativity_to_innovation_tolerance", label: "Creativity to innovation tolerance" },
  { id: "pressure_response_to_pace_stakes", label: "Pressure response to pace stakes" },
  { id: "communication_to_team_norms", label: "Communication to team norms" },
  { id: "motivation_to_reward_structure", label: "Motivation to reward structure" },
  { id: "environmental_fit_to_culture_reality", label: "Environmental fit to culture reality" },
  { id: "growth_direction_to_growth_path", label: "Growth direction to growth path" },
  { id: "misread_risk_to_evaluation_style", label: "Misread risk to evaluation style" },
  { id: "values_to_mission_reality", label: "Values to mission reality" },
];
