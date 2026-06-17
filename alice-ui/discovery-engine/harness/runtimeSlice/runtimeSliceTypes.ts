import type {
  DiscoveryWorkspace,
  ExportBundle,
} from "../../core/types";
import type { AlignmentSignal } from "../../alignment/proof/alignmentTypes";

export type RuntimeSliceInput = {
  workspaceId?: string;
  sessionId?: string;
  moduleId?: string;
  text: string;
  sourceLabel?: string;
  includeOpportunityFixtureProof?: boolean;
};

export type RuntimeSliceCheck = {
  id: string;
  passed: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

export type RuntimeSliceResult = {
  workspace: DiscoveryWorkspace;
  sessionId: string;
  turnId: string;
  evidenceReferenceId: string;
  observationId: string;
  alignmentObservationId?: string;
  exportBundle?: ExportBundle;
  alignmentProofSignals?: AlignmentSignal[];
  checks: RuntimeSliceCheck[];
};
