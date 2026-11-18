'use client';
import { PieChart, BarChart, EdgeGauge, EquityChart } from './Charts';
import { processEdgeScore, equitySeries, summarizeMistakes } from '../lib/process';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function StatsDashboard({ account }) {
  const edge = processEdgeScore(account);
  const equity = equitySeries(account);
  const mistakes = summarizeMistakes(account.trades || []);
  const scorecard = edge.scorecard;

  return <section className="stats-dashboard" aria-label="Process statistics">
    <div className="panel-heading"><h3>Process stats</h3><span className="status">Charts · not live P&amp;L advice</span></div>
    <div className="stats-hero">
      <EdgeGauge score={edge.score} label={edge.label}/>
      <div className="stats-hero-copy">
        <p>We grade decision quality, not luck. Plans, waits, quizzes, rulebook drills, and mistake flags all feed this score.</p>
        <dl>
          <div><dt>Rulebook drills matched</dt><dd>{edge.decisionsAgreed}/{edge.decisionsTotal || 0}</dd></div>
          <div><dt>Process flags</dt><dd>{mistakes.total}</dd></div>
          <div><dt>Waits logged</dt><dd>{scorecard.waitsSkipped}</dd></div>
        </dl>
      </div>
    </div>
    <div className="stats-grid">
      <PieChart
        title="Trade outcomes"
        slices={[
          { label: 'Wins', value: scorecard.wins, color: 'var(--green)' },
          { label: 'Losses', value: scorecard.losses, color: 'var(--red)' },
          { label: 'Flat', value: scorecard.breakeven, color: '#c5b283' },
        ]}
      />
      <PieChart
        title="Mistake severity"
        slices={[
          { label: 'High', value: mistakes.high, color: 'var(--red)' },
          { label: 'Medium', value: mistakes.medium, color: '#6b5625' },
          { label: 'Low', value: mistakes.low, color: '#8e9c92' },
        ]}
      />
      <BarChart
        title="Edge ingredients"
        bars={[
          { label: 'Plans', value: edge.parts.plans, display: `${edge.parts.plans}%`, color: 'var(--green)' },
          { label: 'Followed', value: edge.parts.followed, display: `${edge.parts.followed}%`, color: '#3f7a55' },
          { label: 'Waits', value: edge.parts.waits, display: `${edge.parts.waits}`, color: '#6b8f3a' },
          { label: 'Quizzes', value: edge.parts.quizzes, display: `${edge.parts.quizzes}%`, color: '#23664b' },
          { label: 'Drills', value: edge.parts.decisions, display: `${edge.parts.decisions}%`, color: '#182e29' },
        ]}
      />
      <EquityChart points={equity} title={`Equity · ${money(scorecard.netPnl)} net`}/>
    </div>
  </section>;
}
