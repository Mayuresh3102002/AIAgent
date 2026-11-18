'use client';
import { useEffect, useState } from 'react';
import { scanMarket, practiceBrief, riskPlan } from '../lib/coach';
import { planChecksFor, createTradePlan } from '../lib/learning';
import RiskPreview from './RiskPreview';
import FrictionGate from './FrictionGate';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export default function CoachPanel({ context, onPractice, onJournal, onEnter, onRiskChange }) {
  const [topic, setTopic] = useState('setup');
  const [thesis, setThesis] = useState('');
  const [checks, setChecks] = useState({});
  const [error, setError] = useState('');
  const scan = scanMarket(context);
  const plan = riskPlan(context);
  const position = context.account.position;
  const checklist = planChecksFor(plan.strategy || position?.strategy);
  useEffect(() => { setChecks({}); setError(''); }, [context.symbol, context.index, context.riskPercent, context.scenarioId, plan.strategy]);

  function confirmEntry(friction) {
    try {
      createTradePlan(context, { thesis, checks });
      onEnter({ thesis, checks, friction });
      setError('');
    } catch (cause) { setError(cause.message); }
  }

  return <section className="agent-workspace" aria-label="Guided trading practice">
    <div className="agent-tools">
      <div className="panel-heading"><h2>Evidence desk</h2><span className="status">Rule-based guidance</span></div>
      <p className="muted">Calculated from the {context.index} candles revealed so far. No model, API key, or future candles.</p>
      <div className="agent-scan"><h3>Setup scanner</h3>
        {scan.map(row => <div className="scan-row" key={row.symbol}><div><strong>{row.symbol}</strong><small>{row.time} IST · {row.price.toFixed(2)}{row.strategy ? ` · ${row.strategy}` : ''}</small></div><div><strong>{row.checksPassed} / 3 checks</strong><small>{row.qualified ? 'Rules met' : 'Wait'}</small></div></div>)}
        <p className="fine">Checks met are not a win probability. Prices are synthetic teaching examples.</p>
      </div>
      <h3>Inspect the decision</h3>
      <div className="topic-buttons" aria-label="Practice tool">{[['setup', 'Explain setup'], ['risk', 'Check my risk'], ['journal', 'Review journal']].map(([key, label]) => <button key={key} aria-pressed={topic === key} onClick={() => setTopic(key)}>{label}</button>)}</div>
      <div className="practice-answer" aria-live="polite"><span>Calculated practice guide</span><p>{practiceBrief(context, topic)}</p></div>
      <button className="text-button" onClick={onPractice}>Return to the market lab</button>
    </div>

    <div className="lesson-panel">
      <div className="panel-heading"><h2>{position ? 'Follow your plan' : 'Plan before you enter'}</h2><span className="status qualified">No key required</span></div>
      <ol className="learning-steps" aria-label="Learning cycle"><li className={!position ? 'current' : ''}>Plan</li><li className={position ? 'current' : ''}>Practice</li><li>Review</li></ol>
      {position ? <>
        <p className="lesson-intro">Your {position.symbol} paper position is open{position.strategy ? ` (${position.strategy})` : ''}. Compare what happens next with the reasoning you recorded.</p>
        {position.plan ? <blockquote className="saved-thesis">{position.plan.thesis}</blockquote> : <p className="fine">This trade was entered without a written plan. Try guided entry for your next trade.</p>}
        <dl><div><dt>Position</dt><dd>{position.quantity} shares</dd></div><div><dt>Stop loss</dt><dd>{money(plan.stop)}</dd></div><div><dt>Planned entry-to-stop loss, with fees</dt><dd>{money(plan.plannedLoss)}</dd></div><div><dt>Illustrative gap loss</dt><dd>{money(plan.gapLoss)}</dd></div></dl>
        <p className="fine">Gap losses can be larger. Advancing the replay checks the stop and target.</p>
        <button className="primary full" onClick={onPractice}>Manage paper position</button>
      </> : <div className="learning-form" onChange={() => setError('')}>
        <p className="lesson-intro">Turn the setup into a decision you can explain. Checklist items change with the active strategy ({plan.strategy || 'waiting'}).</p>
        <label htmlFor="guided-risk">Risk budget</label>
        <select id="guided-risk" value={context.riskPercent} onChange={event => onRiskChange(event.target.value)}><option value="0.25">0.25% of available cash</option><option value="0.5">0.5% of available cash</option><option value="1">1% of available cash</option></select>
        <dl className="plan-numbers"><div><dt>Entry / stop</dt><dd>{money(plan.entry)} / {money(plan.stop)}</dd></div><div><dt>Target</dt><dd>{money(plan.target)}</dd></div><div><dt>Position size</dt><dd>{plan.quantity} shares</dd></div><div><dt>Planned loss including estimated fees</dt><dd>{money(plan.plannedLoss)}</dd></div></dl>
        <RiskPreview preview={plan} compact />
        <fieldset className="plan-checks"><legend>Before placing the trade · {plan.strategy === 'pullback' ? 'Pullback checklist' : 'Breakout checklist'}</legend>{checklist.map(check => <label key={check.id}><input type="checkbox" checked={!!checks[check.id]} onChange={event => setChecks(previous => ({ ...previous, [check.id]: event.target.checked }))}/><span>{check.label}</span></label>)}</fieldset>
        <label htmlFor="trade-thesis">Why is this setup worth practicing?</label>
        <textarea id="trade-thesis" value={thesis} onChange={event => setThesis(event.target.value)} maxLength={500} rows={4} placeholder="Describe the evidence you see and what would prove your idea wrong." aria-describedby="thesis-help"/>
        <p className="fine" id="thesis-help">20–500 characters · {thesis.trim().length} written. Your draft resets if you leave this screen before entering.</p>
        {!plan.canEnter && <p className="entry-status" role="status">{context.index >= 72 ? 'This replay is complete. Review your session or reset practice.' : 'Wait for a qualifying breakout or pullback setup and enough cash before entering.'}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <FrictionGate stop={plan.stop} disabled={!plan.canEnter} onConfirm={confirmEntry} label="Save plan & place paper trade"/>
        <p className="fine">Friction is required: cool down, type the stop, then enter. Estimated fees apply; gap losses may exceed the plan.</p>
      </div>}
      <div className="lesson-next"><h3>Close the learning loop</h3><p>After the exit, open Journal for replay theater, mistake flags, charts, and reflection.</p><button className="text-button" onClick={onJournal}>Open your trade reviews</button></div>
    </div>
  </section>;
}
