# Voice Layer Plan

Voice has two stages in this prototype.

## Current Browser-Native Prototype Voice

The current live prototype uses browser-native voice features:

- `speechSynthesis` reads Lighthouse replies aloud.
- Browser `SpeechRecognition` / `webkitSpeechRecognition`, when available, turns participant speech into text.
- A Web Audio API meter shows microphone input level so the participant can see whether the browser is hearing sound.
- The recognized text is sent to the same server-side Claude conversation endpoint as typed input.

This enables quick evaluation without adding another live API dependency.

Security note: browser-native speech recognition is browser-controlled. It does not expose the Lighthouse system prompt or Anthropic key, but it is not the final server-controlled STT architecture.

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

The final voice layer should replace browser-native recognition with server-side STT/TTS when that provider key and implementation path are ready.
