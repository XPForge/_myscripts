# Human Discovery Module

Human Discovery is a removable module, not the Discovery Engine itself.

This folder owns human-specific schema language, artifact type names, alignment mappings, prompt references, policy references, fixture data, and resolution interpretation. The Discovery Core remains domain-neutral and continues to model the act of discovery rather than the subject being discovered.

## Files

- `wrapper.ts`: module declaration and registration-facing metadata.
- `schema.ts`: Human Discovery schema types and empty schema helper.
- `artifactTemplates.ts`: module-owned artifact template metadata.
- `resolution.ts`: module-owned interpretation of neutral core resolution states.
- `alignmentMap.ts`: mapping from human schema areas to alignment registry id strings.
- `prompts.ts`: protected prompt references only.
- `policies.ts`: policy references/placeholders only.
- `module.ts`: ModuleRegistry registration object and helper.
- `fixtures.ts`: small module-owned sample data.

## Boundaries

Human-specific terms are allowed in this module. They should not move into `core/`, `runtime/`, `storage/`, or the alignment registry mechanics.

Artifact type names such as `human_clarity_profile` are module-owned. The core only sees neutral artifact purposes such as `synthesis`, `reflection`, `presentation`, and `transfer`.

Alignment mappings use registry id strings. The module does not require a closed core alignment enum.

Resolution meaning is module-owned. The core records states and history; this module explains what those states mean for Human Discovery artifacts and observations.

Protected prompt and policy content must remain server-side. This module stores references only.
