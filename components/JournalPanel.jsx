'use client';
import { useState } from 'react';
import {
  learningProgress,
  reviewPrompt,
  validateReflection,
  buildQuiz,
  gradeQuiz,
  sessionScorecard,
  exportJournalJson,
  exportJournalMarkdown,
  downloadText,
} from '../lib/learning';
import { reviewJournal } from '../lib/coach';
import { detectMistakes } from '../lib/process';
import StatsDashboard from './StatsDashboard';
import ReplayTheater from './ReplayTheater';

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

function TradeQuiz({ trade, onGrade }) {
  const quiz = buildQuiz(trade);
  const [answers, setAnswers] = useState(trade.quiz?.answers || {});
  const [error, setError] = useState('');
  const result = trade.quiz;
  function submit(event) {
    event.preventDefault();
    try {
      const graded = gradeQuiz(trade, answers);
      onGrade(trade.id, graded);
      setError('');
    } catch (cause) { setError(cause.message); }
  }
  return <form className="learning-form quiz-form" onSubmit={submit} noValidate>
    <div className="panel-heading"><h4>Post-trade quiz</h4><span className="status">Transparent answers</span></div>
    <p className="fine">Check understanding of this trade. Correct answers and explanations appear after you submit.</p>
    {quiz.map(question => <fieldset key={question.id} className="quiz-question">
      <legend>{question.prompt}</legend>
      {question.options.map(option => <label key={option.id}><input type="radio" name={question.id} checked={answers[question.id] === option.id} disabled={!!result} onChange={() => setAnswers(previous => ({ ...previous, [question.id]: option.id }))}/><span>{option.label}</span></label>)}
    </fieldset>)}
    {error && <p className="error" role="alert">{error}</p>}
    {!result && <button className="primary">Check answers</button>}
    {result && <div className="quiz-result" role="status">
      <p><strong>Score {result.score} / {result.total}</strong></p>
      {result.details.map(item => <article key={item.id} className={item.correct ? 'quiz-pass' : 'quiz-fail'}><strong>{item.correct ? 'Correct' : 'Review'}</strong><span>{item.prompt}</span><p>{item.explanation}</p></article>)}
    </div>}
  </form>;
}

export default function JournalPanel({ account, scenarioId = 'classic', onReview, onQuiz, onPractice }) {
  const [selectedId, setSelectedId] = useState(null);
  const trade = account.trades.find(item => item.id === selectedId) || account.trades[0];
  const progress = learningProgress(account.trades);
  const summary = reviewJournal({ account });
  const scorecard = sessionScorecard(account);
  const tradeMistakes = trade ? detectMistakes(trade) : [];

  function exportMarkdown() {
    downloadText(`aiagent-journal-${Date.now()}.md`, exportJournalMarkdown(account), 'text/markdown');
  }
  function exportJson() {
    downloadText(`aiagent-journal-${Date.now()}.json`, exportJournalJson(account), 'application/json');
  }

  return <section className="journal">
    <div className="panel-heading"><h2>Trade journal</h2><span>{account.trades.length} completed {account.trades.length === 1 ? 'trade' : 'trades'}</span></div>
    <StatsDashboard account={account}/>
    <div className="export-row journal-export">
      <button className="text-button" type="button" onClick={exportMarkdown}>Export Markdown</button>
      <button className="text-button" type="button" onClick={exportJson}>Export JSON</button>
    </div>
    {!trade ? <div className="empty"><h3>Your first lesson starts with a trade.</h3><p>Use Compare your choice, then friction entry in Practice or Coach. Waiting on invalid setups also improves your edge score.</p><button className="primary" onClick={onPractice}>Open guided practice</button></div> : <>
      <dl className="journal-summary"><div><dt>Written plans</dt><dd>{progress.planned} / {progress.completed}</dd></div><div><dt>Reflections saved</dt><dd>{progress.reviewed} / {progress.completed}</dd></div><div><dt>Quizzes saved</dt><dd>{progress.quizzed} / {progress.completed}</dd></div><div><dt>Wins / losses / breakeven</dt><dd>{summary.wins} / {summary.losses} / {summary.breakeven}</dd></div></dl>
      <p className="table-hint">Scroll the trade table sideways to see all columns.</p>
      <div className="table-scroll" role="region" aria-label="Completed trades, scroll horizontally for all columns" tabIndex={0}>
        <table><thead><tr><th>Trade</th><th>Entry → Exit</th><th>Exit reason</th><th>Net P&L</th><th>Flags</th></tr></thead>
          <tbody>{account.trades.map(item => {
            const flags = detectMistakes(item).length;
            return <tr key={item.id}><td><button className="text-button" aria-pressed={trade.id === item.id} onClick={() => setSelectedId(item.id)}>Review {item.symbol} #{item.id}</button><small>{item.quantity} shares · {item.strategy || 'breakout'} · {item.plan ? 'Written plan' : 'Quick entry'}</small></td><td>{money(item.entry)} → {money(item.exit)}</td><td>{item.reason}</td><td className={item.pnl < 0 ? 'negative' : 'positive'}>{money(item.pnl)}</td><td>{flags ? `${flags} flags` : 'Clean'}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <ReplayTheater trade={trade} scenarioId={scenarioId}/>
      <div className="trade-review">
        <div>
          <h3>Review {trade.symbol} #{trade.id}</h3>
          <p className="lesson-intro">{reviewPrompt(trade)}</p>
          {trade.plan ? <><h4>Your original reasoning</h4><blockquote className="saved-thesis">{trade.plan.thesis}</blockquote><dl><div><dt>Original planned loss</dt><dd>{money(trade.plan.plannedLoss)}</dd></div><div><dt>Actual net result</dt><dd>{money(trade.pnl)}</dd></div><div><dt>Session expectancy</dt><dd>{scorecard.expectancy == null ? '—' : money(scorecard.expectancy)}</dd></div></dl></> : <p className="fine">No written plan was saved before entry.</p>}
          <div className="mistake-list compact">
            <h4>Flags on this trade</h4>
            {!tradeMistakes.length ? <p className="fine">No process flags.</p>
              : tradeMistakes.map(item => <article key={item.id} className={`mistake ${item.severity}`}><strong>{item.label}</strong><p>{item.detail}</p></article>)}
          </div>
          <TradeQuiz key={`quiz-${trade.id}`} trade={trade} onGrade={onQuiz}/>
        </div>
        <ReflectionForm key={trade.id} trade={trade} onSave={onReview}/>
      </div>
    </>}
    <p className="fine">Plans, reflections, quizzes, replays, and exports stay in memory only. Reloading or resetting clears them. No local storage.</p>
  </section>;
}
