export type IntelligenceConfidenceLevel = "low" | "medium" | "high";

export type EvidenceSourceType =
  | "transcript"
  | "interaction"
  | "document"
  | "self-report"
  | "observation";

export type EvidenceStrength = "weak" | "moderate" | "strong";

export type ObservationStatus =
  | "raw"
  | "developing"
  | "supported"
  | "contested"
  | "retired";

export type PatternStatus =
  | "emerging"
  | "supported"
  | "stable"
  | "needs-review";

export type UnderstandingStatus =
  | "unknown"
  | "insufficient"
  | "emerging"
  | "sufficient"
  | "strong";

export type CoverageStatus =
  | "unexplored"
  | "partially-explored"
  | "sufficiently-explored"
  | "needs-follow-up";

export interface TranscriptSegmentReference {
  transcriptId: string;
  segmentId: string;
  speaker: "participant" | "agent" | "system" | "unknown";
  text: string;
  startedAt?: string;
  endedAt?: string;
}

export interface EvidenceReference {
  id: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  description: string;
  strength: EvidenceStrength;
  transcriptSegment?: TranscriptSegmentReference;
  capturedAt?: string;
}

export interface ConfidenceAssessment {
  level: IntelligenceConfidenceLevel;
  score?: number;
  rationale: string;
  evidenceCount: number;
  evidenceStrength: EvidenceStrength;
  unresolvedQuestions: string[];
}

export interface AgentObservation {
  id: string;
  agentId: string;
  subjectId?: string;
  areaId: string;
  statement: string;
  description?: string;
  status: ObservationStatus;
  evidence: EvidenceReference[];
  confidence: ConfidenceAssessment;
  createdAt: string;
  updatedAt: string;
}

export interface ObservationSet {
  id: string;
  agentId: string;
  observations: AgentObservation[];
  createdAt: string;
  updatedAt: string;
}

export interface PatternSignal {
  observationId: string;
  contribution: "primary" | "supporting" | "contradicting";
  rationale: string;
}

export interface AgentPattern {
  id: string;
  agentId: string;
  name: string;
  description: string;
  status: PatternStatus;
  signals: PatternSignal[];
  confidence: ConfidenceAssessment;
  createdAt: string;
  updatedAt: string;
}

export interface UnderstandingArea {
  id: string;
  name: string;
  description: string;
  requiredObservationCount?: number;
  requiredEvidenceCount?: number;
  minimumConfidence?: IntelligenceConfidenceLevel;
}

export interface UnderstandingAssessment {
  areaId: string;
  status: UnderstandingStatus;
  summary: string;
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  confidence: ConfidenceAssessment;
  remainingQuestions: string[];
}

export interface CoverageArea {
  areaId: string;
  status: CoverageStatus;
  known: string[];
  unknown: string[];
  needsExploration: string[];
  observationIds: string[];
  patternIds: string[];
}

export interface CoverageAssessment {
  agentId: string;
  areas: CoverageArea[];
  overallStatus: CoverageStatus;
  updatedAt: string;
}

export interface ReflectionStatement {
  id: string;
  sourceObservationIds: string[];
  sourcePatternIds?: string[];
  rawStatement: string;
  reflectiveStatement: string;
  confidence: ConfidenceAssessment;
  createdAt: string;
}

export interface IntelligenceSnapshot {
  agentId: string;
  subjectId?: string;
  observations: AgentObservation[];
  patterns: AgentPattern[];
  understanding: UnderstandingAssessment[];
  coverage: CoverageAssessment;
  reflections: ReflectionStatement[];
  updatedAt: string;
}
