export const INITIAL_CASH = 100000;
export const SYMBOLS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', base: 1420, step: 1.3 },
  { symbol: 'INFY', name: 'Infosys', base: 1840, step: 1.7 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', base: 1710, step: 1.2 },
];
const round = n => Math.round(n * 100) / 100;
export function candlesFor(symbol) {
  const item = SYMBOLS.find(s => s.symbol === symbol);
  if (!item) throw new Error('Unknown symbol');
  let previous = item.base;
  return Array.from({ length: 72 }, (_, i) => {
    const drift = i < 25 ? .25 : i < 38 ? 1.2 : i < 52 ? -1.5 : .65;
    const open = previous;
    const close = round(open + item.step * (Math.sin(i * 1.72) * 1.8 + drift));
    previous = close;
    return { index: i, time: `${String(9 + Math.floor((15 + i * 5) / 60)).padStart(2, '0')}:${String((15 + i * 5) % 60).padStart(2, '0')}`, open, close,
      high: round(Math.max(open, close) + item.step * (1 + (i % 3) * .25)),
      low: round(Math.min(open, close) - item.step * (1 + (i % 4) * .2)),
      volume: 100000 + (i % 7) * 15000 + (i >= 25 && i < 38 ? 110000 : 0) };
  });
}
export function analyze(candles) {
  if (candles.length < 21) return { ready: false, reason: 'At least 21 candles are needed.' };
  const last = candles.at(-1), prior = candles.slice(-21, -1);
  const average = prior.reduce((s,c) => s + c.close, 0) / prior.length;
  const priorHigh = Math.max(...prior.slice(-10).map(c => c.high));
  const volumeAverage = prior.reduce((s,c) => s + c.volume, 0) / prior.length;
  const conditions = [
    { label: 'Above the 20-bar average', passed: last.close > average, detail: `Price ${last.close.toFixed(2)} · average ${average.toFixed(2)}` },
    { label: 'Breaks the previous 10-bar high', passed: last.close > priorHigh, detail: `Breakout level ${priorHigh.toFixed(2)}` },
    { label: 'Volume above recent average', passed: last.volume > volumeAverage, detail: `${(last.volume / volumeAverage).toFixed(2)}× the previous 20-bar average` },
  ];
  const stop = round(Math.min(...candles.slice(-5).map(c => c.low)));
  const entry = last.close;
  return { ready: true, qualified: conditions.every(c => c.passed), conditions, entry, stop, target: round(entry + 2 * (entry - stop)), average, priorHigh };
}
// Pedagogical estimate only; this is not a broker's tax or fee schedule.
export function fee(notional) { return round(notional * .001); }
export function sizePosition({ cash, entry, stop, riskPercent }) {
  if (![cash, entry, stop, riskPercent].every(Number.isFinite) || cash <= 0 || stop <= 0 || entry <= stop || riskPercent <= 0 || riskPercent > 1) return 0;
  const riskPerShare = entry - stop + .001 * (entry + stop);
  return Math.max(0, Math.min(Math.floor((cash * riskPercent / 100) / riskPerShare), Math.floor(cash / (entry * 1.001))));
}
export function openTrade(account, symbol, setup, riskPercent, index) {
  if (account.position) throw new Error('Close the current position first.');
  if (!setup.qualified) throw new Error('Wait until all three setup conditions qualify.');
  const quantity = sizePosition({ cash: account.cash, entry: setup.entry, stop: setup.stop, riskPercent });
  if (!quantity) throw new Error('This risk budget cannot fund one share.');
  const entryFee = fee(quantity * setup.entry);
  return { ...account, cash: round(account.cash - quantity * setup.entry - entryFee), position: { id: account.trades.length + 1, symbol, entry: setup.entry, stop: setup.stop, target: setup.target, quantity, entryFee, openedAt: index } };
}
export function closeTrade(account, exit, reason, index) {
  const p = account.position;
  if (!p || !Number.isFinite(exit) || exit <= 0) throw new Error('No valid position to close.');
  const exitFee = fee(exit * p.quantity);
  const trade = { ...p, exit, reason, closedAt: index, exitFee, pnl: round((exit - p.entry) * p.quantity - p.entryFee - exitFee) };
  return { cash: round(account.cash + exit * p.quantity - exitFee), position: null, trades: [trade, ...account.trades] };
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
export function emptyAccount() { return { cash: INITIAL_CASH, position: null, trades: [] }; }
