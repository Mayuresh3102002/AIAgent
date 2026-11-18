import { candlesFor } from './engine.js';
import { sessionScorecard } from './learning.js';

const round = n => Math.round(n * 100) / 100;
export const FRICTION_SECONDS = Math.max(1, Number(process.env.NEXT_PUBLIC_FRICTION_SECONDS || 10));

export function normalizeStopInput(value) {
  const cleaned = String(value ?? '').replace(/[₹,\s]/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? round(parsed) : null;
}

export function stopMatches(typed, stop) {
  const value = normalizeStopInput(typed);
  if (value == null || !Number.isFinite(stop)) return false;
  return Math.abs(value - round(stop)) <= 0.02;
}

export function validateFriction({ typedStop, stop, cooled }) {
  if (!cooled) throw new Error(`Wait the full ${FRICTION_SECONDS}s cooling period before entering.`);
  if (!stopMatches(typedStop, stop)) {
    throw new Error(`Type the exact invalidation (stop) price: ${round(stop).toFixed(2)}`);
  }
  return { acknowledgedStop: round(stop), cooled: true };
}

/** Strict teaching rulebook for compare-your-choice drills. */
export function rulebookChoice(setup, riskPercent = 0.5) {
  if (!setup?.ready) {
    return { action: 'wait', reason: 'Not enough candles yet. Keep revealing the tape.' };
  }
  if (!setup.qualified) {
    return { action: 'wait', reason: 'Rules are incomplete. Waiting is the correct process decision.' };
  }
  const stopDistancePct = setup.entry > 0 ? ((setup.entry - setup.stop) / setup.entry) * 100 : 0;
  if (riskPercent >= 1 || stopDistancePct >= 1.2) {
    return {
      action: 'reduce_risk',
      reason: riskPercent >= 1
        ? 'Setup qualifies, but 1% risk is aggressive for practice. Reduce the risk budget first.'
        : 'Stop is wide versus price. Reduce risk so one loss stays educational, not account-damaging.',
    };
  }
  return {
    action: 'enter',
    reason: `Setup qualifies as ${setup.strategy || 'breakout'} with a manageable stop. Enter only after friction checks.`,
  };
}

export function compareChoice(userChoice, setup, riskPercent = 0.5) {
  if (!['enter', 'wait', 'reduce_risk'].includes(userChoice)) {
    throw new Error('Choose Enter, Wait, or Reduce risk.');
  }
  const book = rulebookChoice(setup, riskPercent);
  return {
    userChoice,
    bookAction: book.action,
    bookReason: book.reason,
    agreed: userChoice === book.action,
    setupQualified: Boolean(setup?.qualified),
    strategy: setup?.strategy || null,
  };
}

export function detectMistakes(trade) {
  const mistakes = [];
  if (!trade.plan) {
    mistakes.push({ id: 'no_plan', severity: 'high', label: 'Entered without a written plan', detail: 'Quick entries skip the reasoning you need for review.' });
  }
  if (!trade.friction?.acknowledgedStop) {
    mistakes.push({ id: 'no_friction', severity: 'medium', label: 'Skipped fear & greed friction', detail: 'Typing the stop and waiting cools impulsive entries.' });
  }
  if (trade.riskPercent >= 1) {
    mistakes.push({ id: 'high_risk', severity: 'medium', label: 'Used the highest risk budget', detail: '1% risk is allowed, but it amplifies process mistakes.' });
  }
  if (trade.reflection?.followedPlan === 'no') {
    mistakes.push({ id: 'broke_plan', severity: 'high', label: 'Marked plan as not followed', detail: 'Capture one concrete correction in your next-step note.' });
  }
  if (!trade.reflection) {
    mistakes.push({ id: 'no_reflection', severity: 'medium', label: 'No post-trade reflection yet', detail: 'Close the learning loop before the next entry.' });
  }
  if (!trade.quiz) {
    mistakes.push({ id: 'no_quiz', severity: 'low', label: 'Quiz not completed', detail: 'A short quiz checks whether the lesson stuck.' });
  }
  if (String(trade.reason || '').toLowerCase().includes('gap') && trade.plan && trade.plan.gapLoss == null) {
    mistakes.push({ id: 'gap_unseen', severity: 'low', label: 'Gap exit without gap preview on plan', detail: 'Newer plans store gapLoss; review the risk preview next time.' });
  }
  if (trade.decision && trade.decision.agreed === false && trade.decision.userChoice === 'enter') {
    mistakes.push({ id: 'disagreed_enter', severity: 'high', label: 'Entered against the rulebook drill', detail: 'You chose Enter when the compare-your-choice rulebook said otherwise.' });
  }
  return mistakes;
}

export function summarizeMistakes(trades) {
  const all = trades.flatMap(trade => detectMistakes(trade).map(item => ({ ...item, tradeId: trade.id, symbol: trade.symbol })));
  const byId = {};
  for (const item of all) {
    byId[item.id] = (byId[item.id] || 0) + 1;
  }
  return {
    total: all.length,
    high: all.filter(item => item.severity === 'high').length,
    medium: all.filter(item => item.severity === 'medium').length,
    low: all.filter(item => item.severity === 'low').length,
    byId,
    items: all,
  };
}

export function processEdgeScore(account) {
  const scorecard = sessionScorecard(account);
  const trades = account.trades || [];
  const decisions = account.decisions || [];
  const mistakes = summarizeMistakes(trades);
  const planScore = scorecard.planRate == null ? 50 : scorecard.planRate;
  const followScore = scorecard.followRate == null ? 50 : scorecard.followRate;
  const waitScore = Math.min(100, (scorecard.waitsSkipped || 0) * 8);
  const quizScore = trades.length ? (trades.filter(t => t.quiz).length / trades.length) * 100 : 50;
  const decisionScore = decisions.length
    ? (decisions.filter(d => d.agreed).length / decisions.length) * 100
    : 50;
  const mistakePenalty = Math.min(40, mistakes.high * 8 + mistakes.medium * 4 + mistakes.low * 2);
  const raw = (planScore * 0.25) + (followScore * 0.2) + (waitScore * 0.15) + (quizScore * 0.15) + (decisionScore * 0.25) - mistakePenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return {
    score,
    label: score >= 80 ? 'Strong process' : score >= 60 ? 'Developing' : score >= 40 ? 'Inconsistent' : 'Needs discipline',
    parts: {
      plans: round(planScore),
      followed: round(followScore),
      waits: round(waitScore),
      quizzes: round(quizScore),
      decisions: round(decisionScore),
      mistakePenalty: round(mistakePenalty),
    },
    mistakes,
    scorecard,
    decisionsAgreed: decisions.filter(d => d.agreed).length,
    decisionsTotal: decisions.length,
  };
}

export function equitySeries(account) {
  const trades = [...(account.trades || [])].reverse();
  let equity = 100000;
  const points = [{ label: 'Start', equity, pnl: 0 }];
  for (const trade of trades) {
    equity = round(equity + trade.pnl);
    points.push({ label: `${trade.symbol}#${trade.id}`, equity, pnl: trade.pnl });
  }
  return points;
}

export function tradeReplayFrames(trade, scenarioId = 'classic') {
  if (!trade) return [];
  const openedAt = trade.openedAt ?? 0;
  const closedAt = trade.closedAt ?? openedAt;
  const all = candlesFor(trade.symbol, scenarioId);
  const end = Math.min(all.length - 1, Math.max(closedAt, openedAt));
  const frames = [];
  for (let i = Math.max(0, openedAt - 5); i <= end; i += 1) {
    const bars = all.slice(0, i + 1);
    const phase = i < openedAt ? 'before' : i === openedAt ? 'entry' : i < closedAt ? 'open' : i === closedAt ? 'exit' : 'after';
    frames.push({
      index: i,
      time: all[i].time,
      bars,
      phase,
      note: phase === 'before'
        ? 'Context before entry.'
        : phase === 'entry'
          ? `Entry at ${trade.entry}. Plan: ${trade.plan?.thesis ? 'written' : 'none'}.`
          : phase === 'open'
            ? 'Position open — watch stop and target.'
            : phase === 'exit'
              ? `Exit: ${trade.reason} at ${trade.exit}.`
              : 'After the trade.',
    });
  }
  return frames;
}

export function recordDecision(account, decision, meta = {}) {
  const entry = {
    ...decision,
    id: (account.decisions?.length || 0) + 1,
    at: meta.index ?? null,
    symbol: meta.symbol ?? null,
    riskPercent: meta.riskPercent ?? null,
  };
  return { ...account, decisions: [entry, ...(account.decisions || [])] };
}
