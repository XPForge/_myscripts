# Project Lighthouse / Alice Frontend

Participant-facing Project Lighthouse cockpit rebuilt as a modular React/Vite app. The standalone Claude prototype is preserved as a reference artifact, while the live route uses composable pages, components, engine helpers, and Vercel API endpoints.

## Local Development

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The new Lighthouse cockpit is the root route. The previous application flow remains available at `/legacy`, with diagnostics still available at `/model`, `/native-benchmark`, `/realtime-voice`, and `/mic-test`.

Plain Vite does not execute the `api/*.js` Vercel functions. The Discovery chat UI will keep working with a local fallback if `/api/chat` is unavailable.

## Build

```bash
npm run build
```

## Vercel Deployment

1. Set `OPENAI_API_KEY` in the Vercel project environment.
2. Optionally set `OPENAI_MODEL`, `OPENAI_API_BASE`, and `OPENAI_TTS_MODEL`.
3. Deploy with Vercel using the included `vercel.json`.
4. The browser calls relative endpoints: `/api/chat`, `/api/tts`, and `/api/transcribe`.

## Environment Variables

```text
OPENAI_API_KEY=replace_with_your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_BASE=https://api.openai.com
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

No API keys are used in browser code.

## API Endpoints

- `POST /api/chat`: sends Discovery conversation messages to the OpenAI Responses API and returns `{ reply }`.
- `POST /api/tts`: accepts `{ input, voice }` and returns MP3 audio.
- `POST /api/transcribe`: forwards multipart audio uploads to OpenAI transcription. The form should include the audio file and model fields.

## Extracted From Claude Prototype

- The standalone `public/alice.html` from `lighthouse-alice-v1.2.zip` is preserved at `public/reference/claude-alice-v1.2.html`.
- `public/launch.html` is copied from the prototype as a static launch reference.
- The rebuilt app carries forward the Discovery flow, Alice conversational posture, local session persistence, profile generation concept, and voice/TTS/transcription endpoint boundaries.

## Current Structure

- `src/pages`: Threshold, access, materials, preparing, ready, session, and profile pages.
- `src/components/lighthouse`: Alice orb, Lightprint identifier, layout, doctrine overlay, chat, controls, uploader, status, and profile review components.
- `src/engine`: session state, storage, Discovery prompt, API client, and profile section generation.
- `src/styles`: CSS tokens and global Lighthouse styling.
- `api`: Vercel serverless routes for chat, TTS, and transcription.

## Current Limitations

- Materials upload is represented as selectable source context; file parsing is not wired yet.
- Plain `npm run dev` does not run Vercel functions, so chat uses local fallback unless served through Vercel or another API host.
- TTS and transcription routes exist, but the live UI currently exposes settings rather than full audio recording/playback.
- Generated profile sections are local draft representations until deeper profile synthesis is connected.

## Doctrine

Lighthouse is Discovery, not evaluation. The interface avoids scores, rankings, fit percentages, personality-test language, red-flag framing, and human/avatar representations of Alice. The participant remains the authority.
