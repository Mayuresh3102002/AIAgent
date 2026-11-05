import test from 'node:test';
import assert from 'node:assert/strict';
import { candlesFor, analyze, sizePosition, openTrade, closeTrade, settleBar, emptyAccount, fee } from '../lib/engine.js';
test('replay is deterministic and contains valid OHLC bars', () => {
  const bars = candlesFor('RELIANCE');
  assert.deepEqual(bars, candlesFor('RELIANCE'));
  assert.equal(bars.length, 72);
  for (const c of bars) { assert.ok(c.low <= Math.min(c.open,c.close)); assert.ok(c.high >= Math.max(c.open,c.close)); }
});
test('analysis uses revealed candles and can produce both qualified and wait states', () => {
  const bars = candlesFor('RELIANCE');
  const results = Array.from({length: 52}, (_,i) => analyze(bars.slice(0,i+21)));
  assert.ok(results.some(r => r.qualified)); assert.ok(results.some(r => !r.qualified));
  assert.equal(analyze(bars.slice(0,20)).ready, false);
  const before = analyze(bars.slice(0,28)); bars[50].close = 99999;
  assert.deepEqual(analyze(bars.slice(0,28)), before);
});
test('whole-share sizing respects risk including fees and cash without leverage', () => {
  const q = sizePosition({cash: 100000, entry: 1000, stop: 990, riskPercent: .5});
  assert.equal(q, 41); assert.ok(q*1000 + fee(q*1000) <= 100000);
  assert.ok(q*10 + fee(q*1000) + fee(q*990) <= 500);
  for (const value of [NaN, -1, 0, 1.01, Infinity]) assert.equal(sizePosition({cash:100000,entry:1000,stop:990,riskPercent:value}),0);
});
const setup = {qualified:true,entry:1000,stop:990,target:1020};
test('entry and exit accounting includes fees and conserves funds', () => {
  const opened = openTrade(emptyAccount(),'RELIANCE',setup,.5,25);
  const closed = closeTrade(opened,1020,'Manual',26);
  assert.equal(closed.cash,100000+closed.trades[0].pnl); assert.equal(closed.position,null);
  assert.throws(() => openTrade(opened,'RELIANCE',setup,.5,26));
  assert.throws(() => openTrade(emptyAccount(),'RELIANCE',{...setup,qualified:false},.5,25));
});
test('stop fills conservatively when both levels touch and handles gaps', () => {
  const a = openTrade(emptyAccount(),'RELIANCE',setup,.5,25);
  assert.equal(settleBar(a,{open:1000,low:980,high:1030},26).trades[0].exit,990);
  assert.equal(settleBar(a,{open:980,low:970,high:1000},26).trades[0].exit,980);
  assert.equal(settleBar(a,{open:1030,low:1025,high:1040},26).trades[0].exit,1030);
  assert.equal(settleBar(a,{open:1000,low:995,high:1010},26),a);
  assert.equal(settleBar(a,{open:1000,low:980,high:1030},25),a);
});
