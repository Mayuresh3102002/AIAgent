# Trading coach backend

The GitHub Pages interface is static. This separate Node.js service protects an OpenAI key and runs an educational, read-only agent. Nothing is saved to browser local storage or a database.

## Agent behavior

A request contains a question, at most six previous chat messages, and the current paper session. The server validates the session and rebuilds candles from the known synthetic dataset; the client cannot inject market candles. OpenAI Responses API tool calling is forced to inspect the session first, then can use:

- `inspect_session`: revealed candle count, timestamp, cash, open position, data limitations.
- `scan_setups`: three-symbol trend/breakout/volume evidence.
- `calculate_risk`: whole-share sizing and planned stop loss including estimated fees.
- `review_journal`: recalculated results from client-supplied paper fills.

There are no order-placement or browsing tools. At most four model rounds and 1,200 output tokens per round are allowed. Responses include tool results for inspection. Account history is client-supplied and not verified brokerage data. Tool grounding reduces unsupported answers but does not guarantee numerical fidelity; users must compare explanations to the displayed evidence.

## Deploy the backend

`render.yaml` is a prepared Render Blueprint for a free web service. It has not been provisioned automatically. An owner must connect the GitHub repository in Render, create the Blueprint, and securely supply `TRADING_OPENAI_API_KEY` in Render's environment settings. OpenAI API usage is billed by OpenAI; set project usage budgets there. Never put an API key in GitHub Pages code or chat.

The Blueprint generates `COACH_ACCESS_TOKEN`. Retrieve it privately from Render's environment settings and use it as the coach access code in the app. This is a limited prototype access gate, not multi-user authentication. Do not share it publicly. Rotate it if exposed. `ALLOWED_ORIGIN` must match the frontend origin exactly (no path or trailing slash).

After the service is healthy:

1. Set GitHub repository **Settings → Secrets and variables → Actions → Variables → `COACH_API_URL`** to the service's HTTPS origin, without `/coach`.
2. Run **Deploy to GitHub Pages**, or push to main. The workflow embeds only this non-secret URL.
3. Open Coach, enter the access code, and ask about the synthetic session.
4. Confirm the answer includes tool evidence. Until this has been done with real credentials, live provider integration is unverified.

A free service can sleep; the first request may time out while it wakes. No host, domain, account, or billing commitment has been created by this repository configuration.

## Local backend development

Set environment variables securely (a gitignored `.env` is supported for development):

- `TRADING_OPENAI_API_KEY`: OpenAI API credential, server only.
- `COACH_ACCESS_TOKEN`: random access code of at least 24 characters, server setting.
- `ALLOWED_ORIGIN`: exact browser origin.
- `COACH_MODEL`: defaults to `gpt-4.1-mini`; configurable for models that support Responses function tools.
- `PORT`: defaults to 8787.

Run `npm run coach:start`. Build the frontend with `NEXT_PUBLIC_COACH_API_URL` set to the backend origin. Never prefix a secret with `NEXT_PUBLIC_`.

`GET /health` reports whether a key is present, not provider authentication success. `POST /coach` requires a bearer access code and JSON. Responses use `Cache-Control: no-store`. The server enforces CORS, a 32 KiB payload cap, a 45-second provider deadline, two concurrent requests, and ten requests per minute globally per process. These in-memory limits reset on restart and do not provide distributed quotas. Proper user authentication, shared rate limiting, billing controls, and abuse monitoring are required before public multi-user AI access.

The service does not log credentials or conversations. OpenAI requests use `store:false`; this is not a claim of zero provider retention. Review the provider's data policies before entering personal information. Questions and recent conversation are sent to OpenAI; do not enter account credentials or personal financial records.

## Validation

`npm test` exercises deterministic tools and the agent loop with mocked OpenAI responses. `npm run test:gateway` exercises an actual local HTTP server with a mocked model. These tests do not establish live model quality or API access. No live provider request has been made without a configured key.
