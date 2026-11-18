import { INITIAL_CASH, analyze, candlesFor, fee } from './engine.js';
import { riskPlan } from './coach.js';

export const BREAKOUT_CHECKS = [
  { id: 'setup', label: 'I checked the trend, breakout, and volume conditions.' },
  { id: 'stop', label: 'I know the stop price that invalidates this trade.' },
  { id: 'risk', label: 'I accept the planned loss and understand gap risk.' },
];

export const PULLBACK_CHECKS = [
  { id: 'setup', label: 'I checked the uptrend, pullback depth, and bounce evidence.' },
  { id: 'stop', label: 'I know the stop price that invalidates this trade.' },
  { id: 'risk', label: 'I accept the planned loss and understand gap risk.' },
];

/** @deprecated Prefer planChecksFor(strategy). Kept for callers and older tests. */
export const PLAN_CHECKS = BREAKOUT_CHECKS;

export function planChecksFor(strategy) {
  return strategy === 'pullback' ? PULLBACK_CHECKS : BREAKOUT_CHECKS;
}

export function createTradePlan(context, draft) {
  const plan = riskPlan(context);
  if (!plan.canEnter) throw new Error('A new plan requires a qualifying setup, available cash, and no open position.');
  const setup = analyze(candlesFor(context.symbol, context.scenarioId).slice(0, context.index));
  const checks = planChecksFor(setup.strategy);
  if (!draft || checks.some(check => draft.checks?.[check.id] !== true)) {
    throw new Error(`Complete all three pre-trade checks.`);
  }
  const thesis = typeof draft.thesis === 'string' ? draft.thesis.trim() : '';
  if (thesis.length < 20 || thesis.length > 500) throw new Error('Write your trade reasoning in 20–500 characters.');
  return {
    symbol: context.symbol,
    strategy: setup.strategy || 'breakout',
    candle: context.index,
    thesis,
    checks: checks.map(check => check.id),
    conditions: setup.conditions.map(condition => ({ ...condition })),
    entry: plan.entry,
    stop: plan.stop,
    target: plan.target,
    quantity: plan.quantity,
    plannedLoss: plan.plannedLoss,
    gapLoss: plan.gapLoss,
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
    quizzed: trades.filter(trade => trade.quiz).length,
  };
}

export function reviewPrompt(trade) {
  if (!trade.plan) return 'No written plan was recorded before entry. Write down the evidence and invalidation level before your next trade.';
  if (trade.reflection?.followedPlan === 'no') return 'You identified a deviation. Make the next step specific: what will you do differently before the next entry or exit?';
  if (trade.pnl < 0) return 'A planned loss is still a loss. Compare this exit with your original stop and reasoning; one outcome cannot validate or invalidate a strategy.';
  return 'A profitable outcome does not prove the decision was sound. Check whether the entry evidence and position size would justify the trade again.';
}

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
const round = n => Math.round(n * 100) / 100;

export function buildQuiz(trade) {
  const strategy = trade.strategy || trade.plan?.strategy || 'breakout';
  return [
    {
      id: 'invalidation',
      prompt: 'What price invalidates this long paper trade?',
      options: [
        { id: 'stop', label: money(trade.stop), correct: true },
        { id: 'target', label: money(trade.target), correct: false },
        { id: 'entry', label: money(trade.entry), correct: false },
      ],
      explanation: `The stop at ${money(trade.stop)} is the invalidation level for this trade.`,
    },
    {
      id: 'strategy',
      prompt: 'Which teaching setup was used for this trade?',
      options: [
        { id: 'breakout', label: 'Breakout (trend + prior high + volume)', correct: strategy === 'breakout' },
        { id: 'pullback', label: 'Pullback (trend + pullback + bounce)', correct: strategy === 'pullback' },
        { id: 'random', label: 'Random entry with no checklist', correct: false },
      ],
      explanation: strategy === 'pullback'
        ? 'This trade used the pullback checklist: uptrend, pullback toward the average, and a bounce.'
        : 'This trade used the breakout checklist: trend, prior-high break, and volume.',
    },
    {
      id: 'fees',
      prompt: 'Is the journal P&L before or after estimated fees?',
      options: [
        { id: 'after', label: 'After estimated fees (0.10% per side)', correct: true },
        { id: 'before', label: 'Before fees — fees are ignored', correct: false },
        { id: 'broker', label: 'Exact NSE brokerage and taxes', correct: false },
      ],
      explanation: 'Net P&L subtracts the 0.10% teaching fee estimate on entry and exit. It is not a broker tax schedule.',
    },
    {
      id: 'accuracy',
      prompt: 'What does a winning synthetic trade prove about live markets?',
      options: [
        { id: 'nothing', label: 'Nothing about live-market accuracy — only process practice', correct: true },
        { id: 'edge', label: 'The signal has measured predictive accuracy', correct: false },
        { id: 'income', label: '₹10,000 per day is a realistic expectation', correct: false },
      ],
      explanation: 'Synthetic replay practices process. It cannot establish live profitability or signal accuracy.',
    },
  ];
}

export function gradeQuiz(trade, answers) {
  const quiz = buildQuiz(trade);
  if (!answers || typeof answers !== 'object') throw new Error('Answer each quiz question.');
  const details = quiz.map(question => {
    const selected = answers[question.id];
    if (!selected) throw new Error('Answer each quiz question.');
    const option = question.options.find(item => item.id === selected);
    if (!option) throw new Error('Choose a listed answer for each question.');
    return {
      id: question.id,
      prompt: question.prompt,
      selected,
      correct: option.correct,
      explanation: question.explanation,
    };
  });
  const score = details.filter(item => item.correct).length;
  return { score, total: details.length, details, answers: { ...answers } };
}

export function sessionScorecard(account) {
  const trades = account.trades || [];
  const pnls = trades.map(trade => trade.pnl);
  const wins = pnls.filter(v => v > 0).length;
  const losses = pnls.filter(v => v < 0).length;
  const netPnl = round(pnls.reduce((sum, value) => sum + value, 0));
  const expectancy = pnls.length ? round(netPnl / pnls.length) : null;
  const followed = trades.filter(trade => trade.reflection?.followedPlan === 'yes').length;
  const reflected = trades.filter(trade => trade.reflection).length;
  const planned = trades.filter(trade => trade.plan).length;
  let equity = INITIAL_CASH;
  let peak = INITIAL_CASH;
  let maxDrawdown = 0;
  for (const trade of [...trades].reverse()) {
    equity = round(equity + trade.pnl);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, round(peak - equity));
  }
  const estimatedFees = round(trades.reduce((sum, trade) => sum + trade.entryFee + trade.exitFee, 0));
  return {
    trades: trades.length,
    wins,
    losses,
    breakeven: trades.length - wins - losses,
    netPnl,
    expectancy,
    maxDrawdown,
    estimatedFees,
    planRate: trades.length ? round((planned / trades.length) * 100) : null,
    followRate: reflected ? round((followed / reflected) * 100) : null,
    waitsSkipped: account.waitsSkipped || 0,
    quizzesPassed: trades.filter(trade => trade.quiz && trade.quiz.score === trade.quiz.total).length,
    scope: 'In-memory paper session only. Not a live strategy performance record.',
  };
}

export function exportJournalJson(account) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    notice: 'Synthetic paper-trading session. Reloading the app clears this data; nothing is stored in the browser.',
    scorecard: sessionScorecard(account),
    waitsSkipped: account.waitsSkipped || 0,
    trades: account.trades,
  }, null, 2);
}

export function exportJournalMarkdown(account) {
  const scorecard = sessionScorecard(account);
  const lines = [
    '# AIAgent session journal',
    '',
    `_Exported ${new Date().toISOString()}. Synthetic paper trades only. No local storage._`,
    '',
    '## Scorecard',
    `- Trades: ${scorecard.trades} (${scorecard.wins} wins / ${scorecard.losses} losses / ${scorecard.breakeven} breakeven)`,
    `- Net P&L after estimated fees: ${money(scorecard.netPnl)}`,
    `- Expectancy: ${scorecard.expectancy == null ? 'n/a' : money(scorecard.expectancy)}`,
    `- Max drawdown (session equity): ${money(scorecard.maxDrawdown)}`,
    `- Plan written: ${scorecard.planRate == null ? 'n/a' : `${scorecard.planRate}%`}`,
    `- Plan followed (of reflections): ${scorecard.followRate == null ? 'n/a' : `${scorecard.followRate}%`}`,
    `- Waits when setup invalid: ${scorecard.waitsSkipped}`,
    '',
    '## Trades',
  ];
  if (!account.trades.length) lines.push('', '_No completed trades._');
  for (const trade of account.trades) {
    lines.push(
      '',
      `### ${trade.symbol} #${trade.id} · ${trade.strategy || 'breakout'}`,
      `- Entry → exit: ${money(trade.entry)} → ${money(trade.exit)}`,
      `- Reason: ${trade.reason}`,
      `- Net P&L: ${money(trade.pnl)}`,
      `- Plan: ${trade.plan?.thesis || '_none_'}`,
      `- Reflection: ${trade.reflection ? `${trade.reflection.followedPlan} · ${trade.reflection.lesson}` : '_none_'}`,
      `- Quiz: ${trade.quiz ? `${trade.quiz.score}/${trade.quiz.total}` : '_none_'}`,
    );
  }
  lines.push('', '---', scorecard.scope);
  return lines.join('\n');
}

export function downloadText(filename, contents, mime = 'text/plain') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export { fee };
