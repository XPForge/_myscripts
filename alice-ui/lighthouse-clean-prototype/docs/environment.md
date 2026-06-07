# Environment

Create `lighthouse-clean-prototype/.env` from `.env.example`.

Required:

```text
OPENAI_API_KEY=...
LIGHTHOUSE_DISCOVERY_PROMPT_PATH=c:\Users\paulz\LIGHTHOUSE\Assets\Core Componnents\Project_Lighthouse_System_Prompt_V3.txt
```

Optional:

```text
OPENAI_API_BASE=https://api.openai.com
PORT=3100
OPENAI_DISCOVERY_MODEL=gpt-4.1
OPENAI_SYNTHESIS_MODEL=gpt-4.1
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=sage
```

Rules:

- Do not use `VITE_OPENAI_API_KEY`.
- Do not put OpenAI keys in frontend code.
- Do not put the protected Discovery prompt in `public/`.
- Do not return provider payloads or raw provider errors to the browser.
- Keep local prompt files under `server/prompts/protected/` or outside the repo.
- Files in `server/prompts/protected/` and `server/data/` are ignored by git.

Run:

```text
npm install
npm run dev
```

Open:

```text
http://localhost:3100
```
