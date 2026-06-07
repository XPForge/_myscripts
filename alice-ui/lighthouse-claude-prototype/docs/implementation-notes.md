# Lighthouse Claude Prototype - Implementation Notes

## Clean Build Boundary

This build lives in `lighthouse-claude-prototype`.

It is isolated from the existing Alice UI, the previous realtime prompt experiment, and `lighthouse-clean-prototype`.

## Provider Strategy

This prototype is Claude-first.

Default mode is mock mode:

```text
MOCK_PROVIDER=true
```

Mock mode allows testing:

- landing,
- onboarding,
- discovery transcript,
- prompt-extraction refusal path,
- session persistence,
- profile generation,
- profile display,
- markdown download,
- sanitized errors,
- and client bundle prompt/key inspection.

Real Anthropic mode is available later:

```text
MOCK_PROVIDER=false
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

The UI and routes do not change when switching provider modes.

## Prompt Protection

- The protected Discovery Agent prompt is loaded only on the server.
- The prompt is supplied by `LIGHTHOUSE_DISCOVERY_PROMPT_PATH` or `LIGHTHOUSE_DISCOVERY_SYSTEM_PROMPT`.
- Prompt files under `server/prompts/protected/` are gitignored.
- The required confidentiality instruction is appended server-side if it is not already present.
- The browser never receives the system prompt, wrapper prompt, assembled prompt, Anthropic payload, API key, stack trace, or raw provider error.
- Server responses pass through a prompt-leak filter before reaching the browser.
- Prompt extraction attempts receive a server-side refusal before provider calls.

## Progress Bar Compromise

The UI spec requires a progress bar based on required topics.

To preserve curiosity-led Discovery, this implementation keeps the progress bar visual only. It reflects session activity stage from participant turn count. It does not control the prompt, provider behavior, question selection, topic routing, or completion logic.

## Voice Layer Status

Voice is intentionally deferred in this mock-first pass.

The current UI includes the voice surface, but text input is the functional test path. This keeps the full transcript/session/profile flow testable before any live keys are used.

Future voice path:

```text
browser audio -> server OpenAI STT -> Claude Discovery -> server OpenAI TTS -> browser audio
```

No browser-side provider keys will be used.

## Profile Output

Mock profile generation returns a complete twelve-section Human Clarity Profile structure in Markdown. Real Anthropic synthesis uses the same session transcript and adapter interface.
