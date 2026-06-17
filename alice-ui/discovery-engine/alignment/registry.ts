import type { AlignmentDimensionDefinition } from "./dimensions";
import { lighthouseInitialAlignmentDimensions } from "./dimensions";

export type AlignmentDimensionRegistry = {
  id: string;
  version: string;
  dimensions: AlignmentDimensionDefinition[];
  metadata?: Record<string, unknown>;
};

export const lighthouseInitialAlignmentRegistry: AlignmentDimensionRegistry = {
  id: "lighthouse.initial-alignment",
  version: "1.0.0",
  dimensions: lighthouseInitialAlignmentDimensions,
};

export function createAlignmentRegistry(input: {
  id: string;
  version: string;
  dimensions: AlignmentDimensionDefinition[];
  metadata?: Record<string, unknown>;
}): AlignmentDimensionRegistry {
  return {
    id: input.id,
    version: input.version,
    dimensions: [...input.dimensions],
    metadata: input.metadata,
  };
}
