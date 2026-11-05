# AIAgent

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React / Next.js, explicitly chosen by the user. Build the working prototype before creating visual mockups.

## Users
People learning practical intraday trading in Indian stocks on the NSE.

## Product Purpose
Help learners practice identifying opportunities, controlling risk, and reviewing decisions through paper trading. The user's income aspiration is ₹10,000 per day; this is not a promised outcome or a product performance claim.

## Operating Context
The first version uses paper trading. Real-money execution is outside the initial scope. A learner should inspect the evidence for a setup, decide a risk budget, simulate an order, and review the result.

## Capabilities and Constraints
Initial implementation: clearly labeled synthetic market replay, explainable rule-based setups, position sizing, simulated positions, and a session trade journal. Proposed future capabilities: licensed live market data and grounded AI coaching. No measured signal accuracy is available yet. Demo signals must not be described as live opportunities or calibrated probabilities.

## Evidence on Hand
The initial repository contained only a README. There are no market datasets, brokerage connections, model evaluations, or performance benchmarks.

## Product Principles
- Teach a repeatable decision process.
- Show why a setup qualifies and when it becomes invalid.
- Make the cost and risk of a decision visible before entry.
- Keep simulated, historical, and live data distinguishable.
- Evaluate returns after costs and alongside drawdown; never promise daily income.

## Open Decisions
Data vendor, deployment target, AI provider, retention and account requirements.

## Hosting and persistence
The user requests GitHub hosting and no laptop local storage. Deploy the static export to GitHub Pages. Practice state is held only in memory and resets on reload. Durable private cloud storage is not part of GitHub Pages.
