'use client';

export function PieChart({ slices, size = 160, title = 'Distribution' }) {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0) || 1;
  let angle = -90;
  const paths = slices.map(slice => {
    const portion = (Math.max(0, slice.value) / total) * 360;
    const start = angle;
    angle += portion;
    const end = angle;
    const large = portion > 180 ? 1 : 0;
    const rad = deg => (deg * Math.PI) / 180;
    const r = 60;
    const x1 = 80 + r * Math.cos(rad(start));
    const y1 = 80 + r * Math.sin(rad(start));
    const x2 = 80 + r * Math.cos(rad(end));
    const y2 = 80 + r * Math.sin(rad(end));
    const d = portion <= 0 ? '' : `M80 80 L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...slice, d, portion };
  });
  return <div className="chart-card" aria-label={title}>
    <h4>{title}</h4>
    <div className="chart-row">
      <svg viewBox="0 0 160 160" width={size} height={size} role="img">
        {total === 1 && slices.every(s => s.value === 0)
          ? <circle cx="80" cy="80" r="60" fill="var(--line)"/>
          : paths.map(slice => slice.d && <path key={slice.label} d={slice.d} fill={slice.color}/>)}
        <circle cx="80" cy="80" r="28" fill="var(--white)"/>
      </svg>
      <ul className="chart-legend">
        {slices.map(slice => <li key={slice.label}><span style={{ background: slice.color }}/>{slice.label}<strong>{slice.value}</strong></li>)}
      </ul>
    </div>
  </div>;
}

export function BarChart({ bars, title = 'Breakdown', maxValue }) {
  const peak = maxValue || Math.max(...bars.map(bar => Math.abs(bar.value)), 1);
  return <div className="chart-card" aria-label={title}>
    <h4>{title}</h4>
    <div className="bar-chart" role="img">
      {bars.map(bar => <div className="bar-row" key={bar.label}>
        <span>{bar.label}</span>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, (Math.abs(bar.value) / peak) * 100)}%`, background: bar.color || 'var(--green)' }}/></div>
        <strong>{bar.display ?? bar.value}</strong>
      </div>)}
    </div>
  </div>;
}

export function EdgeGauge({ score = 0, label = '' }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 80 ? 'var(--green)' : clamped >= 60 ? '#6b8f3a' : clamped >= 40 ? '#6b5625' : 'var(--red)';
  return <div className="edge-gauge" aria-label={`Process edge score ${clamped}`}>
    <svg viewBox="0 0 120 70" role="img">
      <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--line)" strokeWidth="10" strokeLinecap="round"/>
      <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * 157} 157`}/>
      <text x="60" y="52" textAnchor="middle" className="edge-score">{clamped}</text>
    </svg>
    <div><strong>Process Edge</strong><small>{label}</small></div>
  </div>;
}

export function EquityChart({ points, title = 'Equity curve' }) {
  if (!points?.length) return null;
  const values = points.map(p => p.equity);
  const min = Math.min(...values) - 100;
  const max = Math.max(...values) + 100;
  const span = Math.max(max - min, 1);
  const coords = points.map((point, index) => {
    const x = 20 + (index / Math.max(points.length - 1, 1)) * 260;
    const y = 110 - ((point.equity - min) / span) * 90;
    return `${x},${y}`;
  }).join(' ');
  return <div className="chart-card" aria-label={title}>
    <h4>{title}</h4>
    <svg className="equity-chart" viewBox="0 0 300 130" role="img">
      <line x1="20" y1="20" x2="20" y2="110" stroke="var(--line)"/>
      <line x1="20" y1="110" x2="280" y2="110" stroke="var(--line)"/>
      <polyline fill="none" stroke="var(--green)" strokeWidth="2.5" points={coords}/>
      {points.map((point, index) => {
        const x = 20 + (index / Math.max(points.length - 1, 1)) * 260;
        const y = 110 - ((point.equity - min) / span) * 90;
        return <circle key={point.label} cx={x} cy={y} r="3.5" fill={point.pnl < 0 ? 'var(--red)' : 'var(--green)'}/>;
      })}
    </svg>
    <p className="fine">Session equity after estimated fees. Synthetic practice only.</p>
  </div>;
}

export function HeatMeter({ entry, stop, target, mark }) {
  if (![entry, stop, target, mark].every(Number.isFinite) || target === stop) return null;
  const pct = Math.max(0, Math.min(100, ((mark - stop) / (target - stop)) * 100));
  return <div className="heat-meter" aria-label="Position heat toward stop and target">
    <div className="panel-heading"><h4>Position heat</h4><span className="status">{pct.toFixed(0)}% to target path</span></div>
    <div className="heat-track"><div className="heat-fill" style={{ width: `${pct}%` }}/><span className="heat-mark" style={{ left: `${pct}%` }}/></div>
    <div className="heat-labels"><span>Stop {stop.toFixed(2)}</span><span>Mark {mark.toFixed(2)}</span><span>Target {target.toFixed(2)}</span></div>
  </div>;
}
