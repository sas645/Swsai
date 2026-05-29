export default function ProgressBar({ value, label, variant = 'primary', indeterminate = false }) {
  const clamped = Math.min(100, Math.max(0, value ?? 0));

  return (
    <div className="progress">
      {label && (
        <div className="progress__header">
          <span className="progress__label">{label}</span>
          {!indeterminate && <span className="progress__pct">{clamped}%</span>}
        </div>
      )}
      <div className={`progress__track progress__track--${variant}`}>
        <div
          className={`progress__fill ${indeterminate ? 'progress__fill--indeterminate' : ''}`}
          style={indeterminate ? undefined : { width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
