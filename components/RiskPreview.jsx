'use client';
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export default function RiskPreview({ preview, compact = false }) {
  if (!preview || !preview.quantity) {
    return <p className="fine">Risk preview needs a positive stop distance and enough cash for one share.</p>;
  }
  return <div className={compact ? 'risk-preview compact' : 'risk-preview'} aria-label="Pre-trade risk preview">
    <div className="panel-heading"><h3>Risk preview</h3><span className="status">Before you enter</span></div>
    <dl>
      <div><dt>Shares from risk budget</dt><dd>{preview.quantity}</dd></div>
      <div><dt>Planned stop loss, with fees</dt><dd className="negative">{money(preview.plannedLoss)}</dd></div>
      <div><dt>Illustrative gap loss (1% below stop)</dt><dd className="negative">{money(preview.gapLoss)}</dd></div>
      <div><dt>Planned target gain, after fees</dt><dd className="positive">{money(preview.plannedGain)}</dd></div>
      {!compact && <div><dt>Gap fill illustration</dt><dd>{money(preview.gapExit)}</dd></div>}
    </dl>
    <p className="fine">{preview.note || preview.limitation || 'Gap losses can exceed your risk budget. Synthetic fills exclude slippage.'}</p>
  </div>;
}
