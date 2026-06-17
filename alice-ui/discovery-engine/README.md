# Project Lighthouse Discovery Engine - Phase 1

This folder is an isolated runtime skeleton. It does not connect to the current ALICE app, AppShell, container API, realtime runtime, backend token endpoint, or existing prototype folders.

## Canon Notes

- "The Discovery Core models the act of discovery, not the subject being discovered."
- "Core language must remain domain-neutral."
- "Resolution is a core mechanic, not a domain conclusion."
- "Modules define what resolution means."
- "Alignment dimensions are part of a replaceable alignment grammar, not immutable core truth."

## Structure

- `core/`: subject-agnostic workspace, session, turn, evidence, observation, resolution, artifact, event, and export bundle contracts.
- `alignment/`: replaceable shared alignment grammar and observation metadata.
- `runtime/`: lifecycle helpers, module registry, and re-instantiation placeholder.
- `storage/`: storage adapter contract and in-memory implementation.

## What The Core Owns

The core owns neutral discovery mechanics:

- workspace lifecycle
- session lifecycle
- conversation turns
- evidence references
- observations
- inference, confirmation, confidence, visibility, and uncertainty metadata
- resolution state and resolution history
- artifact generation attempts
- artifact versions
- event logs
- export/import bundles
- neutral `metadata` and `moduleData` containers

The core may store `moduleData`, but only the owning module should interpret it.

Conversation turns keep a simple `content: string` path for text while also allowing optional neutral `contentBlocks` for future structured, imported, or multimodal content. Phase 1A only defines the contract; it does not implement file, audio, or image handling.

## What Modules Own

Modules own domain meaning. A module decides:

- what the subject represents
- what its schema fields mean
- how observations should be interpreted
- what an artifact should contain
- which domain artifact types exist
- what resolution means for that module
- what prompts, policies, wrappers, and output constraints apply

Human Discovery, Opportunity Discovery, Team Discovery, Organization Discovery, Product Discovery, Project Discovery, and future modules should plug into the same neutral mechanics without changing the core vocabulary.

Domain-specific artifact types belong in module artifact templates. Core `ArtifactPurpose` values remain neutral: synthesis, reflection, comparison, decision support, transfer, record, presentation, and custom.

## Domain-Neutral Core

The core avoids required terms that would bind it to one domain, such as resume, candidate, job, hiring manager, work style, skills, product market, or project brief. Domain-specific meaning belongs in modules, wrappers, schemas, artifact templates, and alignment packages.

Visibility scope also remains domain-neutral. Core visibility values describe mechanics only: internal only, module only, source visible, artifact eligible, export eligible, and restricted.

## Resolution

Resolution is modeled as a lifecycle mechanism. Neutral states include `unresolved`, `partially_resolved`, `resolved_for_now`, `needs_more_evidence`, `contradicted`, `superseded`, `stale`, `ready_for_artifact`, `archived`, and `reopened`.

The core records:

- current resolution state
- transition history
- transition reason
- related evidence references
- related module id where applicable
- event log entries

The core does not decide what ready, complete, or resolved means for any domain. Modules define those meanings.

## Native Alignment

Alignment metadata is preserved in `alignment/` through a replaceable registry. Alignment dimension ids are registry data, not a closed core union. The initial Lighthouse registry includes dimensions for the first Human/Opportunity use case, but those dimensions are not immutable core truth. Future projects can replace, extend, or swap the registry while preserving the same core discovery mechanics.

Alignment observations can carry:

- `moduleId`
- domain tags
- alignment dimensions
- polarity
- evidence references
- confirmation status
- confidence
- source identity
- metadata and module data

This lets different modules emit observations into a shared alignment grammar without relying on a later translation layer.

## Extensibility

Discovery event types are extensible strings. The core exports a list of known core event types, but modules can add their own event types without changing the core type contract.

The module registry is schema-version aware. Multiple versions of the same `moduleId` can be registered, retrieved by explicit `schemaVersion`, or listed for migration and compatibility checks.
