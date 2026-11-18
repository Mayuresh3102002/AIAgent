import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, candlesFor, analyze, riskPreview, emptyAccount, openTrade, closeTrade, settleBar, recordWait } from '../lib/engine.js';
import { planChecksFor, buildQuiz, gradeQuiz, sessionScorecard, exportJournalMarkdown, createTradePlan } from '../lib/learning.js';

test('scenario library keeps classic candles and offers distinct teaching paths', () => {
  assert.equal(SCENARIOS.length, 4);
  assert.deepEqual(candlesFor('RELIANCE'), candlesFor('RELIANCE', 'classic'));
  assert.notDeepEqual(candlesFor('RELIANCE', 'classic'), candlesFor('RELIANCE', 'fake_breakout'));
  const classic = candlesFor('RELIANCE', 'classic');
  const none = candlesFor('RELIANCE', 'no_setup');
  const gap = candlesFor('RELIANCE', 'gap_stop');
  assert.ok(Array.from({ length: 52 }, (_, i) => analyze(classic.slice(0, i + 21))).some(r => r.qualified));
  assert.equal(Array.from({ length: 52 }, (_, i) => analyze(none.slice(0, i + 21))).some(r => r.qualified), false);
  assert.ok(gap[30].open < gap[29].close);
});

test('risk preview shows planned loss and a larger illustrative gap case', () => {
  const preview = riskPreview({ cash: 100000, entry: 1000, stop: 990, target: 1020, riskPercent: .5 });
  assert.equal(preview.quantity, 41);
  assert.ok(preview.gapLoss > preview.plannedLoss);
  assert.equal(preview.gapExit, 980.1);
});

test('strategy-specific checklists differ for breakout and pullback', () => {
  const breakout = planChecksFor('breakout');
  const pullback = planChecksFor('pullback');
  assert.match(breakout[0].label, /breakout/);
  assert.match(pullback[0].label, /pullback/);
  assert.equal(breakout.length, 3);
  assert.equal(pullback.length, 3);
});

test('post-trade quiz grades answers and exposes explanations', () => {
  const trade = { strategy: 'breakout', entry: 1000, stop: 990, target: 1020, pnl: 50, entryFee: 1, exitFee: 1 };
  const quiz = buildQuiz(trade);
  assert.equal(quiz.length, 4);
  const graded = gradeQuiz(trade, { invalidation: 'stop', strategy: 'breakout', fees: 'after', accuracy: 'nothing' });
  assert.equal(graded.score, 4);
  assert.equal(graded.total, 4);
  assert.match(graded.details[0].explanation, /invalidation/);
  assert.throws(() => gradeQuiz(trade, { invalidation: 'stop' }), /Answer each/);
});

test('session scorecard tracks expectancy, drawdown, waits, and export text', () => {
  let account = emptyAccount();
  account = recordWait(account, false);
  account = recordWait(account, false);
  const opened = openTrade(account, 'RELIANCE', { qualified: true, strategy: 'breakout', entry: 1000, stop: 990, target: 1020 }, .5, 25);
  account = closeTrade(opened, 980, 'Stop · gap at open', 26);
  account.trades[0].plan = { thesis: 'test plan text for export', strategy: 'breakout' };
  account.trades[0].reflection = { followedPlan: 'yes', lesson: 'Gaps can hurt more.', nextStep: 'Read the gap preview first.' };
  account.trades[0].quiz = { score: 4, total: 4 };
  const scorecard = sessionScorecard(account);
  assert.equal(scorecard.waitsSkipped, 2);
  assert.equal(scorecard.trades, 1);
  assert.ok(scorecard.maxDrawdown > 0);
  assert.equal(scorecard.followRate, 100);
  assert.equal(scorecard.quizzesPassed, 1);
  assert.match(exportJournalMarkdown(account), /session journal/i);
  assert.match(exportJournalMarkdown(account), /Waits when setup invalid: 2/);
});

test('guided plans record strategy and gap preview fields', () => {
  const context = { symbol: 'RELIANCE', index: 28, riskPercent: .5, account: emptyAccount(), scenarioId: 'classic' };
  const plan = createTradePlan(context, {
    thesis: 'Price broke the prior high with volume. The stop below the recent low invalidates my trade.',
    checks: { setup: true, stop: true, risk: true },
  });
  assert.equal(plan.strategy, 'breakout');
  assert.ok(plan.gapLoss >= plan.plannedLoss);
});

test('gap_stop scenario can settle a gap fill after entry', () => {
  const bars = candlesFor('RELIANCE', 'gap_stop');
  const setup = analyze(bars.slice(0, 28));
  assert.equal(setup.qualified, true);
  let account = openTrade(emptyAccount(), 'RELIANCE', setup, .5, 27);
  // Advance through bars until the forced gap candle can settle the open trade.
  for (let index = 28; index <= 31 && account.position; index += 1) {
    account = settleBar(account, bars[index], index);
  }
  assert.equal(account.position, null);
  assert.ok(account.trades[0].reason.includes('Stop') || account.trades[0].pnl < 0);
});
