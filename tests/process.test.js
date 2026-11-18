import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyAccount, openTrade, closeTrade, analyze, candlesFor } from '../lib/engine.js';
import {
  validateFriction,
  rulebookChoice,
  compareChoice,
  detectMistakes,
  processEdgeScore,
  tradeReplayFrames,
  recordDecision,
  stopMatches,
} from '../lib/process.js';

test('friction requires cooling and exact stop price', () => {
  assert.equal(stopMatches('1,435.33', 1435.33), true);
  assert.throws(() => validateFriction({ typedStop: '1435.33', stop: 1435.33, cooled: false }), /cooling/);
  assert.throws(() => validateFriction({ typedStop: '100', stop: 1435.33, cooled: true }), /invalidation/);
  assert.deepEqual(validateFriction({ typedStop: '1435.33', stop: 1435.33, cooled: true }), { acknowledgedStop: 1435.33, cooled: true });
});

test('compare-your-choice matches the teaching rulebook', () => {
  const setup = analyze(candlesFor('RELIANCE').slice(0, 28));
  assert.equal(rulebookChoice(setup, .5).action, 'enter');
  assert.equal(rulebookChoice({ ...setup, qualified: false, ready: true }, .5).action, 'wait');
  assert.equal(rulebookChoice(setup, 1).action, 'reduce_risk');
  const hit = compareChoice('enter', setup, .5);
  assert.equal(hit.agreed, true);
  const miss = compareChoice('wait', setup, .5);
  assert.equal(miss.agreed, false);
});

test('mistake detector and edge score use process signals', () => {
  let account = emptyAccount();
  account = recordDecision(account, compareChoice('enter', analyze(candlesFor('RELIANCE').slice(0, 28)), .5), { symbol: 'RELIANCE', index: 28 });
  const setup = { qualified: true, strategy: 'breakout', entry: 1000, stop: 990, target: 1020 };
  const opened = openTrade(account, 'RELIANCE', setup, .5, 25);
  opened.position.friction = { acknowledgedStop: 990, cooled: true };
  opened.position.plan = { thesis: 'breakout with volume and known stop level here.' };
  account = closeTrade(opened, 1020, 'Target reached', 30);
  const cleanFlags = detectMistakes(account.trades[0]);
  assert.ok(cleanFlags.some(item => item.id === 'no_reflection'));
  account.trades[0].reflection = { followedPlan: 'yes', lesson: 'Followed the plan carefully.', nextStep: 'Keep writing plans.' };
  account.trades[0].quiz = { score: 4, total: 4 };
  const edge = processEdgeScore(account);
  assert.ok(edge.score >= 50);
  assert.equal(edge.decisionsTotal, 1);
});

test('decision replay frames cover entry through exit', () => {
  const trade = {
    symbol: 'RELIANCE',
    entry: 1435.33,
    stop: 1420,
    target: 1460,
    openedAt: 27,
    closedAt: 35,
    reason: 'Target reached',
    exit: 1460,
    pnl: 100,
    plan: { thesis: 'demo' },
  };
  const frames = tradeReplayFrames(trade, 'classic');
  assert.ok(frames.length > 5);
  assert.ok(frames.some(frame => frame.phase === 'entry'));
  assert.ok(frames.some(frame => frame.phase === 'exit'));
});
