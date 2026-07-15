export const OZ_DISCOVERY_CAPTURE_VERSION = "0.1" as const;

export type OzSchemaArea =
  | "capabilities"
  | "constraints"
  | "preferences"
  | "motivations"
  | "environment_fit"
  | "relationships"
  | "values"
  | "decision_making"
  | "uncertainty"
  | "other";

export type OzCaptureTurn = {
  id: string;
  role: "participant" | "alice" | "system";
  text: string;
  timestamp: string;
};

export type OzEvidenceItem = {
  id: string;
  excerpt: string;
  sourceTurnIds: string[];
  schemaAreas: OzSchemaArea[];
  uncertaintyNotes: string[];
};

export type OzPossibleSignal = {
  id: string;
  statement: string;
  evidenceItemIds: string[];
  schemaArea: OzSchemaArea;
  participantConfirmationNeeded: true;
  uncertaintyNotes: string[];
};

export type OzEmergingTheme = {
  id: string;
  title: string;
  description: string;
  evidenceItemIds: string[];
  participantConfirmationNeeded: true;
  uncertaintyNotes: string[];
};

export type OzOpenQuestion = {
  id: string;
  question: string;
  reason: string;
  relatedEvidenceItemIds: string[];
};

export type OzConfirmationNeed = {
  targetType: "possible_signal" | "emerging_theme" | "schema_mapping";
  targetId: string;
  reason: string;
};

export type OzSchemaAreaMapping = {
  schemaArea: OzSchemaArea;
  evidenceItemIds: string[];
  possibleSignalIds: string[];
  notes: string[];
};

export type OzDiscoveryCapture = {
  captureId: string;
  version: typeof OZ_DISCOVERY_CAPTURE_VERSION;
  createdAt: string;
  transcriptThroughTurnId: string;
  evidenceItems: OzEvidenceItem[];
  possibleSignals: OzPossibleSignal[];
  emergingThemes: OzEmergingTheme[];
  openQuestions: OzOpenQuestion[];
  doNotAssumeNotes: string[];
  participantConfirmationNeeded: OzConfirmationNeed[];
  schemaAreaMappings: OzSchemaAreaMapping[];
  uncertaintyNotes: string[];
};

