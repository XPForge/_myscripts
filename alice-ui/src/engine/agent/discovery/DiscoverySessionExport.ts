import type { DiscoveryPromptOutputs } from "../prompt";
import type { DiscoverySessionState } from "./DiscoverySessionState";

export interface DiscoverySessionExportSnapshot {
  exportedAt: string;
  stateId: string;
  agentId: string;
  sessionId: string;
  participant: DiscoverySessionState["participant"];
  transcript: DiscoverySessionState["transcript"];
  observations: DiscoverySessionState["intelligenceSnapshot"]["observations"];
  evidence: DiscoverySessionState["evidence"];
  confidence: {
    targetId: string;
    confidence: DiscoverySessionState["intelligenceSnapshot"]["observations"][number]["confidence"];
  }[];
  patterns: DiscoverySessionState["intelligenceSnapshot"]["patterns"];
  coverage: DiscoverySessionState["intelligenceSnapshot"]["coverage"];
  understanding: DiscoverySessionState["intelligenceSnapshot"]["understanding"];
  openQuestions: DiscoverySessionState["openQuestions"];
  reflectionOpportunities: DiscoverySessionState["reflectionOpportunities"];
  participantConfirmations: DiscoverySessionState["participantConfirmations"];
  latestBehaviorDecision: DiscoverySessionState["latestBehaviorDecision"];
  behaviorDecisions: DiscoverySessionState["behaviorDecisionHistory"];
  eventLog: DiscoverySessionState["eventLog"];
  promptMetadata?: DiscoveryPromptOutputs["runtimeMetadata"];
}

export function createDiscoverySessionExport(
  state: DiscoverySessionState,
  promptOutputs?: DiscoveryPromptOutputs
): DiscoverySessionExportSnapshot {
  return {
    exportedAt: new Date().toISOString(),
    stateId: state.stateId,
    agentId: state.agentId,
    sessionId: state.sessionId,
    participant: state.participant,
    transcript: state.transcript,
    observations: state.intelligenceSnapshot.observations,
    evidence: state.evidence,
    confidence: state.intelligenceSnapshot.observations.map((observation) => ({
      targetId: observation.id,
      confidence: observation.confidence,
    })),
    patterns: state.intelligenceSnapshot.patterns,
    coverage: state.intelligenceSnapshot.coverage,
    understanding: state.intelligenceSnapshot.understanding,
    openQuestions: state.openQuestions,
    reflectionOpportunities: state.reflectionOpportunities,
    participantConfirmations: state.participantConfirmations,
    latestBehaviorDecision: state.latestBehaviorDecision,
    behaviorDecisions: state.behaviorDecisionHistory,
    eventLog: state.eventLog,
    promptMetadata: promptOutputs?.runtimeMetadata,
  };
}

export function stringifyDiscoverySessionExport(
  snapshot: DiscoverySessionExportSnapshot
): string {
  return JSON.stringify(snapshot, null, 2);
}
