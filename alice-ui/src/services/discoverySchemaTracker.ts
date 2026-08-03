import type { DiscoveryFieldKey } from "./lighthouseProfile";

// Label map for the 16 granular Discovery topics Alice is instructed to
// explore in live conversation (the opening introduction message and the
// realtime voice system prompt both build their "what to explore" list from
// this). Coverage/readiness scoring against these labels has moved to
// ./ozSchemaCoverage.ts, which scores against the AI-classified Oz schema
// areas instead of a keyword scan — this file now exists solely to back the
// conversation-elicitation prompt wording, which intentionally stays
// granular even though scoring no longer does.

export const DISCOVERY_FIELD_LABELS: Record<DiscoveryFieldKey, string> = {
  workMotivators: "What motivates their work",
  workFrustrators: "What frustrates or drains them",
  learningCharacteristics: "How they learn",
  problemSolvingCharacteristics: "How they solve problems",
  communicationCharacteristics: "How they communicate",
  leadershipCharacteristics: "How they lead",
  collaborationCharacteristics: "How they collaborate",
  environmentalAccelerators: "Environments that help them thrive",
  environmentalInhibitors: "Environments that hold them back",
  adaptabilityCharacteristics: "How they adapt to change",
  pressureResponse: "How they respond under pressure",
  opportunityIndicators: "What opportunities interest them",
  overlookedCharacteristics: "Strengths that get overlooked",
  supportingEvidence: "Concrete examples and evidence",
  emergentDiscoveries: "New things surfacing in conversation",
  notYetDiscovered: "What's still unexplored",
};
