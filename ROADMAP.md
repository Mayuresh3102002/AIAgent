# Implementation roadmap

## First usable slice
NSE cash-equity learning dashboard with deterministic synthetic replay. Analyze only revealed candles. Explain trend, volume, and breakout conditions. Size whole-share positions from stop distance and available cash without leverage. Paper fills use displayed prices, estimated costs, and explicit stop/target handling. Keep an in-memory session journal and disclose that reload clears it.

## Market-data integration
Select a licensed provider supporting NSE instruments, historical intraday candles, timestamps, and streaming entitlements. Validate exchange calendar, Asia/Kolkata session boundaries, stale data, splits, gaps, reconnects, and symbol mapping. Keep credentials on the server. Replay production-format historical data before exposing live signals.

## Strategy evaluation
Separate development and held-out periods by date. Prevent future-bar leakage and survivorship bias. Include slippage, bid/ask spreads, taxes, brokerage, liquidity, and missed fills. Report trade count, win rate, expectancy, profit factor, maximum drawdown, and uncertainty. Compare to simple baselines. Require forward paper-trading evidence before performance claims.

## Guided learning, without an AI service
The implemented loop is inspect evidence → write a plan → practice → reflect. Next additions can include more replay scenarios, strategy-specific checklists, and structured quizzes with transparent answers. Keep explanations tied to computed evidence and distinguish learning progress from trading performance. No model API or key is required.

## Public product
Add authentication, server-side journals, privacy controls, observability, licensed-data compliance, and review of applicable Indian investment-advice/research requirements. Any broker execution requires a separate explicitly approved product scope.
