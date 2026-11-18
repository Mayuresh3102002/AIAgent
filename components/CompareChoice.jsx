'use client';
import { useState } from 'react';
import { compareChoice } from '../lib/process';

const CHOICES = [
  { id: 'enter', label: 'Enter', detail: 'Take the paper trade now' },
  { id: 'wait', label: 'Wait', detail: 'Skip — rules incomplete or unclear' },
  { id: 'reduce_risk', label: 'Reduce risk', detail: 'Setup ok, but cut the risk budget' },
];

export default function CompareChoice({ setup, riskPercent, onResolved }) {
  const [result, setResult] = useState(null);

  function pick(userChoice) {
    const comparison = compareChoice(userChoice, setup, riskPercent);
    setResult(comparison);
    onResolved?.(comparison);
  }

  return <section className="compare-choice" aria-label="Compare your choice">
    <div className="panel-heading"><h3>Compare your choice</h3><span className="status">Rulebook drill</span></div>
    <p className="fine">Decide first. Then see what the strict teaching rulebook would do. This does not place a trade.</p>
    <div className="choice-grid">
      {CHOICES.map(choice => <button key={choice.id} type="button" className="choice-card" onClick={() => pick(choice.id)}>
        <strong>{choice.label}</strong>
        <span>{choice.detail}</span>
      </button>)}
    </div>
    {result && <div className={`compare-result ${result.agreed ? 'agreed' : 'disagreed'}`} role="status">
      <p><strong>{result.agreed ? 'You matched the rulebook.' : 'You differed from the rulebook.'}</strong></p>
      <p>You chose <em>{result.userChoice.replace('_', ' ')}</em>. Rulebook: <em>{result.bookAction.replace('_', ' ')}</em>.</p>
      <p className="fine">{result.bookReason}</p>
    </div>}
  </section>;
}
