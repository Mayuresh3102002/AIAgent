'use client';
import { useEffect, useState } from 'react';
import { FRICTION_SECONDS, validateFriction } from '../lib/process';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export default function FrictionGate({ stop, disabled, onConfirm, label = 'Place paper trade after friction' }) {
  const [typedStop, setTypedStop] = useState('');
  const [remaining, setRemaining] = useState(FRICTION_SECONDS);
  const [error, setError] = useState('');
  const cooled = remaining <= 0;

  useEffect(() => {
    setTypedStop('');
    setRemaining(FRICTION_SECONDS);
    setError('');
  }, [stop]);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setRemaining(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  function submit(event) {
    event.preventDefault();
    try {
      const friction = validateFriction({ typedStop, stop, cooled });
      onConfirm(friction);
      setError('');
    } catch (cause) {
      setError(cause.message);
    }
  }

  return <form className="friction-gate learning-form" onSubmit={submit} noValidate>
    <div className="panel-heading"><h3>Fear &amp; greed friction</h3><span className={cooled ? 'status qualified' : 'status'}>{cooled ? 'Ready' : `${remaining}s cool-down`}</span></div>
    <p className="fine">Pause impulsive entries. Wait {FRICTION_SECONDS}s and type the invalidation price exactly.</p>
    <div className="friction-meter" aria-hidden="true"><div style={{ width: `${((FRICTION_SECONDS - remaining) / FRICTION_SECONDS) * 100}%` }}/></div>
    <label htmlFor="invalidation-stop">Type stop / invalidation price</label>
    <input id="invalidation-stop" inputMode="decimal" autoComplete="off" placeholder={stop != null ? stop.toFixed(2) : '0.00'} value={typedStop} onChange={event => { setTypedStop(event.target.value); setError(''); }} disabled={disabled}/>
    <p className="fine">Hint shown as placeholder only · expected stop {stop != null ? money(stop) : '—'}</p>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary full" disabled={disabled}>{label}</button>
  </form>;
}
