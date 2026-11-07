'use client';
import { useState } from 'react';
import { learningProgress, reviewPrompt, validateReflection } from '../lib/learning';
import { reviewJournal } from '../lib/coach';
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

function ReflectionForm({ trade, onSave }) {
  const [draft, setDraft] = useState(trade.reflection || { followedPlan: '', lesson: '', nextStep: '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  function change(key, value) { setDraft(previous => ({ ...previous, [key]: value })); setSaved(false); }
  function submit(event) {
    event.preventDefault();
    try { onSave(trade.id, validateReflection(draft)); setError(''); setSaved(true); }
    catch (cause) { setError(cause.message); }
  }
  return <form className="learning-form reflection-form" onSubmit={submit} onChange={() => setError('')} noValidate>
    <label htmlFor="followed-plan">Did you follow your intended entry and exit plan?</label>
    <select id="followed-plan" value={draft.followedPlan} onChange={event => change('followedPlan', event.target.value)}><option value="">Choose an answer</option><option value="yes">Yes</option><option value="no">No</option><option value="unsure">I’m not sure</option></select>
    <label htmlFor="trade-lesson">What did you learn?</label><textarea id="trade-lesson" rows={3} maxLength={500} value={draft.lesson} onChange={event => change('lesson', event.target.value)}/>
    <label htmlFor="next-step">What will you do next time?</label><textarea id="next-step" rows={3} maxLength={500} value={draft.nextStep} onChange={event => change('nextStep', event.target.value)}/>
    <p className="fine">Write 10–500 characters for each reflection. Only saved reflections stay with the trade when you change screens.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary">{trade.reflection ? 'Update reflection' : 'Save reflection'}</button>
    <p className="review-status" role="status">{saved ? 'Reflection saved for this session.' : ''}</p>
  </form>;
}

export default function JournalPanel({ account, onReview, onPractice }) {
  const [selectedId, setSelectedId] = useState(null);
  const trade = account.trades.find(item => item.id === selectedId) || account.trades[0];
  const progress = learningProgress(account.trades);
  const summary = reviewJournal({ account });
  return <section className="journal">
    <div className="panel-heading"><h2>Trade journal</h2><span>{account.trades.length} completed {account.trades.length === 1 ? 'trade' : 'trades'}</span></div>
    {!trade ? <div className="empty"><h3>Your first lesson starts with a trade.</h3><p>Write a plan in Coach, place a paper trade, then return after its exit.</p><button className="primary" onClick={onPractice}>Open guided practice</button></div> : <>
      <dl className="journal-summary"><div><dt>Written plans</dt><dd>{progress.planned} / {progress.completed}</dd></div><div><dt>Reflections saved</dt><dd>{progress.reviewed} / {progress.completed}</dd></div><div><dt>Wins / losses / breakeven</dt><dd>{summary.wins} / {summary.losses} / {summary.breakeven}</dd></div><div><dt>Estimated fees</dt><dd>{money(summary.estimatedFees)}</dd></div></dl>
      <p className="table-hint">Scroll the trade table sideways to see all columns.</p><div className="table-scroll" role="region" aria-label="Completed trades, scroll horizontally for all columns" tabIndex={0}><table><thead><tr><th>Trade</th><th>Entry → Exit</th><th>Exit reason</th><th>Net P&L</th><th>Reflection</th></tr></thead><tbody>{account.trades.map(item => <tr key={item.id}><td><button className="text-button" aria-pressed={trade.id === item.id} onClick={() => setSelectedId(item.id)}>Review {item.symbol} #{item.id}</button><small>{item.quantity} shares · {item.plan ? 'Written plan' : 'Quick entry'}</small></td><td>{money(item.entry)} → {money(item.exit)}</td><td>{item.reason}</td><td className={item.pnl < 0 ? 'negative' : 'positive'}>{money(item.pnl)}</td><td>{item.reflection ? 'Saved' : 'To review'}</td></tr>)}</tbody></table></div>
      <div className="trade-review"><div><h3>Review {trade.symbol} #{trade.id}</h3><p className="lesson-intro">{reviewPrompt(trade)}</p>{trade.plan ? <><h4>Your original reasoning</h4><blockquote className="saved-thesis">{trade.plan.thesis}</blockquote><dl><div><dt>Original planned loss</dt><dd>{money(trade.plan.plannedLoss)}</dd></div><div><dt>Actual net result</dt><dd>{money(trade.pnl)}</dd></div></dl></> : <p className="fine">No written plan was saved before entry.</p>}</div><ReflectionForm key={trade.id} trade={trade} onSave={onReview}/></div>
    </>}
    <p className="fine">Plans and reflections stay in memory only. Reloading, closing the page, or resetting practice clears them. No local storage. Synthetic results are not a strategy performance record.</p>
  </section>;
}
