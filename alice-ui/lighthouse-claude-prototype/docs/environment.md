# Environment

For mock testing, no API keys are required.

Create `.env` only if you want to override defaults:

```text
PORT=3200
MOCK_PROVIDER=true
LIGHTHOUSE_DISCOVERY_PROMPT_PATH=c:\Users\paulz\LIGHTHOUSE\Assets\Core Componnents\Project_Lighthouse_System_Prompt_V3.txt
```

For real Claude mode later:

```text
MOCK_PROVIDER=false
ANTHROPIC_API_KEY=...
ANTHROPIC_API_BASE=https://api.anthropic.com
ANTHROPIC_MODEL=claude-sonnet-4-6
LIGHTHOUSE_DISCOVERY_PROMPT_PATH=c:\Users\paulz\LIGHTHOUSE\Assets\Core Componnents\Project_Lighthouse_System_Prompt_V3.txt
```

Rules:

- Do not put `ANTHROPIC_API_KEY` in frontend code.
- Do not use client-side Anthropic calls.
- Do not put the protected prompt in `src/`.
- Do not commit `.env`.
- Do not return raw provider errors to the browser.

Run:

```text
npm run build
npm start
```

Open:

```text
http://localhost:3200
```
