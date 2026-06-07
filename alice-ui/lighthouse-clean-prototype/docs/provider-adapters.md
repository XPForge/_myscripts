# Provider Adapter Structure

The prototype calls stable internal interfaces instead of scattering provider calls through routes or UI code.

Interfaces:

- `DiscoveryProvider`
- `SynthesisProvider`
- `SpeechToTextProvider`
- `TextToSpeechProvider`

Current implementation:

- `server/providers/openai/discovery.ts`
- `server/providers/openai/synthesis.ts`
- `server/providers/openai/speechToText.ts`
- `server/providers/openai/textToSpeech.ts`
- `server/providers/openai/client.ts`

The UI calls only our server API.

The routes call the `SessionOrchestrator`.

The orchestrator calls provider interfaces.

The OpenAI implementation can later be replaced by another provider module without changing:

- protected Discovery prompt loading,
- wrapper rules,
- transcript model,
- session isolation,
- synthesis handoff,
- prompt leak filtering,
- or participant-facing UI contracts.
