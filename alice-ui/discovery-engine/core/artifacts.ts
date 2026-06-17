import type {
  ArtifactGenerationAttempt,
  ArtifactPurpose,
  ArtifactVersion,
  DiscoveryEvent,
  EvidenceReference,
} from "./types";
import { createDiscoveryEvent } from "./events";

export function createArtifactAttempt(input: {
  workspaceId: string;
  sessionId?: string;
  moduleId: string;
  artifactPurpose: ArtifactPurpose;
  inputEvidenceRefs?: EvidenceReference[];
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): { attempt: ArtifactGenerationAttempt; event: DiscoveryEvent } {
  const attempt: ArtifactGenerationAttempt = {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    sessionId: input.sessionId,
    moduleId: input.moduleId,
    artifactPurpose: input.artifactPurpose,
    status: "queued",
    inputEvidenceRefs: input.inputEvidenceRefs ?? [],
    createdAt: new Date().toISOString(),
    metadata: input.metadata,
    moduleData: input.moduleData,
  };
  const event = createDiscoveryEvent({
    workspaceId: input.workspaceId,
    sessionId: input.sessionId,
    type: "artifact_attempted",
    relatedIds: [attempt.id],
    moduleId: input.moduleId,
  });

  return { attempt, event };
}

export function createArtifactVersion(input: {
  workspaceId: string;
  moduleId: string;
  artifactPurpose: ArtifactPurpose;
  content: string;
  contentType?: ArtifactVersion["contentType"];
  evidenceRefs?: EvidenceReference[];
  label?: string;
  metadata?: Record<string, unknown>;
  moduleData?: Record<string, unknown>;
}): { artifact: ArtifactVersion; event: DiscoveryEvent } {
  const now = new Date().toISOString();
  const artifact: ArtifactVersion = {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    moduleId: input.moduleId,
    artifactPurpose: input.artifactPurpose,
    version: {
      id: crypto.randomUUID(),
      createdAt: now,
      label: input.label,
    },
    content: input.content,
    contentType: input.contentType ?? "text/markdown",
    evidenceRefs: input.evidenceRefs ?? [],
    createdAt: now,
    metadata: input.metadata,
    moduleData: input.moduleData,
  };
  const event = createDiscoveryEvent({
    workspaceId: input.workspaceId,
    type: "artifact_version_created",
    relatedIds: [artifact.id],
    moduleId: input.moduleId,
  });

  return { artifact, event };
}
