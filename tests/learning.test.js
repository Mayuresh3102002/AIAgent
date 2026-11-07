import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyAccount, openTrade, closeTrade, analyze, candlesFor } from '../lib/engine.js';
import { createTradePlan, validateReflection, learningProgress, reviewPrompt } from '../lib/learning.js';
const context=()=>({symbol:'RELIANCE',index:28,riskPercent:.5,account:emptyAccount()});
const draft=()=>({thesis:'Price broke the prior high with volume. The stop below the recent low invalidates my trade.',checks:{setup:true,stop:true,risk:true}});

test('guided plan records actual sizing and revealed evidence before entry',()=>{
  const c=context(),plan=createTradePlan(c,draft());
  assert.equal(plan.quantity,39);assert.equal(plan.plannedLoss,492.22);assert.equal(plan.candle,28);assert.equal(plan.conditions.length,3);
  assert.equal(plan.conditions.every(c=>c.passed),true);assert.equal(plan.thesis,draft().thesis);
});
test('guided entry rejects incomplete checks, insufficient reasoning and unavailable setups',()=>{
  const c=context();
  assert.throws(()=>createTradePlan(c,{...draft(),checks:{setup:true,stop:true}}),/three pre-trade/);
  assert.throws(()=>createTradePlan(c,{...draft(),thesis:'  '}),/20–500/);
  assert.throws(()=>createTradePlan(c,{...draft(),thesis:'a'.repeat(501)}),/20–500/);
  for(const invalid of [{...c,index:72},{...c,index:21},{...c,account:{...c.account,cash:1}}]) assert.throws(()=>createTradePlan(invalid,draft()),/qualifying setup/);
  c.account=openTrade(c.account,c.symbol,analyze(candlesFor(c.symbol).slice(0,c.index)),c.riskPercent,c.index-1);
  assert.throws(()=>createTradePlan(c,draft()),/no open position/);
});
test('plans survive exit and trade ids remain distinct within a session',()=>{
  const c=context(),setup=analyze(candlesFor(c.symbol).slice(0,c.index)),plan=createTradePlan(c,draft());
  const opened=openTrade(c.account,c.symbol,setup,c.riskPercent,c.index-1);opened.position.plan=plan;
  const closed=closeTrade(opened,setup.entry,'Manual',c.index-1);
  assert.deepEqual(closed.trades[0].plan,plan);assert.equal(closed.trades[0].id,1);
  const next=openTrade(closed,c.symbol,setup,c.riskPercent,c.index-1);assert.equal(next.position.id,2);
  assert.deepEqual(learningProgress(closed.trades),{completed:1,planned:1,reviewed:0});
});
test('reflections validate substance and progress measures process, not profit',()=>{
  assert.throws(()=>validateReflection({followedPlan:'yes',lesson:'',nextStep:'next'}),/10 and 500/);
  assert.throws(()=>validateReflection({followedPlan:'unknown'}),/Choose/);
  const reflection=validateReflection({followedPlan:'no',lesson:'  I exited before the planned stop. ',nextStep:'Write a specific invalidation before entering.'});
  assert.equal(reflection.lesson,'I exited before the planned stop.');
  const trades=[{pnl:-100,plan:{},reflection},{pnl:500}];
  assert.deepEqual(learningProgress(trades),{completed:2,planned:1,reviewed:1});
  assert.match(reviewPrompt(trades[0]),/deviation/);assert.match(reviewPrompt(trades[1]),/No written plan/);
});
