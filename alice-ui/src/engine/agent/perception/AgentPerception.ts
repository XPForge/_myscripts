import type {
  AgentObservation,
  AgentPattern,
  ConfidenceAssessment,
  CoverageAssessment,
  EvidenceReference,
  ReflectionStatement,
  UnderstandingAssessment,
} from "../intelligence";
import type {
  AgentInstance,
  AgentRuntimeContext,
  AgentTranscriptTurn,
} from "../instance";

export type PerceptionPipelineStage =
  | "observation"
  | "evidence"
  | "confidence"
  | "pattern"
  | "coverage"
  | "understanding"
  | "reflection";

export interface PerceptionPipelineContext {
  instance: AgentInstance;
  runtimeContext: AgentRuntimeContext;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PerceptionPipelineResult<TOutput> {
  stage: PerceptionPipelineStage;
  output: TOutput;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ObservationPipelineInput {
  transcriptEvents: AgentTranscriptTurn[];
  existingObservations: AgentObservation[];
  context: PerceptionPipelineContext;
}

export interface ObservationPipelineOutput {
  observations: AgentObservation[];
}

export interface ObservationPipeline {
  stage: "observation";
  perceive(
    input: ObservationPipelineInput
  ): PerceptionPipelineResult<ObservationPipelineOutput>;
}

export interface EvidencePipelineInput {
  observations: AgentObservation[];
  availableEvidence: EvidenceReference[];
  transcriptEvents: AgentTranscriptTurn[];
  context: PerceptionPipelineContext;
}

export interface EvidencePipelineOutput {
  observations: AgentObservation[];
}

export interface EvidencePipeline {
  stage: "evidence";
  attachEvidence(
    input: EvidencePipelineInput
  ): PerceptionPipelineResult<EvidencePipelineOutput>;
}

export interface ConfidencePipelineInput {
  observations: AgentObservation[];
  evidence: EvidenceReference[];
  context: PerceptionPipelineContext;
}

export interface ConfidencePipelineOutput {
  observations: AgentObservation[];
  confidenceAssessments: ConfidenceAssessment[];
}

export interface ConfidencePipeline {
  stage: "confidence";
  assessConfidence(
    input: ConfidencePipelineInput
  ): PerceptionPipelineResult<ConfidencePipelineOutput>;
}

export interface PatternPipelineInput {
  observations: AgentObservation[];
  existingPatterns: AgentPattern[];
  context: PerceptionPipelineContext;
}

export interface PatternPipelineOutput {
  patterns: AgentPattern[];
}

export interface PatternPipeline {
  stage: "pattern";
  recognizePatterns(
    input: PatternPipelineInput
  ): PerceptionPipelineResult<PatternPipelineOutput>;
}

export interface CoveragePipelineInput {
  observations: AgentObservation[];
  patterns: AgentPattern[];
  existingCoverage?: CoverageAssessment;
  context: PerceptionPipelineContext;
}

export interface CoveragePipelineOutput {
  coverage: CoverageAssessment;
}

export interface CoveragePipeline {
  stage: "coverage";
  assessCoverage(
    input: CoveragePipelineInput
  ): PerceptionPipelineResult<CoveragePipelineOutput>;
}

export interface UnderstandingPipelineInput {
  coverage: CoverageAssessment;
  confidenceAssessments: ConfidenceAssessment[];
  patterns: AgentPattern[];
  existingUnderstanding: UnderstandingAssessment[];
  context: PerceptionPipelineContext;
}

export interface UnderstandingPipelineOutput {
  understanding: UnderstandingAssessment[];
}

export interface UnderstandingPipeline {
  stage: "understanding";
  formUnderstanding(
    input: UnderstandingPipelineInput
  ): PerceptionPipelineResult<UnderstandingPipelineOutput>;
}

export interface ReflectionPipelineInput {
  understanding: UnderstandingAssessment[];
  existingReflections: ReflectionStatement[];
  context: PerceptionPipelineContext;
}

export interface ReflectionPipelineOutput {
  reflections: ReflectionStatement[];
}

export interface ReflectionPipeline {
  stage: "reflection";
  createReflections(
    input: ReflectionPipelineInput
  ): PerceptionPipelineResult<ReflectionPipelineOutput>;
}

export interface AgentPerceptionPipeline {
  observation: ObservationPipeline;
  evidence: EvidencePipeline;
  confidence: ConfidencePipeline;
  pattern: PatternPipeline;
  coverage: CoveragePipeline;
  understanding: UnderstandingPipeline;
  reflection: ReflectionPipeline;
}
