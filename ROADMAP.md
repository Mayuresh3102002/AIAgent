# Implementation roadmap

## First usable slice
NSE cash-equity learning dashboard with deterministic synthetic replay. Analyze only revealed candles. Explain trend, volume, and breakout conditions. Size whole-share positions from stop distance and available cash without leverage. Paper fills use displayed prices, estimated costs, and explicit stop/target handling. Keep an in-memory session journal and disclose that reload clears it.

## Market-data integration
Select a licensed provider supporting NSE instruments, historical intraday candles, timestamps, and streaming entitlements. Validate exchange calendar, Asia/Kolkata session boundaries, stale data, splits, gaps, reconnects, and symbol mapping. Keep credentials on the server. Replay production-format historical data before exposing live signals.

## Strategy evaluation
Separate development and held-out periods by date. Prevent future-bar leakage and survivorship bias. Include slippage, bid/ask spreads, taxes, brokerage, liquidity, and missed fills. Report trade count, win rate, expectancy, profit factor, maximum drawdown, and uncertainty. Compare to simple baselines. Require forward paper-trading evidence before performance claims.

## AI coach
Ground explanations in verified market features and the learner's journal. Keep position sizing and order constraints deterministic. Distinguish model interpretation from observed facts. Evaluate numerical fidelity, unsupported claims, and behavior when data is missing. Provide post-trade lessons rather than incentives to chase a daily target.

## Public product
Add authentication, server-side journals, privacy controls, observability, licensed-data compliance, and review of applicable Indian investment-advice/research requirements. Any broker execution requires a separate explicitly approved product scope.
