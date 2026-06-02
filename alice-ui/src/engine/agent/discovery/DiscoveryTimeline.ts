import type { AgentEvent } from "../instance";
import type { DiscoveryPromptOutputs } from "../prompt";
import type { DiscoverySessionState } from "./DiscoverySessionState";

export type DiscoveryTimelineItemType =
  | "transcript-turn"
  | "observation"
  | "evidence"
  | "confidence"
  | "pattern"
  | "coverage"
  | "understanding"
  | "open-question"
  | "reflection-opportunity"
  | "decision"
  | "completion-readiness"
  | "prompt-assembly"
  | "error";

export interface DiscoveryTimelineItem {
  id: string;
  type: DiscoveryTimelineItemType;
  title: string;
  description: string;
  createdAt: string;
  sourceEventType?: AgentEvent["type"];
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
}

function eventDescription(event: AgentEvent): DiscoveryTimelineItem {
  switch (event.type) {
    case "participant.input":
      return {
        id: event.eventId,
        type: "transcript-turn",
        title: "Transcript Turn",
        description: event.input.text,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.input.id],
      };
    case "assistant.response":
    case "agent.response":
      return {
        id: event.eventId,
        type: "transcript-turn",
        title: "Assistant Response",
        description: event.type === "assistant.response" ? event.response.text : event.response.text,
        createdAt: event.createdAt,
        sourceEventType: event.type,
      };
    case "observation.created":
      return {
        id: event.eventId,
        type: "observation",
        title: "Observation",
        description: event.observation.description ?? event.observation.statement,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.observation.id],
        metadata: event.observation.metadata,
      };
    case "evidence.added":
      return {
        id: event.eventId,
        type: "evidence",
        title: "Evidence",
        description: event.evidence.description,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.evidence.id, event.observationId],
      };
    case "confidence.updated":
      return {
        id: event.eventId,
        type: "confidence",
        title: "Confidence",
        description: `${event.confidence.level}: ${event.confidence.rationale}`,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.targetId],
      };
    case "pattern.created":
      return {
        id: event.eventId,
        type: "pattern",
        title: "Pattern",
        description: event.pattern.description,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.pattern.id],
        metadata: event.pattern.metadata,
      };
    case "coverage.updated":
      return {
        id: event.eventId,
        type: "coverage",
        title: "Coverage Update",
        description: `Overall coverage is ${event.coverage.overallStatus}.`,
        createdAt: event.createdAt,
        sourceEventType: event.type,
      };
    case "understanding.updated":
      return {
        id: event.eventId,
        type: "understanding",
        title: "Understanding Update",
        description: `${event.understanding.length} understanding area(s) updated.`,
        createdAt: event.createdAt,
        sourceEventType: event.type,
      };
    case "open_question.created":
      return {
        id: event.eventId,
        type: "open-question",
        title: "Open Question",
        description: event.question.question,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.question.id],
      };
    case "reflection_opportunity.created":
      return {
        id: event.eventId,
        type: "reflection-opportunity",
        title: "Reflection Opportunity",
        description: event.opportunity.reason,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.opportunity.id, event.opportunity.sourceId],
      };
    case "decision.selected":
      return {
        id: event.eventId,
        type: "decision",
        title: "Decision Selected",
        description: `${event.decision.selectedRequest.type}: ${event.decision.rationale}`,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.decision.id],
      };
    case "decision.rejected":
    case "decision.reprioritized":
      return {
        id: event.eventId,
        type: "decision",
        title: event.type === "decision.rejected" ? "Decision Rejected" : "Decision Reprioritized",
        description: `${event.alternative.request.type}: ${event.alternative.rationale}`,
        createdAt: event.createdAt,
        sourceEventType: event.type,
        sourceIds: [event.decisionId],
      };
    case "completion.readiness.updated":
      return {
        id: event.eventId,
        type: "completion-readiness",
        title: "Completion Readiness",
        description: `${event.readiness.status} (${event.readiness.score}): ${event.readiness.rationale}`,
        createdAt: event.createdAt,
        sourceEventType: event.type,
      };
    case "error":
      return {
        id: event.eventId,
        type: "error",
        title: "Error",
        description: event.error.message,
        createdAt: event.createdAt,
        sourceEventType: event.type,
      };
    default:
      return {
        id: event.eventId,
        type: "transcript-turn",
        title: event.type,
        description: "Discovery event recorded.",
        createdAt: event.createdAt,
        sourceEventType: event.type,
      };
  }
}

export function createDiscoveryTimeline(
  state: DiscoverySessionState,
  promptOutputs?: DiscoveryPromptOutputs
): DiscoveryTimelineItem[] {
  const eventItems = state.eventLog.map(eventDescription);
  const promptItem: DiscoveryTimelineItem[] = promptOutputs
    ? [
        {
          id: `prompt-${promptOutputs.runtimeMetadata.assembledAt}`,
          type: "prompt-assembly",
          title: "Prompt Assembly",
          description: `Prompt assembled for ${promptOutputs.runtimeMetadata.runtimeMode}.`,
          createdAt: promptOutputs.runtimeMetadata.assembledAt,
          sourceIds: promptOutputs.supportedBehaviorRequests.map((request) => request.id),
          metadata: promptOutputs.runtimeMetadata.metadata,
        },
      ]
    : [];

  return [...eventItems, ...promptItem].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}
