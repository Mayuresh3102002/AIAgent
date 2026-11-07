# AIAgent — practical intraday trading coach

A working **Next.js / React prototype** for learning NSE cash-equity trading with paper money. All prices are deterministic synthetic examples. The evidence desk is rule-based. Guided practice works entirely in the static app, with no AI model, API key, or backend. No live market feed, real orders, or measured signal accuracy is included.

## Run

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

The app serves on port 3000. For a production check:

```sh
npm test
npm run build
npm start
```

With the server running, `npm run test:e2e` exercises the browser flow. It uses `/usr/bin/chromium` by default; set `CHROMIUM_PATH` for another installed browser or install Chromium separately. No API keys are needed for this prototype.

## Practice

1. Read the synthetic five-minute candles and breakout conditions.
2. Choose a risk budget of 0.25%, 0.5%, or 1% of available paper cash.
3. When all three conditions qualify, place a long paper trade.
4. Reveal candles to simulate stop / target fills, or close manually.
5. Review the trade journal and learning guide.

For the guided path, open **Coach**, acknowledge the setup and risk checks, write your reasoning, and choose **Save plan & place paper trade**. The plan stays attached to the position after it closes. In **Journal**, record whether you followed the plan, what you learned, and one next action. Saved reflections survive navigation within the current session; unsaved form drafts do not.

The account starts with ₹100,000. One open position is supported, without leverage. The replay is global across the three example stocks. Session state lives only in memory. Reloading, closing the tab, or resetting clears it. No localStorage, sessionStorage, or browser database is used. This is a single-user prototype without authentication or cloud persistence.

## Simulation assumptions

Only revealed candles enter analysis. Entry occurs at the displayed close. The stop is the lowest low of the last five candles; the target is twice the stop distance. Share sizing includes estimated entry and stop-exit fees. A gap below the stop fills at the opening price, so losses can exceed the risk budget. If both stop and target touch in one candle, stop wins conservatively. Remaining positions close at the end of the replay. The fixed fictional session ends at 15:10 IST and is not an exchange-calendar simulation.

Fees are a teaching estimate of 0.10% of notional on each side, not an actual Indian brokerage/tax schedule. Spread, slippage, liquidity constraints, and execution latency are not modeled. Synthetic results do not establish live-market profitability or accuracy. No daily income is guaranteed.

See [ROADMAP.md](ROADMAP.md) for datasets, historical validation, further guided exercises, and production requirements. The deterministic trading engine is in `lib/engine.js`; UI and session state are in `app/page.jsx`.

## GitHub Pages hosting

The repository includes `.github/workflows/deploy-pages.yml`. Pushes to `main` run tests and build a static export. The site publishes from the `gh-pages` branch; the repository environment currently permits that branch only. Run `bash scripts/publish-pages.sh` after validation to publish the current main commit. The expected site address is `https://mayuresh3102002.github.io/AIAgent/`. This address is only live after a successful Pages deployment.

The workflow sets `NEXT_PUBLIC_BASE_PATH=/AIAgent`; assets and the home link use that path. For another project repository, set it to that repository's name. For an owner-level `owner.github.io` repository, leave it empty. To test the exact export locally:

```sh
NEXT_PUBLIC_BASE_PATH=/AIAgent npm run build
NEXT_PUBLIC_BASE_PATH=/AIAgent npm start
# In a second terminal:
APP_URL=http://127.0.0.1:3000/AIAgent/ npm run test:e2e
```

GitHub serves the deployed HTML, CSS, JavaScript, and fonts. No running laptop or Node server is required for the hosted site. GitHub Pages is static hosting and does not supply a private user database. This version uses session memory only and requires no external service or credentials.

## Guided coach and reviews

Open **Coach** for the setup scanner, risk explanation, and plan checklist. Changing the risk budget clears the checklist acknowledgements so the learner can review the new numbers. A qualifying setup, whole-share size, all three checks, and 20–500 characters of reasoning are required for guided entry. Quick entry from Practice remains available and is marked as such in the journal.

Each trade has a session identifier. Plans are captured before entry and preserved at exit. Reflections require an answer about following the plan plus a lesson and next action (10–500 characters each). Progress measures completed plans and saved reviews, not trading skill or expected income. Text is learner-authored; it is not analyzed or scored by a model.

`lib/learning.js` validates plans and reflections. `lib/coach.js` calculates explanations. No application requests are made to AI providers or external market APIs. The retired backend remains recoverable through Git history, but it is not part of the current app or deployment.

The Actions workflow validates main; `scripts/publish-pages.sh` publishes the compiled site to gh-pages without changing repository protection rules.
