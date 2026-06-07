# Project Lighthouse Clean Prototype - Implementation Notes

## Clean Build Boundary

This prototype lives in `lighthouse-clean-prototype` and is intentionally isolated from the existing Alice/Lighthouse implementation.

The existing build was inspected only for the allowed API credential convention:

- `OPENAI_API_KEY`
- `OPENAI_API_BASE`
- `OPENAI_REALTIME_VOICE`

The prototype does not reuse the existing frontend `VITE_OPENAI_API_KEY` pattern, prompt wrappers, route structure, session model, profile generation logic, or UI components.

## Realtime Voice Strategy

Chosen strategy for this first clean implementation: **Fallback hierarchy item 3: voice-first request pipeline using speech-to-text -> server-side Discovery call -> text-to-speech.**

Realtime voice-to-voice remains the desired default participant experience for Lighthouse. It is deferred in this implementation because the current browser-connected OpenAI Realtime client-secret/session flow can expose session instructions through client-visible session configuration/events. The protected Discovery Agent prompt is core Project Lighthouse IP and must never reach the browser, including through network payloads, browser-observable Realtime events, or session configuration.

The specific exposure issue is:

- A browser-connected Realtime session requires the client to connect directly to OpenAI using an ephemeral client secret.
- Realtime session configuration supports `instructions`.
- Session configuration can be visible to the client through session creation/session events.
- Sending the protected Discovery Agent instructions into that browser-connected session would violate the cardinal rule: the system prompt must never leave the server.

Because prompt protection overrides realtime convenience, this prototype keeps protected Discovery reasoning and prompt assembly entirely server-side.

## How Prompt Protection Is Preserved

- The protected Discovery Agent prompt is loaded only by the server.
- The prompt can be supplied through `LIGHTHOUSE_DISCOVERY_PROMPT_PATH` or `LIGHTHOUSE_DISCOVERY_SYSTEM_PROMPT`.
- Prompt files under `server/prompts/protected/` are ignored by git.
- The browser never receives the protected prompt, wrapper prompt, assembled prompt, OpenAI payload, API key, stack trace, or raw provider error.
- Client-facing errors are sanitized.
- Model replies pass through a prompt-leak guard before being returned.
- Prompt extraction attempts are detected server-side before provider calls.

## Voice Flow

The first implementation uses a voice-first request pipeline:

1. Browser records participant audio with `MediaRecorder`.
2. Browser sends audio bytes to our server.
3. Server calls OpenAI speech-to-text.
4. Server normalizes the transcript into the same participant message format used by text input.
5. Server calls the OpenAI Discovery provider with the protected server-side prompt, selected wrapper, and full session transcript.
6. Server filters the assistant reply for prompt leakage.
7. Server stores both participant and assistant turns in the isolated session transcript.
8. Server calls OpenAI text-to-speech for the assistant reply.
9. Browser receives only participant-facing text and optional audio bytes.

This preserves a voice-first participant experience without exposing protected prompt material.

## Transcript Capture

The transcript is the source of truth.

Each session stores isolated turns:

- role
- text
- input mode
- timestamp

Voice and text inputs both resolve into the same transcript model before Discovery runs. The Discovery provider does not care whether the participant spoke or typed.

## Synthesis Handoff

When the participant or operator triggers profile generation:

1. The server loads the full isolated session transcript.
2. The server calls the OpenAI Synthesis provider.
3. The protected prompt and synthesis instruction stay server-side.
4. The generated Human Clarity Profile is stored with the session.
5. The browser receives only the generated profile text/export, never hidden instructions or raw provider metadata.

## Upgrade Path For Realtime Voice

To upgrade the voice layer later without weakening security, one of these must be implemented:

- A server-mediated Realtime bridge where the browser sends audio only to our server and only our server connects to OpenAI with protected instructions.
- A Realtime architecture where protected Discovery instructions are never included in client-visible session config or events.
- A split design where a non-sensitive Realtime voice layer handles transport/pacing while the protected Discovery Agent call remains server-side and authoritative.

Any upgrade must preserve:

- server-side prompt protection,
- server-side API keys,
- transcript-centered synthesis,
- session isolation,
- prompt-leak filtering,
- sanitized client errors,
- and provider adapter boundaries.

## OpenAI Provider Substitutions

The attached Architecture and Security documents contain legacy Anthropic/Claude wording. The approved provider override requires OpenAI for this prototype.

Substitutions:

- Claude Discovery call -> OpenAI Discovery provider call.
- Claude Synthesis call -> OpenAI Synthesis provider call.
- Anthropic API key -> `OPENAI_API_KEY`.
- Anthropic prompt caching -> OpenAI-compatible prompt/session optimization if safely supported; no caching is implemented here if it would expose prompts or complicate isolation.

The Lighthouse Soul, security constraints, participant authority, Terms constraints, prompt protection, and modularity requirements remain unchanged.
