import type {
  AgentInstance,
  AgentLifecycleStatus,
  AgentParticipantMetadata,
} from "../instance";
import type { CoverageAssessment, IntelligenceSnapshot } from "../intelligence";
import type { LighthouseSession } from "../../../services/lighthouseSession";
import { DiscoveryAgentDefinition } from "./DiscoveryAgentDefinition";
import { DiscoverySchema } from "./DiscoverySchema";

function toLifecycleStatus(status: LighthouseSession["status"]): AgentLifecycleStatus {
  if (status === "complete") return "completed";
  if (status === "paused") return "paused";
  return "active";
}

function createEmptyCoverage(agentId: string): CoverageAssessment {
  return {
    agentId,
    overallStatus: "unexplored",
    updatedAt: new Date().toISOString(),
    areas: DiscoverySchema.sections.map((section) => ({
      areaId: section.id,
      status: "unexplored",
      known: [],
      unknown: [],
      needsExploration: [],
      observationIds: [],
      patternIds: [],
    })),
  };
}

function createEmptyInstanceSnapshot(subjectId?: string): IntelligenceSnapshot {
  return {
    agentId: DiscoveryAgentDefinition.id,
    subjectId,
    observations: [],
    patterns: [],
    understanding: [],
    coverage: createEmptyCoverage(DiscoveryAgentDefinition.id),
    reflections: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createDiscoveryAgentInstance(
  session: LighthouseSession,
  participant: AgentParticipantMetadata
): AgentInstance {
  const now = new Date().toISOString();
  const subjectId = participant.subjectId ?? participant.participantId ?? session.profileId;

  return {
    instanceId: `discovery-instance-${session.sessionId}`,
    agentDefinitionId: DiscoveryAgentDefinition.id,
    agentVersion: DiscoveryAgentDefinition.version,
    sessionId: session.sessionId,
    participantId: participant.participantId,
    subjectId,
    status: toLifecycleStatus(session.status),
    createdAt: session.createdAt || now,
    updatedAt: session.updatedAt || now,
    intelligenceSnapshot: createEmptyInstanceSnapshot(subjectId),
    metadata: {
      lpId: session.lpId,
      profileId: session.profileId,
      profileType: session.profileType,
      discoveryMethod: session.discoveryMethod,
    },
  };
}
