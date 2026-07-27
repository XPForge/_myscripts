# Lighthouse Modular Discovery Core Doctrine

Document Type: Architecture Doctrine / Canon Candidate
Status: Working Canon Candidate
Primary Folder: 04_ARCHITECTURE_AND_SYSTEM_DESIGN
Confidentiality: INTERNAL
Purpose: Preserve the requirement that Lighthouse Discovery must be built as a standalone, portable, schema-driven, runtime-swappable, model-swappable module.
Related Canon: Soul Kernel, Architecture/Product/Roadmap Canon, Discovery/Profile/Participant Authority Canon, Prime Directives & Language Canon
Last Reviewed: 2026-06-18
Next Action: Review before every Discovery runtime, module, provider, schema, or host integration change.

## Core Statement

The Lighthouse Discovery system must be built as a standalone, portable, schema-driven core module that can be embedded into different host environments, connected to different runtimes, paired with different model providers, and redirected toward different discovery domains by changing external schemas, adapters, and output definitions rather than rewriting the core.

## Short Canon Form

The core discovers.
The schema defines what kind of thing is being discovered.
The runtime can be swapped.
The model can be swapped.
The host can be swapped.
The module remains portable.

## Modular and Modular Principle

Lighthouse modularity exists at multiple levels:

1. Runtime-swappable
   The runtime layer must be replaceable with minimal code changes.

2. Model-swappable
   The AI model or provider must be replaceable with minimal code changes.

3. Module-swappable
   The entire Discovery module must be usable as a standalone component in other applications or platforms.

4. Schema-driven
   The outside schema/config/adapters must define the discovery domain and output behavior.

5. Host-agnostic
   The module must not be welded to one web app, UI, backend, provider, model, or product surface.

## Required Architecture Shape

Host Environment
-> Input Adapter
-> Input Envelope
-> Discovery Module Core
-> Runtime Adapter
-> Model Provider Adapter
-> Model
-> Response Envelope
-> Transcript/Event Recorder
-> Export/Evaluation Layer

## What Must Stay Swappable

The following must remain swappable:

* host app
* UI shell
* input adapters
* schemas/configs
* runtime adapter
* model provider adapter
* AI model
* storage adapter
* transcript/export layer
* evaluation layer
* domain output templates

## Valid Host Environments

The Discovery module should eventually be embeddable in:

* Lighthouse web app
* mobile app
* CLI harness
* API service
* local test bench
* partner tool
* future external platform

## Valid Discovery Domains

The same core module should be usable for:

* Human Discovery
* Opportunity Discovery
* Team Discovery
* Organization Discovery
* Role Discovery
* Mentorship Discovery
* Education or learning path discovery
* Partnership Discovery
* Relationship or dating discovery
* Future alignment-based discovery domains

Each domain may require its own schema, consent rules, output templates, safety boundaries, and visibility rules.

The core should not be rebuilt for each domain.

## Core Rule

The Discovery core should discover, record, route, and preserve structure.

The schema defines what kind of thing is being discovered.

## Anti-Pattern Warning

Do not build Lighthouse Discovery as:

* a one-off chat app
* a hard-coded Human Discovery app
* a prompt wrapper only
* a provider-specific implementation
* a UI-owned runtime
* a model-owned runtime
* a schema welded into core logic
* a non-portable prototype that must be gutted later

## CR-1 Native Baseline Rule

For CR-1, the native model baseline experiment must preserve the modular architecture while applying no Lighthouse behavioral control to the model.

CR-1 must not add:

* Lighthouse system prompt
* Alice persona prompt
* Discovery prompt
* canon injection
* Oz guidance
* behavior rubric inside the model prompt
* scripted question strategy
* scoring, matching, ranking, recommendation, percentage, qualification, or fit logic
* profile generation
* artifact generation

The CR-1 transcript and benchmark may be recorded externally, but the model must remain native or minimally instructed.

## Review Requirement

Before any future Codex implementation involving Discovery, runtime, provider, schema, input handling, transcript capture, evaluation, profile generation, Opportunity Discovery, or host integration, this document must be reviewed.

Every Codex report for related work should include:

* Was `LIGHTHOUSE_MODULAR_DISCOVERY_CORE_DOCTRINE.md` reviewed? yes/no
* Did the change preserve runtime swappability? yes/no
* Did the change preserve model/provider swappability? yes/no
* Did the change preserve host-agnostic module portability? yes/no
* Did the change avoid hard-coding a domain into the core? yes/no
* Did the change keep schema/config outside the core behavior? yes/no
* Did the change avoid turning the UI into the runtime? yes/no

## Build Gate

If a proposed implementation violates this doctrine, stop and report the conflict before changing code.

Do not "fix" the conflict silently.

## Canon Candidate

This doctrine should be treated as a Lighthouse architecture canon candidate until formally promoted.
