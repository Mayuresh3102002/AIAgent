import { SYMBOLS, candlesFor, analyze, sizePosition, fee } from './engine.js';
const money = value => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:2}).format(value);
const round = n => Math.round(n * 100) / 100;
export function validateContext(raw) {
  if (!raw || !SYMBOLS.some(s => s.symbol === raw.symbol) || !Number.isInteger(raw.index) || raw.index < 21 || raw.index > 72 || ![.25,.5,1].includes(raw.riskPercent)) throw new Error('Invalid replay context.');
  const account = raw.account;
  if (!account || !Number.isFinite(account.cash) || account.cash < 0 || account.cash > 10000000 || !Array.isArray(account.trades) || account.trades.length > 200) throw new Error('Invalid paper account.');
  const cleanTrade = (t, closed) => {
    if (!t || !SYMBOLS.some(s => s.symbol === t.symbol) || !Number.isInteger(t.quantity) || t.quantity < 1 || t.quantity > 100000 || !Number.isInteger(t.openedAt) || t.openedAt < 0 || t.openedAt >= raw.index) throw new Error('Invalid paper trade.');
    const fields = closed ? ['entry','stop','target','entryFee','exit','exitFee','pnl'] : ['entry','stop','target','entryFee'];
    if (fields.some(k => !Number.isFinite(t[k]) || Math.abs(t[k]) > 10000000) || t.entry <= 0 || t.stop <= 0 || t.stop >= t.entry || t.target <= t.entry || t.entryFee < 0) throw new Error('Invalid trade values.');
    if (closed && (!Number.isInteger(t.closedAt) || t.closedAt < t.openedAt || t.closedAt >= raw.index || t.exit <= 0 || t.exitFee < 0)) throw new Error('Invalid exit.');
    return { symbol:t.symbol, quantity:t.quantity, openedAt:t.openedAt, ...Object.fromEntries(fields.map(k=>[k,t[k]])), ...(closed ? {closedAt:t.closedAt} : {}) };
  };
  return {symbol:raw.symbol,index:raw.index,riskPercent:raw.riskPercent,account:{cash:account.cash,position:account.position?cleanTrade(account.position,false):null,trades:account.trades.map(t=>cleanTrade(t,true))}};
}
export function scanMarket(context) {
  return SYMBOLS.map(({symbol,name}) => {
    const bars = candlesFor(symbol).slice(0,context.index), setup = analyze(bars);
    return {symbol,name,time:bars.at(-1).time,price:bars.at(-1).close,qualified:setup.qualified,checksPassed:setup.conditions.filter(c=>c.passed).length,conditions:setup.conditions,entry:setup.entry,stop:setup.stop,target:setup.target};
  });
}
export function riskPlan(context) {
  const position=context.account.position;
  if(position) return {mode:'open_position',symbol:position.symbol,entry:position.entry,stop:position.stop,target:position.target,quantity:position.quantity,riskPercent:null,plannedLoss:round(position.quantity*(position.entry-position.stop)+position.entryFee+fee(position.quantity*position.stop)),estimatedEntryFee:position.entryFee,canEnter:false,limitation:'Entry-to-stop loss for the existing position; gaps can cause a larger loss.'};
  const setup=analyze(candlesFor(context.symbol).slice(0,context.index));
  const quantity=sizePosition({cash:context.account.cash,entry:setup.entry,stop:setup.stop,riskPercent:context.riskPercent});
  return {symbol:context.symbol,entry:setup.entry,stop:setup.stop,target:setup.target,riskPercent:context.riskPercent,quantity,plannedLoss:round(quantity*(setup.entry-setup.stop)+fee(quantity*setup.entry)+fee(quantity*setup.stop)),estimatedEntryFee:fee(quantity*setup.entry),canEnter:setup.qualified&&!context.account.position&&context.index<72&&quantity>0,limitation:'Gap losses may exceed planned loss; synthetic fills exclude slippage.'};
}
export function reviewJournal(context) {
  const trades=context.account.trades;
  const pnl=trades.map(t=>round((t.exit-t.entry)*t.quantity-t.entryFee-t.exitFee));
  const wins=pnl.filter(v=>v>0).length,losses=pnl.filter(v=>v<0).length;
  return {count:trades.length,wins,losses,breakeven:pnl.length-wins-losses,netPnl:round(pnl.reduce((s,n)=>s+n,0)),estimatedFees:round(trades.reduce((s,t)=>s+t.entryFee+t.exitFee,0)),averagePnl:pnl.length?round(pnl.reduce((s,n)=>s+n,0)/pnl.length):null,scope:'User-supplied paper session, not verified brokerage history or measured live accuracy.'};
}
export const TOOL_NAMES = ['inspect_session','scan_setups','calculate_risk','review_journal'];
export function runCoachTool(name,context) {
  if(name==='inspect_session')return {dataMode:'synthetic',symbol:context.symbol,revealedCandles:context.index,time: candlesFor(context.symbol)[context.index-1].time,timeZone:'Asia/Kolkata',cash:context.account.cash,position:context.account.position,limitations:['No live NSE data','Read-only tools; cannot place or close trades','No calibrated win probability','Client-provided paper account']};
  if(name==='scan_setups')return scanMarket(context);
  if(name==='calculate_risk')return riskPlan(context);
  if(name==='review_journal')return reviewJournal(context);
  throw new Error('Unsupported agent tool.');
}
export function practiceBrief(context,topic) {
  const setup=scanMarket(context).find(s=>s.symbol===context.symbol),plan=riskPlan(context),journal=reviewJournal(context);
  if(topic==='risk'&&context.account.position) return `Your open ${plan.symbol} position has ${plan.quantity} shares at ${money(plan.entry)}, with a stop at ${money(plan.stop)} and a target at ${money(plan.target)}. Its planned entry-to-stop loss including estimated fees is ${money(plan.plannedLoss)}. This describes your existing position, not a new entry. A gap can cause a larger loss.`;
  if(topic==='risk') return `At ${context.riskPercent}% of available cash, the calculator allows ${plan.quantity} shares of ${context.symbol}. Entry ${money(plan.entry)}, stop ${money(plan.stop)}, target ${money(plan.target)}. Planned loss including estimated fees: ${money(plan.plannedLoss)}. ${context.account.position?'You already have an open position. Close it before planning another entry.':plan.canEnter?'The setup qualifies for paper practice.':'Entry is not available under the current setup or session constraints.'} A gap can cause a larger loss.`;
  if(topic==='journal')return journal.count?`Your ${journal.count} completed paper trades returned ${money(journal.netPnl)} after ${money(journal.estimatedFees)} in estimated fees. ${journal.wins} wins, ${journal.losses} losses, ${journal.breakeven} breakeven. Review whether you followed the entry and exit plan. These synthetic examples cannot establish real-market accuracy.`:'There are no completed trades to review yet. Open a qualifying paper trade and reveal candles or close the position, then return here.';
  return `${context.symbol}: ${setup.checksPassed} of 3 conditions met at ${setup.time} IST in this fictional session. ${setup.conditions.map(c=>`${c.label}: ${c.passed?'met':'waiting'} (${c.detail}).`).join(' ')} ${setup.qualified?'A rule match is a teaching setup, not a prediction or guaranteed profit.':'Waiting is appropriate while the rules are incomplete.'}`;
}
