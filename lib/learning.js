import { analyze, candlesFor } from './engine.js';
import { riskPlan } from './coach.js';

export const PLAN_CHECKS = [
  { id: 'setup', label: 'I checked the trend, breakout, and volume conditions.' },
  { id: 'stop', label: 'I know the stop price that invalidates this trade.' },
  { id: 'risk', label: 'I accept the planned loss and understand gap risk.' },
];

export function createTradePlan(context, draft) {
  const plan = riskPlan(context);
  if (!plan.canEnter) throw new Error('A new plan requires a qualifying setup, available cash, and no open position.');
  if (!draft || PLAN_CHECKS.some(check => draft.checks?.[check.id] !== true)) {
    throw new Error('Complete all three pre-trade checks.');
  }
  const thesis = typeof draft.thesis === 'string' ? draft.thesis.trim() : '';
  if (thesis.length < 20 || thesis.length > 500) throw new Error('Write your trade reasoning in 20–500 characters.');
  const setup = analyze(candlesFor(context.symbol).slice(0, context.index));
  return {
    symbol: context.symbol,
    candle: context.index,
    thesis,
    checks: PLAN_CHECKS.map(check => check.id),
    conditions: setup.conditions.map(condition => ({ ...condition })),
    entry: plan.entry,
    stop: plan.stop,
    target: plan.target,
    quantity: plan.quantity,
    plannedLoss: plan.plannedLoss,
    riskPercent: context.riskPercent,
  };
}

export function validateReflection(draft) {
  if (!['yes', 'no', 'unsure'].includes(draft?.followedPlan)) throw new Error('Choose whether you followed your plan.');
  const lesson = typeof draft.lesson === 'string' ? draft.lesson.trim() : '';
  const nextStep = typeof draft.nextStep === 'string' ? draft.nextStep.trim() : '';
  if ([lesson, nextStep].some(text => text.length < 10 || text.length > 500)) {
    throw new Error('Write a lesson and a next step, each between 10 and 500 characters.');
  }
  return { followedPlan: draft.followedPlan, lesson, nextStep };
}

export function learningProgress(trades) {
  return {
    completed: trades.length,
    planned: trades.filter(trade => trade.plan).length,
    reviewed: trades.filter(trade => trade.reflection).length,
  };
}

export function reviewPrompt(trade) {
  if (!trade.plan) return 'No written plan was recorded before entry. Write down the evidence and invalidation level before your next trade.';
  if (trade.reflection?.followedPlan === 'no') return 'You identified a deviation. Make the next step specific: what will you do differently before the next entry or exit?';
  if (trade.pnl < 0) return 'A planned loss is still a loss. Compare this exit with your original stop and reasoning; one outcome cannot validate or invalidate a strategy.';
  return 'A profitable outcome does not prove the decision was sound. Check whether the entry evidence and position size would justify the trade again.';
}
