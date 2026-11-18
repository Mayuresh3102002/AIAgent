'use client';
import { useState } from 'react';
import { marketOverview } from '../lib/coach';
import { SCENARIOS } from '../lib/engine';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
const compactVolume = value => {
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
  return String(value);
};

function Sparkline({ values, up }) {
  if (!values?.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.01);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 28 - ((value - min) / span) * 24;
    return `${x},${y}`;
  }).join(' ');
  return <svg className="sparkline" viewBox="0 0 100 32" aria-hidden="true"><polyline fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="2" points={points}/></svg>;
}

export default function MarketOverview({ context, selectedSymbol, onSelectSymbol, onPractice }) {
  const overview = marketOverview(context);
  const [focus, setFocus] = useState(selectedSymbol || overview.rows[0]?.symbol);
  const active = overview.rows.find(row => row.symbol === focus) || overview.rows[0];
  const scenario = SCENARIOS.find(item => item.id === overview.scenarioId);

  function choose(symbol) {
    setFocus(symbol);
    onSelectSymbol?.(symbol);
  }

  return <section className="market-overview" aria-label="Market overview">
    <div className="panel-heading">
      <h2>Market overview</h2>
      <span className="status">Synthetic · {overview.time} IST</span>
    </div>
    <p className="muted overview-lead">Watchlist for the current replay. {overview.candlesRevealed} of 72 five-minute candles revealed · scenario: {scenario?.name || overview.scenarioId}.</p>

    <div className="overview-strip" aria-label="Session breadth">
      <div><span>Advancers</span><strong className="positive">{overview.breadth.advancing}</strong></div>
      <div><span>Decliners</span><strong className="negative">{overview.breadth.declining}</strong></div>
      <div><span>Setups ready</span><strong>{overview.breadth.readySetups}</strong></div>
      <div><span>Top move</span><strong className={overview.topGainer?.changePercent >= 0 ? 'positive' : 'negative'}>{overview.topGainer ? `${overview.topGainer.symbol} ${overview.topGainer.changePercent >= 0 ? '+' : ''}${overview.topGainer.changePercent}%` : '—'}</strong></div>
    </div>

    <p className="table-hint">Scroll sideways to see all market columns.</p>
    <div className="table-scroll" role="region" aria-label="Stock market table" tabIndex={0}>
      <table className="market-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>LTP</th>
            <th>Change</th>
            <th>Open</th>
            <th>High</th>
            <th>Low</th>
            <th>Volume</th>
            <th>Setup</th>
            <th>Session</th>
          </tr>
        </thead>
        <tbody>
          {overview.rows.map(row => {
            const up = row.change >= 0;
            return <tr key={row.symbol} className={row.symbol === active?.symbol ? 'selected' : undefined}>
              <td>
                <button type="button" className="text-button" aria-pressed={row.symbol === active?.symbol} onClick={() => choose(row.symbol)}>
                  {row.symbol}
                </button>
                <small>{row.name}</small>
              </td>
              <td>{money(row.price)}</td>
              <td className={up ? 'positive' : 'negative'}>{up ? '+' : ''}{row.change.toFixed(2)} ({up ? '+' : ''}{row.changePercent}%)</td>
              <td>{money(row.sessionOpen)}</td>
              <td>{money(row.sessionHigh)}</td>
              <td>{money(row.sessionLow)}</td>
              <td>{compactVolume(row.volume)}</td>
              <td>{row.qualified ? <span className="status qualified">{row.strategy} · {row.checksPassed}/3</span> : <span className="status">Wait · {row.checksPassed}/3</span>}</td>
              <td><Sparkline values={row.spark} up={up}/></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {active && <div className="overview-detail">
      <div>
        <div className="panel-heading"><h3>{active.name}</h3><span className={active.qualified ? 'status qualified' : 'status'}>{active.qualified ? `${active.strategy} ready` : 'Waiting'}</span></div>
        <dl className="overview-stats">
          <div><dt>Last traded</dt><dd>{money(active.price)}</dd></div>
          <div><dt>Last candle</dt><dd>O {money(active.open)} · H {money(active.high)} · L {money(active.low)}</dd></div>
          <div><dt>Session range</dt><dd>{money(active.sessionLow)} – {money(active.sessionHigh)}</dd></div>
          <div><dt>Last bar volume</dt><dd>{compactVolume(active.lastVolume)}</dd></div>
          <div><dt>Avg bar volume</dt><dd>{compactVolume(active.avgVolume)}</dd></div>
          <div><dt>20-bar average</dt><dd>{active.average ? money(active.average) : '—'}</dd></div>
          <div><dt>Prior 10-bar high</dt><dd>{active.priorHigh ? money(active.priorHigh) : '—'}</dd></div>
          <div><dt>Teaching stop / target</dt><dd>{active.stop && active.target ? `${money(active.stop)} / ${money(active.target)}` : '—'}</dd></div>
        </dl>
        <div className="overview-conditions">
          {active.conditions?.map(condition => <div className="condition" key={condition.label}>
            <span className={condition.passed ? 'check passed' : 'check'}>{condition.passed ? '✓' : '·'}</span>
            <div><strong>{condition.label}</strong><small>{condition.detail}</small></div>
          </div>)}
        </div>
      </div>
      <aside>
        <h3>What this board is</h3>
        <p className="lesson-intro">{overview.notice}</p>
        <p className="fine">{scenario?.teaching}</p>
        <button className="primary full" type="button" onClick={() => { choose(active.symbol); onPractice?.(active.symbol); }}>Practice {active.symbol}</button>
      </aside>
    </div>}
  </section>;
}
