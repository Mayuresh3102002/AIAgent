import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyAccount, openTrade, closeTrade } from '../lib/engine.js';
import { scanMarket, riskPlan, reviewJournal, practiceBrief } from '../lib/coach.js';
const context = () => ({symbol:'RELIANCE',index:28,riskPercent:.5,account:emptyAccount()});

test('scanner, risk calculator and practice guide use only revealed candles', () => {
  const c=context(), scan=scanMarket(c);
  assert.equal(scan.length,3); assert.equal(scan[0].time,'11:30'); assert.equal(scan[0].price,1435.33);
  assert.equal(riskPlan(c).quantity,39); assert.equal(riskPlan(c).plannedLoss,492.22);
  assert.match(practiceBrief(c,'setup'),/3 of 3/); assert.match(practiceBrief(c,'journal'),/no completed trades/);
  assert.equal(riskPlan({...c,index:72}).canEnter,false);
});
test('journal recomputes net results rather than trusting a supplied total', () => {
  const c=context(); const opened=openTrade(c.account,'RELIANCE',{qualified:true,entry:1000,stop:990,target:1020},.5,25);
  c.account=closeTrade(opened,1020,'Manual',26); c.account.trades[0].pnl=999999;
  assert.equal(reviewJournal(c).netPnl,737.18);
});
test('open-position risk reports the existing trade rather than a new entry', () => {
  const c=context(); c.account=openTrade(c.account,'RELIANCE',{qualified:true,entry:1000,stop:990,target:1020},.5,25);
  const plan=riskPlan(c);
  assert.equal(plan.mode,'open_position'); assert.equal(plan.quantity,41); assert.equal(plan.entry,1000); assert.equal(plan.plannedLoss,491.59);
  assert.match(practiceBrief(c,'risk'),/existing position/);
});
