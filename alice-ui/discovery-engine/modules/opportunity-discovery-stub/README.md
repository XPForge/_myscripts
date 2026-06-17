# Opportunity Discovery Stub Module

Opportunity Discovery Stub is a removable schema/module stress-test. It is not the full opportunity product.

This folder owns opportunity-specific schema language, artifact type names, alignment mappings, prompt references, policy references, fixture data, and resolution interpretation. The Discovery Core remains domain-neutral and continues to model the act of discovery rather than the subject being discovered.

## Files

- `wrapper.ts`: module declaration and registration-facing metadata.
- `schema.ts`: opportunity-native schema types and empty schema helper.
- `artifactTemplates.ts`: module-owned artifact template sketches.
- `resolution.ts`: module-owned interpretation of neutral core resolution states.
- `alignmentMap.ts`: mapping from opportunity schema areas to alignment registry id strings.
- `prompts.ts`: protected prompt references only.
- `policies.ts`: policy references/placeholders only.
- `module.ts`: ModuleRegistry registration object and helper.
- `fixtures.ts`: small module-owned sample data.

## Boundaries

Opportunity-specific terms are allowed in this module. They should not move into `core/`, `runtime/`, `storage/`, or the alignment registry mechanics.

Artifact type names such as `opportunity_reality_snapshot` are module-owned. The core only sees neutral artifact purposes such as `synthesis`, `reflection`, `presentation`, and `transfer`.

Alignment mappings use registry id strings. This module maps opportunity-native observations to the same replaceable alignment grammar used by other modules.

Resolution meaning is module-owned. The core records states and history; this module explains what those states mean for opportunity observations and artifact sketches.

Protected prompt and policy content must remain server-side. This module stores references only.
