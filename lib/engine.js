export const INITIAL_CASH = 100000;
export const SYMBOLS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', base: 1420, step: 1.3 },
  { symbol: 'INFY', name: 'Infosys', base: 1840, step: 1.7 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', base: 1710, step: 1.2 },
];

export const SCENARIOS = [
  {
    id: 'classic',
    name: 'Classic breakout day',
    teaching: 'A clean trend + breakout + volume day. Practice sizing and following a plan.',
    lesson: 'Qualifying rules are not a prediction. Size from the stop, not from hope.',
  },
  {
    id: 'fake_breakout',
    name: 'Fake breakout trap',
    teaching: 'Conditions can look met, then reverse. Practice recognizing failure after entry evidence.',
    lesson: 'A breakout that fails quickly is still useful practice — review whether you respected the stop.',
  },
  {
    id: 'no_setup',
    name: 'No clean setup',
    teaching: 'Most candles should not qualify. Practice waiting instead of forcing a trade.',
    lesson: 'Skipping invalid setups is a measurable skill. Waiting is a decision.',
  },
  {
    id: 'gap_stop',
    name: 'Gap through stop',
    teaching: 'After a qualifying entry window, a gap can open below the stop. Practice gap risk.',
    lesson: 'Planned stop loss is not a guaranteed fill. Gaps can exceed your risk budget.',
  },
];

const round = n => Math.round(n * 100) / 100;

function sessionClock(i) {
  return `${String(9 + Math.floor((15 + i * 5) / 60)).padStart(2, '0')}:${String((15 + i * 5) % 60).padStart(2, '0')}`;
}

function bar(i, open, close, step, volume) {
  return {
    index: i,
    time: sessionClock(i),
    open,
    close,
    high: round(Math.max(open, close) + step * (1 + (i % 3) * .25)),
    low: round(Math.min(open, close) - step * (1 + (i % 4) * .2)),
    volume,
  };
}

function classicProfile(i) {
  return {
    drift: i < 25 ? .25 : i < 38 ? 1.2 : i < 52 ? -1.5 : .65,
    volume: 100000 + (i % 7) * 15000 + (i >= 25 && i < 38 ? 110000 : 0),
  };
}

function profileFor(scenarioId, i) {
  if (scenarioId === 'fake_breakout') {
    return {
      drift: i < 25 ? .2 : i < 32 ? 1.35 : i < 42 ? -2.4 : i < 55 ? -.4 : .5,
      volume: 100000 + (i % 7) * 12000 + (i >= 25 && i < 33 ? 130000 : i >= 33 && i < 40 ? 90000 : 0),
    };
  }
  if (scenarioId === 'no_setup') {
    return {
      // Choppy, mostly flat-to-soft tape with muted volume so teaching setups stay rare.
      drift: Math.sin(i * .9) * .55 + Math.cos(i * .33) * .4 - .35,
      volume: 70000 + (i % 4) * 5000,
    };
  }
  if (scenarioId === 'gap_stop') {
    return {
      drift: i < 25 ? .25 : i < 30 ? 1.15 : i === 30 ? -8 : i < 40 ? -1.8 : i < 55 ? .4 : .7,
      volume: 100000 + (i % 7) * 15000 + (i >= 25 && i < 31 ? 120000 : i === 30 ? 180000 : 0),
      forceGap: i === 30,
    };
  }
  return classicProfile(i);
}

export function candlesFor(symbol, scenarioId = 'classic') {
  const item = SYMBOLS.find(s => s.symbol === symbol);
  if (!item) throw new Error('Unknown symbol');
  const scenario = SCENARIOS.some(s => s.id === scenarioId) ? scenarioId : 'classic';
  let previous = item.base;
  return Array.from({ length: 72 }, (_, i) => {
    const profile = profileFor(scenario, i);
    const open = previous;
    let close = round(open + item.step * (Math.sin(i * 1.72) * 1.8 + profile.drift));
    if (profile.forceGap) {
      // Teaching gap: open well below the prior close, then trade lower.
      close = round(open + item.step * profile.drift);
    }
    const candle = bar(i, open, close, item.step, profile.volume);
    if (profile.forceGap) {
      candle.open = round(previous * 0.985);
      candle.low = round(Math.min(candle.open, close) - item.step * 1.5);
      candle.high = round(Math.max(candle.open, close) + item.step * .5);
      candle.close = close;
    }
    previous = candle.close;
    return candle;
  });
}

export function analyze(candles) {
  if (candles.length < 21) return { ready: false, reason: 'At least 21 candles are needed.', strategy: null, strategies: {} };
  const last = candles.at(-1), prior = candles.slice(-21, -1), previous = candles.at(-2);
  const average = prior.reduce((s, c) => s + c.close, 0) / prior.length;
  const priorHigh = Math.max(...prior.slice(-10).map(c => c.high));
  const volumeAverage = prior.reduce((s, c) => s + c.volume, 0) / prior.length;
  const recentLow = Math.min(...candles.slice(-5).map(c => c.low));
  const breakoutConditions = [
    { label: 'Above the 20-bar average', passed: last.close > average, detail: `Price ${last.close.toFixed(2)} · average ${average.toFixed(2)}` },
    { label: 'Breaks the previous 10-bar high', passed: last.close > priorHigh, detail: `Breakout level ${priorHigh.toFixed(2)}` },
    { label: 'Volume above recent average', passed: last.volume > volumeAverage, detail: `${(last.volume / volumeAverage).toFixed(2)}× the previous 20-bar average` },
  ];
  const nearAverage = last.close <= average * 1.0035 && last.close >= average * 0.997;
  const bounced = last.close > previous.close && last.close >= last.open;
  const pullbackConditions = [
    { label: 'Uptrend above the 20-bar average', passed: last.close > average, detail: `Price ${last.close.toFixed(2)} · average ${average.toFixed(2)}` },
    { label: 'Pullback finishing near the average', passed: nearAverage && recentLow <= average * 1.004, detail: `Close ${last.close.toFixed(2)} · recent low ${recentLow.toFixed(2)} · average ${average.toFixed(2)}` },
    { label: 'Bounce without a fresh breakout', passed: bounced && last.close <= priorHigh && last.volume >= volumeAverage * 0.9, detail: `Close vs prior high ${priorHigh.toFixed(2)} · volume ${(last.volume / volumeAverage).toFixed(2)}× avg` },
  ];
  const breakoutQualified = breakoutConditions.every(c => c.passed);
  // Pullback is a separate teaching path; require enough history and exclude breakout bars.
  const pullbackQualified = candles.length >= 26 && !breakoutQualified && pullbackConditions.every(c => c.passed);
  const strategy = breakoutQualified ? 'breakout' : pullbackQualified ? 'pullback' : null;
  const conditions = strategy === 'pullback' ? pullbackConditions : breakoutConditions;
  const stop = round(Math.min(...candles.slice(-5).map(c => c.low)));
  const entry = last.close;
  return {
    ready: true,
    qualified: Boolean(strategy),
    strategy,
    strategies: {
      breakout: { qualified: breakoutQualified, conditions: breakoutConditions },
      pullback: { qualified: pullbackQualified, conditions: pullbackConditions },
    },
    conditions,
    entry,
    stop,
    target: round(entry + 2 * (entry - stop)),
    average,
    priorHigh,
  };
}

// Pedagogical estimate only; this is not a broker's tax or fee schedule.
export function fee(notional) { return round(notional * .001); }

export function sizePosition({ cash, entry, stop, riskPercent }) {
  if (![cash, entry, stop, riskPercent].every(Number.isFinite) || cash <= 0 || stop <= 0 || entry <= stop || riskPercent <= 0 || riskPercent > 1) return 0;
  const riskPerShare = entry - stop + .001 * (entry + stop);
  return Math.max(0, Math.min(Math.floor((cash * riskPercent / 100) / riskPerShare), Math.floor(cash / (entry * 1.001))));
}

export function riskPreview({ cash, entry, stop, target, riskPercent }) {
  const quantity = sizePosition({ cash, entry, stop, riskPercent });
  const entryFee = fee(quantity * entry);
  const stopExitFee = fee(quantity * stop);
  const targetExitFee = fee(quantity * target);
  const plannedLoss = round(quantity * (entry - stop) + entryFee + stopExitFee);
  const plannedGain = round(quantity * (target - entry) - entryFee - targetExitFee);
  // Teaching illustration: a 1% gap below the stop fill.
  const gapExit = round(stop * 0.99);
  const gapLoss = round(quantity * (entry - gapExit) + entryFee + fee(quantity * gapExit));
  return {
    quantity,
    entry,
    stop,
    target,
    gapExit,
    plannedLoss,
    plannedGain,
    gapLoss,
    entryFee,
    rewardRiskBeforeFees: entry > stop ? round((target - entry) / (entry - stop)) : null,
    note: 'Gap case is an illustrative 1% open below the stop. Actual gaps vary; synthetic fills exclude slippage.',
  };
}

export function openTrade(account, symbol, setup, riskPercent, index) {
  if (account.position) throw new Error('Close the current position first.');
  if (!setup.qualified) throw new Error('Wait until a setup strategy qualifies.');
  const quantity = sizePosition({ cash: account.cash, entry: setup.entry, stop: setup.stop, riskPercent });
  if (!quantity) throw new Error('This risk budget cannot fund one share.');
  const entryFee = fee(quantity * setup.entry);
  return {
    ...account,
    cash: round(account.cash - quantity * setup.entry - entryFee),
    position: {
      id: account.trades.length + 1,
      symbol,
      strategy: setup.strategy || 'breakout',
      entry: setup.entry,
      stop: setup.stop,
      target: setup.target,
      quantity,
      entryFee,
      openedAt: index,
    },
  };
}

export function closeTrade(account, exit, reason, index) {
  const p = account.position;
  if (!p || !Number.isFinite(exit) || exit <= 0) throw new Error('No valid position to close.');
  const exitFee = fee(exit * p.quantity);
  const trade = { ...p, exit, reason, closedAt: index, exitFee, pnl: round((exit - p.entry) * p.quantity - p.entryFee - exitFee) };
  return { ...account, cash: round(account.cash + exit * p.quantity - exitFee), position: null, trades: [trade, ...account.trades] };
}

export function settleBar(account, candle, index) {
  const p = account.position;
  if (!p || index <= p.openedAt) return account;
  // Gap-through stops fill at the opening price. If both levels touch, assume stop first.
  if (candle.open <= p.stop) return closeTrade(account, candle.open, 'Stop · gap at open', index);
  if (candle.open >= p.target) return closeTrade(account, candle.open, 'Target · gap at open', index);
  if (candle.low <= p.stop) return closeTrade(account, p.stop, 'Stop reached', index);
  if (candle.high >= p.target) return closeTrade(account, p.target, 'Target reached', index);
  return account;
}

export function emptyAccount() {
  return { cash: INITIAL_CASH, position: null, trades: [], waitsSkipped: 0, decisions: [] };
}

export function recordWait(account, setupQualified) {
  if (setupQualified || account.position) return account;
  return { ...account, waitsSkipped: (account.waitsSkipped || 0) + 1 };
}
