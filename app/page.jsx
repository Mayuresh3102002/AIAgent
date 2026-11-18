'use client';
import { useState } from 'react';
import CoachPanel from '../components/CoachPanel';
import JournalPanel from '../components/JournalPanel';
import MarketOverview from '../components/MarketOverview';
import RiskPreview from '../components/RiskPreview';
import CompareChoice from '../components/CompareChoice';
import FrictionGate from '../components/FrictionGate';
import { HeatMeter, EdgeGauge } from '../components/Charts';
import { createTradePlan, validateReflection } from '../lib/learning';
import { processEdgeScore, recordDecision } from '../lib/process';
import { SYMBOLS, SCENARIOS, candlesFor, analyze, emptyAccount, sizePosition, openTrade, closeTrade, settleBar, fee, riskPreview, recordWait } from '../lib/engine';

const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const INITIAL_INDEX = 28;
const TABS = ['Market', 'Practice', 'Coach', 'Journal', 'Learning guide'];

function Icon({ type = 'arrow' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    {type === 'chart' ? <path d="M4 19V5m0 14h16M8 14l4-5 4 3 5-8"/> : type === 'book' ? <><path d="M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4zM14 7h6v12h-3"/></> : type === 'check' ? <path d="m5 12 4 4L19 6"/> : <path d="M4 12h16m-6-6 6 6-6 6"/>}
  </svg>;
}

function headingFor(tab) {
  if (tab === 'Market') return ['See the whole board before you trade.', 'Session prices, change, volume, and which setups are ready.'];
  if (tab === 'Practice') return ['Build your edge. One decision at a time.', 'Compare choices, cool impulsive entries, then practice with purpose.'];
  if (tab === 'Journal') return ['Every trade has a lesson.', 'Replay decisions, spot mistakes, and read your process charts.'];
  if (tab === 'Coach') return ['Learn the reasoning behind the trade.', 'Inspect the evidence. Challenge the setup. Understand the risk.'];
  return ['Understand the trade before you take it.', 'A practical playbook for deliberate intraday practice.'];
}

function Chart({ bars, position }) {
  const visible = bars.slice(-32);
  const levels = position ? [position.stop, position.target] : [];
  const min = Math.min(...visible.map(c => c.low), ...levels) - 3;
  const max = Math.max(...visible.map(c => c.high), ...levels) + 3;
  const y = p => 24 + (max - p) / (max - min) * 232;
  const x = i => 22 + i * 17;
  return <svg className="chart" viewBox="0 0 660 315" role="img" aria-label={`Synthetic five-minute candlestick chart. Latest price ${bars.at(-1).close}.`}>
    {[0, .25, .5, .75, 1].map(t => <g key={t}><line x1="12" x2="548" y1={24 + t * 232} y2={24 + t * 232} stroke="var(--line)"/><text x="558" y={28 + t * 232}>{(max - t * (max - min)).toFixed(1)}</text></g>)}
    {visible.map((c, i) => <g key={c.index} fill={c.close >= c.open ? 'var(--green)' : 'var(--red)'} stroke={c.close >= c.open ? 'var(--green)' : 'var(--red)'}>
      <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)}/>
      <rect x={x(i) - 4} y={Math.min(y(c.open), y(c.close))} width="8" height={Math.max(1, Math.abs(y(c.open) - y(c.close)))}/>
      <rect stroke="none" opacity=".3" x={x(i) - 4} y={285 - c.volume / 15000} width="8" height={c.volume / 15000}/>
      {i % 7 === 0 && <text stroke="none" fill="var(--muted)" x={x(i) - 12} y="307">{c.time}</text>}
    </g>)}
    {position && [['STOP', position.stop], ['TARGET', position.target]].map(([label, p]) => <g key={label}><line x1="12" x2="548" y1={y(p)} y2={y(p)} stroke={label === 'STOP' ? 'var(--red)' : 'var(--green)'} strokeDasharray="5 4"/><text x="22" y={y(p) - 6}>{label} {p.toFixed(2)}</text></g>)}
  </svg>;
}

export default function Page() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [scenarioId, setScenarioId] = useState('classic');
  const [index, setIndex] = useState(INITIAL_INDEX);
  const [account, setAccount] = useState(emptyAccount);
  const [risk, setRisk] = useState('0.5');
  const [tab, setTab] = useState('Practice');
  const [message, setMessage] = useState('');
  const [resetArmed, setResetArmed] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null);

  const scenario = SCENARIOS.find(item => item.id === scenarioId) || SCENARIOS[0];
  const all = candlesFor(symbol, scenarioId);
  const bars = all.slice(0, index);
  const last = bars.at(-1);
  const setup = analyze(bars);
  const p = account.position;
  const mark = p ? candlesFor(p.symbol, scenarioId)[index - 1].close : 0;
  const equity = account.cash + (p ? p.quantity * mark : 0);
  const realized = account.trades.reduce((s, t) => s + t.pnl, 0);
  const quantity = sizePosition({ cash: account.cash, entry: setup.entry, stop: setup.stop, riskPercent: Number(risk) });
  const preview = riskPreview({ cash: account.cash, entry: setup.entry, stop: setup.stop, target: setup.target, riskPercent: Number(risk) });
  const plannedLoss = quantity * (setup.entry - setup.stop) + fee(quantity * setup.entry) + fee(quantity * setup.stop);
  const setupTitle = setup.strategy === 'pullback' ? 'Pullback setup' : setup.strategy === 'breakout' ? 'Breakout setup' : 'Setup desk';
  const coachContext = { symbol, index, account, riskPercent: Number(risk), scenarioId };
  const edge = processEdgeScore(account);

  function advance() {
    if (index >= 72) return;
    let next = recordWait(account, setup.qualified);
    if (p) next = settleBar(next, candlesFor(p.symbol, scenarioId)[index], index);
    if (index === 71 && next.position) next = closeTrade(next, candlesFor(p.symbol, scenarioId)[index].close, 'Replay ended', index);
    const closedNow = next.trades.length > account.trades.length;
    setAccount(next);
    setIndex(index + 1);
    setMessage(closedNow ? `Trade closed: ${next.trades[0].reason}. Open Journal for replay & charts.` : !setup.qualified && !p ? `Wait logged. ${scenario.lesson}` : 'Next five-minute candle revealed.');
  }

  function attachMeta(position, friction) {
    position.friction = friction;
    position.riskPercent = Number(risk);
    if (pendingDecision) position.decision = pendingDecision;
    return position;
  }

  function enterWithFriction(friction) {
    try {
      const next = openTrade(account, symbol, setup, Number(risk), index - 1);
      attachMeta(next.position, friction);
      setAccount(next);
      setPendingDecision(null);
      setMessage('Friction cleared. Paper position opened. Advance the replay to see the outcome.');
    } catch (e) { setMessage(e.message); }
  }

  function enterGuided(draft) {
    const plan = createTradePlan(coachContext, draft);
    const next = openTrade(account, symbol, setup, Number(risk), index - 1);
    next.position.plan = plan;
    attachMeta(next.position, draft.friction);
    setAccount(next);
    setPendingDecision(null);
    setTab('Practice');
    setMessage('Plan saved with friction checks. Reveal candles, then review in Journal.');
  }

  function saveReview(id, draft) {
    const reflection = validateReflection(draft);
    setAccount(current => ({ ...current, trades: current.trades.map(trade => trade.id === id ? { ...trade, reflection } : trade) }));
  }

  function saveQuiz(id, quiz) {
    setAccount(current => ({ ...current, trades: current.trades.map(trade => trade.id === id ? { ...trade, quiz } : trade) }));
  }

  function close() {
    setAccount(closeTrade(account, mark, 'Closed by learner', index - 1));
    setMessage('Position closed. Open Journal for replay theater and process charts.');
  }

  function reset() {
    if (!resetArmed) { setResetArmed(true); return; }
    setAccount(emptyAccount());
    setIndex(INITIAL_INDEX);
    setSymbol('RELIANCE');
    setScenarioId('classic');
    setPendingDecision(null);
    setResetArmed(false);
    setMessage('Practice session reset. Journal and drills cleared.');
  }

  function changeScenario(nextId) {
    if (p) { setMessage('Close or finish the open position before changing scenario.'); return; }
    setScenarioId(nextId);
    setIndex(INITIAL_INDEX);
    setAccount(emptyAccount());
    setPendingDecision(null);
    setMessage(`Scenario changed to ${SCENARIOS.find(item => item.id === nextId)?.name}. Session cleared.`);
  }

  function onDecision(comparison) {
    setPendingDecision(comparison);
    setAccount(current => recordDecision(current, comparison, { index, symbol, riskPercent: Number(risk) }));
    setMessage(comparison.agreed ? 'Rulebook drill matched. Use friction before any entry.' : 'Rulebook differed. Re-read the setup before forcing an entry.');
  }

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`} aria-label="AIAgent home"><span className="brand-mark"><Icon type="chart"/></span> AIAgent<span className="brand-period">.</span></a>
      <span className="workspace">YOUR TRADING WORKSPACE</span>
      <nav aria-label="Main navigation">{TABS.map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'nav active' : 'nav'} aria-current={tab === t ? 'page' : undefined}><Icon type={t === 'Market' || t === 'Practice' ? 'chart' : 'book'}/>{t}{t === 'Journal' && <span className="count">{account.trades.length}</span>}</button>)}</nav>
      <div className="sidebar-edge"><EdgeGauge score={edge.score} label={edge.label}/></div>
      <div className="sidebar-bottom"><div className="avatar">P</div><div><strong>Practice account</strong><small>No real money involved</small></div></div>
    </aside>

    <div className="main">
      <header><span className="breadcrumb">Workspace <span>/</span> {tab}</span><span className="mode"><span/> Synthetic replay · Edge {edge.score}</span></header>
      <main>
        <div className="page-heading"><div><h1>{headingFor(tab)[0]}</h1><p>{headingFor(tab)[1]}</p></div><span className="market-tag">NSE CASH · PAPER ONLY</span></div>
        <div className="notice"><span className="notice-dot"/><span><strong>A safe place to practice.</strong> Synthetic prices, transparent rules, process scoring. No AI key. No live NSE feed.</span></div>
        <section className="account-strip" aria-label="Practice account summary">
          <div><span>Paper equity</span><strong>{money(equity)}</strong></div>
          <div><span>Available cash</span><strong>{money(account.cash)}</strong></div>
          <div><span>Realized P&L · after estimated fees</span><strong className={realized < 0 ? 'negative' : 'positive'}>{money(realized)}</strong></div>
          <div><span>Process edge</span><strong>{edge.score}<small> / 100</small></strong></div>
        </section>

        {tab === 'Market' ? <MarketOverview context={coachContext} selectedSymbol={symbol} onSelectSymbol={setSymbol} onPractice={nextSymbol => { setSymbol(nextSymbol); setTab('Practice'); setMessage(`Opened ${nextSymbol} in the market lab.`); }}/>
          : tab === 'Practice' ? <>
            <div className="practice-grid">
              <section className="market-panel">
                <div className="panel-heading"><h2>Market lab</h2><span className="muted">5-minute candles · IST</span></div>
                <div className="scenario-bar">
                  <label htmlFor="scenario">Replay scenario</label>
                  <select id="scenario" value={scenarioId} disabled={!!p} onChange={e => changeScenario(e.target.value)}>{SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  <p className="fine">{scenario.teaching}</p>
                </div>
                <div className="watchlist" aria-label="Select practice stock">{SYMBOLS.map(s => <button key={s.symbol} aria-pressed={symbol === s.symbol} className={symbol === s.symbol ? 'stock selected' : 'stock'} disabled={!!p && s.symbol !== p.symbol} onClick={() => { setSymbol(s.symbol); setMessage(''); }}><strong>{s.symbol}</strong><span>{money(candlesFor(s.symbol, scenarioId)[index - 1].close)}</span></button>)}</div>
                <div className="quote"><div><h3>{SYMBOLS.find(s => s.symbol === symbol).name}</h3><span>Fictional session · {last.time} IST</span></div><strong>{money(last.close)}</strong></div>
                <Chart bars={bars} position={p}/>
                <div className="replay-controls"><span>Reveal one candle.<br/><strong>Make your next decision.</strong></span><button className="primary" onClick={advance} disabled={index >= 72}>{index >= 72 ? 'Replay complete' : 'Next candle'}<Icon/></button></div>
                <div className="setup">
                  <div className="panel-heading"><h2>{setupTitle}</h2><span className={setup.qualified ? 'status qualified' : 'status'}>{setup.qualified ? `${setup.strategy} ready` : 'Wait for confirmation'}</span></div>
                  <p className="muted">Long-only teaching rules. Breakout and pullback use different checklists.</p>
                  {setup.conditions.map(c => <div className="condition" key={c.label}><span className={c.passed ? 'check passed' : 'check'}>{c.passed ? <Icon type="check"/> : <span className="wait-dot"/>}</span><div><strong>{c.label}</strong><small>{c.detail}</small></div><span className="condition-result">{c.passed ? 'Met' : 'Waiting'}</span></div>)}
                </div>
                {!p && <CompareChoice setup={setup} riskPercent={Number(risk)} onResolved={onDecision}/>}
              </section>

              <aside className="trade-panel">
                <div className="panel-heading"><h2>{p ? 'Your open position' : 'Plan your practice trade'}</h2><Icon type="book"/></div>
                <p className="muted">{p ? 'Manage the open paper trade.' : 'Start with what you can lose.'}</p>
                {p ? <>
                  <span className="status qualified">{p.symbol} · {p.quantity} shares · {p.strategy || 'breakout'}</span>
                  <dl>
                    <div><dt>Entry price</dt><dd>{money(p.entry)}</dd></div>
                    <div><dt>Stop loss</dt><dd>{money(p.stop)}</dd></div>
                    <div><dt>Target</dt><dd>{money(p.target)}</dd></div>
                    <div><dt>Unrealized P&L, before fees</dt><dd>{money((mark - p.entry) * p.quantity)}</dd></div>
                  </dl>
                  <HeatMeter entry={p.entry} stop={p.stop} target={p.target} mark={mark}/>
                  <button className="primary full" onClick={close}>Close paper position</button>
                  <p className="fine">Stops and targets are checked when you reveal the next candle.</p>
                </> : <>
                  <label className="field-label" htmlFor="risk">Risk budget <span>% of available cash</span></label>
                  <select id="risk" value={risk} onChange={e => setRisk(e.target.value)}><option value="0.25">0.25% · Cautious</option><option value="0.5">0.5% · Balanced</option><option value="1">1% · Higher risk</option></select>
                  <dl>
                    <div><dt>Illustrative entry</dt><dd>{money(setup.entry)}</dd></div>
                    <div><dt>Stop loss</dt><dd>{money(setup.stop)}</dd></div>
                    <div><dt>Target</dt><dd>{money(setup.target)}</dd></div>
                    <div><dt>Reward / risk, before fees</dt><dd>2 : 1</dd></div>
                  </dl>
                  <div className="sizing"><div><span>Position size</span><strong>{quantity} <small>shares</small></strong></div><div><span>Planned stop loss, with fees</span><strong>{money(plannedLoss)}</strong></div></div>
                  <RiskPreview preview={preview}/>
                  {pendingDecision && <p className={`entry-status ${pendingDecision.agreed ? '' : 'warn'}`} role="status">Last drill: you chose {pendingDecision.userChoice.replace('_', ' ')} · rulebook {pendingDecision.bookAction.replace('_', ' ')}</p>}
                  <FrictionGate stop={setup.stop} disabled={!setup.qualified || !quantity || index >= 72} onConfirm={enterWithFriction} label="Place paper trade"/>
                  <p className="fine">{setup.qualified ? 'Cool down, type the stop, then enter at the displayed close.' : 'Wait for setup conditions — or log waits by advancing candles.'} Invalid waits: {account.waitsSkipped || 0}.</p>
                </>}
                <section className="coach">
                  <div className="coach-title"><span className="coach-symbol"><Icon type="book"/></span><h3>Coach’s note</h3></div>
                  <p>{p ? 'Your plan is set. Let the replay unfold. A losing trade that follows a sensible plan can teach more than an impulsive winning trade.' : setup.qualified ? `This example meets the ${setup.strategy} rules. Complete compare-your-choice and friction before you act.` : `Waiting is a trading decision too. ${scenario.lesson}`}</p>
                  <button className="text-button" onClick={() => setTab('Coach')}>Explore with the coach <Icon/></button>
                </section>
              </aside>
            </div>
            <div className="session-footer">
              <span>Estimated fees: 0.10% per side. Spread, slippage and actual NSE charges are not modeled.</span>
              <div>
                <button className="text-button" onClick={reset}>{resetArmed ? 'Confirm reset & clear journal' : 'Reset practice'}</button>
                {resetArmed && <button className="text-button" onClick={() => setResetArmed(false)}>Cancel</button>}
              </div>
            </div>
          </>
            : tab === 'Coach' ? <CoachPanel context={coachContext} onPractice={() => setTab('Practice')} onJournal={() => setTab('Journal')} onEnter={enterGuided} onRiskChange={setRisk}/>
              : tab === 'Journal' ? <JournalPanel account={account} scenarioId={scenarioId} onReview={saveReview} onQuiz={saveQuiz} onPractice={() => setTab('Coach')}/>
                : <section className="guide"><h2>Your decision-making playbook</h2>{[
                  ['Read the board', 'Use Market overview for session change, volume, and setup readiness across symbols before you tunnel into one chart.'],
                  ['Compare your choice', 'On every practice setup, pick Enter / Wait / Reduce risk, then reveal the teaching rulebook answer.'],
                  ['Fear & greed friction', 'Wait 10 seconds and type the exact stop price before any paper entry — in Practice or Coach.'],
                  ['Replay the decision', 'After exit, scrub the Decision replay theater in Journal. Mistake detector flags process errors, not bad luck.'],
                  ['Read process charts', 'Process Edge, pie charts, and equity curve measure discipline. Synthetic P&L is not live-market proof.'],
                  ['Size from risk', 'Shares follow cash and risk budget with fee estimates. Never size from a daily income target.'],
                ].map(([title, body], i) => <article key={title}><span className="step">{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}<button className="primary" onClick={() => setTab('Practice')}>Practice the process<Icon/></button></section>}

        <div className="message" role="status" aria-live="polite">{message}</div>
        <footer>Built for deliberate practice. No guaranteed income. No real orders. Session resets on reload; no local storage.</footer>
      </main>
    </div>
  </div>;
}
