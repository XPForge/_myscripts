# Discovery Engine Harness

This harness verifies module registration and native alignment compatibility for the isolated Discovery Engine.

“Native alignment does not require identical schemas. Lighthouse modules may preserve subject-native structures while emitting compatible alignment metadata into a shared, replaceable alignment grammar.”

## What It Proves

- Multiple modules can register in `ModuleRegistry`.
- Registered modules preserve schema versions.
- Modules can be retrieved by `moduleId` and `schemaVersion`.
- Human Discovery and Opportunity Discovery Stub remain removable modules.
- Human and Opportunity fixtures can emit compatible alignment metadata without identical schemas.
- Prompt entries are references/placeholders only.
- Resolution meaning remains module-owned.

## What It Must Not Become

The harness is not:

- UI
- API
- scoring
- matching
- ranking
- recommendations
- artifact generation
- database persistence
- protected prompt loading

## Why `harness/`

The harness sits outside `core/`, `runtime/`, `storage/`, and `modules/` because it verifies boundaries around those areas. It may import multiple modules for comparison, but core/runtime/storage should not depend on module-specific vocabulary.

## Native Alignment Verification

The harness checks that:

- the Human fixture emits `capability_to_work`,
- the Opportunity fixture emits `capability_to_work`,
- the Human schema uses `capabilityPatterns`,
- the Opportunity schema uses `workToBeDone`,
- those schemas remain non-identical,
- the shared dimension is registry metadata represented by string ids.

It does not score, rank, match, produce fit percentages, or generate recommendations.

## Protected Prompts

Prompt files remain reference-only. Protected prompt text belongs in server-side configuration, not in this harness or module metadata.
