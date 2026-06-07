# Voice Layer Plan

Voice is not active in the mock-first pass.

The intended secure voice pipeline is:

```text
browser microphone -> Lighthouse server -> OpenAI speech-to-text -> Claude Discovery -> OpenAI text-to-speech -> browser playback
```

Security rules:

- Browser never receives Claude system prompt.
- Browser never receives Anthropic or OpenAI API keys.
- Browser never calls Anthropic directly.
- Browser never calls OpenAI directly.
- Transcript remains server-owned.

The voice UI surface exists in `Discover`, but the current test path is text input. This lets the full Lighthouse session/profile flow be tested before any live provider keys are introduced.
