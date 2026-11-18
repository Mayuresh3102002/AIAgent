'use client';
import { useMemo, useState } from 'react';
import { tradeReplayFrames, detectMistakes } from '../lib/process';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

function MiniChart({ bars, position }) {
  if (!bars?.length) return null;
  const visible = bars.slice(-28);
  const levels = position ? [position.stop, position.target, position.entry] : [];
  const min = Math.min(...visible.map(c => c.low), ...levels) - 2;
  const max = Math.max(...visible.map(c => c.high), ...levels) + 2;
  const y = p => 18 + ((max - p) / (max - min)) * 140;
  const x = i => 16 + i * 14;
  return <svg className="replay-chart" viewBox="0 0 420 190" role="img" aria-label="Decision replay chart">
    {visible.map((c, i) => <g key={c.index} fill={c.close >= c.open ? 'var(--green)' : 'var(--red)'} stroke={c.close >= c.open ? 'var(--green)' : 'var(--red)'}>
      <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)}/>
      <rect x={x(i) - 3} y={Math.min(y(c.open), y(c.close))} width="6" height={Math.max(1, Math.abs(y(c.open) - y(c.close)))}/>
    </g>)}
    {position && [['STOP', position.stop, 'var(--red)'], ['ENTRY', position.entry, 'var(--ink)'], ['TARGET', position.target, 'var(--green)']].map(([label, price, color]) =>
      <g key={label}><line x1="8" x2="400" y1={y(price)} y2={y(price)} stroke={color} strokeDasharray="4 3"/><text x="10" y={y(price) - 4} fill={color} fontSize="9">{label}</text></g>)}
  </svg>;
}

export default function ReplayTheater({ trade, scenarioId }) {
  const frames = useMemo(() => tradeReplayFrames(trade, scenarioId), [trade, scenarioId]);
  const [frameIndex, setFrameIndex] = useState(() => Math.max(0, frames.findIndex(frame => frame.phase === 'entry')));
  const frame = frames[frameIndex] || frames[0];
  const mistakes = detectMistakes(trade || {});
  if (!trade || !frame) return null;

  return <section className="replay-theater" aria-label="Decision replay theater">
    <div className="panel-heading"><h3>Decision replay theater</h3><span className="status qualified">{frame.phase}</span></div>
    <p className="lesson-intro">{frame.note}</p>
    <MiniChart bars={frame.bars} position={{ entry: trade.entry, stop: trade.stop, target: trade.target }}/>
    <div className="replay-controls-bar">
      <button type="button" className="text-button" disabled={frameIndex <= 0} onClick={() => setFrameIndex(i => Math.max(0, i - 1))}>Previous bar</button>
      <strong>{frame.time} IST · candle {frame.index + 1}</strong>
      <button type="button" className="text-button" disabled={frameIndex >= frames.length - 1} onClick={() => setFrameIndex(i => Math.min(frames.length - 1, i + 1))}>Next bar</button>
    </div>
    <input className="replay-scrubber" type="range" min={0} max={Math.max(frames.length - 1, 0)} value={frameIndex} onChange={event => setFrameIndex(Number(event.target.value))} aria-label="Scrub replay"/>
    <dl className="overview-stats">
      <div><dt>Result</dt><dd className={trade.pnl < 0 ? 'negative' : 'positive'}>{money(trade.pnl)}</dd></div>
      <div><dt>Exit reason</dt><dd>{trade.reason}</dd></div>
      <div><dt>Plan</dt><dd>{trade.plan ? 'Written' : 'Missing'}</dd></div>
      <div><dt>Friction</dt><dd>{trade.friction ? 'Completed' : 'Skipped'}</dd></div>
    </dl>
    {trade.plan?.thesis && <blockquote className="saved-thesis">{trade.plan.thesis}</blockquote>}
    <div className="mistake-list">
      <h4>Mistake detector</h4>
      {!mistakes.length ? <p className="fine">No process flags on this trade. Still review whether the evidence justified entry.</p>
        : mistakes.map(item => <article key={item.id} className={`mistake ${item.severity}`}><strong>{item.label}</strong><p>{item.detail}</p></article>)}
    </div>
  </section>;
}
