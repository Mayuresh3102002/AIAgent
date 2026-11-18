import { SYMBOLS, candlesFor, analyze, sizePosition, fee, riskPreview } from './engine.js';
const money = value => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:2}).format(value);
const round = n => Math.round(n * 100) / 100;

function scenarioOf(context) {
  return context.scenarioId || 'classic';
}

export function scanMarket(context) {
  return SYMBOLS.map(({symbol,name}) => {
    const bars = candlesFor(symbol, scenarioOf(context)).slice(0,context.index), setup = analyze(bars);
    return {
      symbol,
      name,
      time: bars.at(-1).time,
      price: bars.at(-1).close,
      qualified: setup.qualified,
      strategy: setup.strategy,
      checksPassed: setup.conditions.filter(c => c.passed).length,
      conditions: setup.conditions,
      entry: setup.entry,
      stop: setup.stop,
      target: setup.target,
    };
  });
}

export function marketOverview(context) {
  const scenarioId = scenarioOf(context);
  const rows = SYMBOLS.map(({ symbol, name, base }) => {
    const bars = candlesFor(symbol, scenarioId).slice(0, context.index);
    const last = bars.at(-1);
    const first = bars[0];
    const previous = bars.length > 1 ? bars.at(-2) : first;
    const setup = analyze(bars);
    const conditions = setup.conditions || [];
    const sessionOpen = first.open;
    const sessionHigh = Math.max(...bars.map(bar => bar.high));
    const sessionLow = Math.min(...bars.map(bar => bar.low));
    const change = round(last.close - sessionOpen);
    const changePercent = round((change / sessionOpen) * 100);
    const barChange = round(last.close - previous.close);
    const volume = bars.reduce((sum, bar) => sum + bar.volume, 0);
    const avgVolume = round(volume / bars.length);
    const spark = bars.slice(-24).map(bar => bar.close);
    return {
      symbol,
      name,
      base,
      time: last.time,
      price: last.close,
      open: last.open,
      high: last.high,
      low: last.low,
      lastVolume: last.volume,
      sessionOpen,
      sessionHigh,
      sessionLow,
      change,
      changePercent,
      barChange,
      volume,
      avgVolume,
      spark,
      qualified: Boolean(setup.qualified),
      strategy: setup.strategy || null,
      checksPassed: conditions.filter(c => c.passed).length,
      conditions,
      entry: setup.entry ?? null,
      stop: setup.stop ?? null,
      target: setup.target ?? null,
      average: setup.average ?? null,
      priorHigh: setup.priorHigh ?? null,
    };
  });
  const gainers = [...rows].sort((a, b) => b.changePercent - a.changePercent);
  const qualifiers = rows.filter(row => row.qualified);
  const breadth = {
    advancing: rows.filter(row => row.change > 0).length,
    declining: rows.filter(row => row.change < 0).length,
    unchanged: rows.filter(row => row.change === 0).length,
    readySetups: qualifiers.length,
  };
  return {
    time: rows[0]?.time || null,
    candlesRevealed: context.index,
    scenarioId,
    breadth,
    topGainer: gainers[0] || null,
    topLoser: gainers.at(-1) || null,
    rows,
    notice: 'Synthetic session prices only. Not live NSE quotes or delayed market data.',
  };
}

export function riskPlan(context) {
  const position = context.account.position;
  if (position) {
    const gapExit = round(position.stop * 0.99);
    return {
      mode: 'open_position',
      symbol: position.symbol,
      strategy: position.strategy || 'breakout',
      entry: position.entry,
      stop: position.stop,
      target: position.target,
      quantity: position.quantity,
      riskPercent: null,
      plannedLoss: round(position.quantity * (position.entry - position.stop) + position.entryFee + fee(position.quantity * position.stop)),
      gapLoss: round(position.quantity * (position.entry - gapExit) + position.entryFee + fee(position.quantity * gapExit)),
      gapExit,
      plannedGain: round(position.quantity * (position.target - position.entry) - position.entryFee - fee(position.quantity * position.target)),
      estimatedEntryFee: position.entryFee,
      canEnter: false,
      limitation: 'Entry-to-stop loss for the existing position; gaps can cause a larger loss.',
    };
  }
  const setup = analyze(candlesFor(context.symbol, scenarioOf(context)).slice(0, context.index));
  const preview = riskPreview({
    cash: context.account.cash,
    entry: setup.entry,
    stop: setup.stop,
    target: setup.target,
    riskPercent: context.riskPercent,
  });
  return {
    symbol: context.symbol,
    strategy: setup.strategy,
    entry: setup.entry,
    stop: setup.stop,
    target: setup.target,
    riskPercent: context.riskPercent,
    quantity: preview.quantity,
    plannedLoss: preview.plannedLoss,
    plannedGain: preview.plannedGain,
    gapLoss: preview.gapLoss,
    gapExit: preview.gapExit,
    estimatedEntryFee: preview.entryFee,
    canEnter: setup.qualified && !context.account.position && context.index < 72 && preview.quantity > 0,
    limitation: preview.note,
  };
}

export function reviewJournal(context) {
  const trades = context.account.trades;
  const pnl = trades.map(t => round((t.exit - t.entry) * t.quantity - t.entryFee - t.exitFee));
  const wins = pnl.filter(v => v > 0).length, losses = pnl.filter(v => v < 0).length;
  return {
    count: trades.length,
    wins,
    losses,
    breakeven: pnl.length - wins - losses,
    netPnl: round(pnl.reduce((s, n) => s + n, 0)),
    estimatedFees: round(trades.reduce((s, t) => s + t.entryFee + t.exitFee, 0)),
    averagePnl: pnl.length ? round(pnl.reduce((s, n) => s + n, 0) / pnl.length) : null,
    waitsSkipped: context.account.waitsSkipped || 0,
    scope: 'User-supplied paper session, not verified brokerage history or measured live accuracy.',
  };
}

export function practiceBrief(context, topic) {
  const setup = scanMarket(context).find(s => s.symbol === context.symbol), plan = riskPlan(context), journal = reviewJournal(context);
  if (topic === 'risk' && context.account.position) {
    return `Your open ${plan.symbol} position has ${plan.quantity} shares at ${money(plan.entry)}, with a stop at ${money(plan.stop)} and a target at ${money(plan.target)}. Its planned entry-to-stop loss including estimated fees is ${money(plan.plannedLoss)}. An illustrative gap 1% below the stop would cost about ${money(plan.gapLoss)}. This describes your existing position, not a new entry.`;
  }
  if (topic === 'risk') {
    return `At ${context.riskPercent}% of available cash, the calculator allows ${plan.quantity} shares of ${context.symbol}. Entry ${money(plan.entry)}, stop ${money(plan.stop)}, target ${money(plan.target)}. Planned loss including estimated fees: ${money(plan.plannedLoss)}. Illustrative gap loss (1% below stop): ${money(plan.gapLoss)}. ${context.account.position ? 'You already have an open position. Close it before planning another entry.' : plan.canEnter ? 'The setup qualifies for paper practice.' : 'Entry is not available under the current setup or session constraints.'} A gap can cause a larger loss.`;
  }
  if (topic === 'journal') {
    return journal.count
      ? `Your ${journal.count} completed paper trades returned ${money(journal.netPnl)} after ${money(journal.estimatedFees)} in estimated fees. ${journal.wins} wins, ${journal.losses} losses, ${journal.breakeven} breakeven. You advanced through ${journal.waitsSkipped} candles while the setup was invalid (practice waiting). Review whether you followed the entry and exit plan. These synthetic examples cannot establish real-market accuracy.`
      : `There are no completed trades to review yet. You have waited through ${journal.waitsSkipped} invalid-setup candles so far. Open a qualifying paper trade and reveal candles or close the position, then return here.`;
  }
  const strategyLabel = setup.strategy === 'pullback' ? 'pullback' : setup.strategy === 'breakout' ? 'breakout' : 'no qualifying';
  return `${context.symbol}: ${setup.checksPassed} of 3 conditions met at ${setup.time} IST in this fictional session (${strategyLabel} path). ${setup.conditions.map(c => `${c.label}: ${c.passed ? 'met' : 'waiting'} (${c.detail}).`).join(' ')} ${setup.qualified ? 'A rule match is a teaching setup, not a prediction or guaranteed profit.' : 'Waiting is appropriate while the rules are incomplete.'}`;
}
