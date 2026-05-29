import ProgressBar from './ProgressBar';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABEL = {
  pending: 'Pending',
  uploading: 'Uploading',
  complete: 'Complete',
  failed: 'Failed',
};

export default function UploadQueue({ items, minimized, onToggleMinimized, onClearCompleted }) {
  if (!items.length) return null;

  const completedCount = items.filter((i) => i.status === 'complete').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const activeCount = items.filter((i) => i.status === 'uploading' || i.status === 'pending').length;

  return (
    <section className="upload-queue card" aria-label="Upload queue">
      <div className="upload-queue__head">
        <div>
          <h3>Uploads</h3>
          <p>
            {activeCount ? `${activeCount} active` : 'Idle'}
            {completedCount ? ` · ${completedCount} complete` : ''}
            {failedCount ? ` · ${failedCount} failed` : ''}
          </p>
        </div>
        <div className="upload-queue__head-actions">
          <button type="button" className="btn btn--ghost" onClick={onToggleMinimized}>
            {minimized ? 'Expand' : 'Collapse'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClearCompleted}
            disabled={!completedCount && !failedCount}
          >
            Clear done
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="upload-queue__list">
          {items.map((item) => (
            <div key={item.localId} className="upload-item">
              <div className="upload-item__meta">
                <div className="upload-item__name" title={item.name}>{item.name}</div>
                <div className="upload-item__sub">
                  {formatBytes(item.size)} · {item.type || 'application/pdf'} ·{' '}
                  <span className={`upload-item__status upload-item__status--${item.status}`}>
                    {STATUS_LABEL[item.status] || item.status}
                  </span>
                  {item.status === 'failed' && item.error ? ` · ${item.error}` : ''}
                </div>
              </div>
              <div className="upload-item__progress">
                <ProgressBar
                  value={item.progress}
                  label={null}
                  variant={item.status === 'failed' ? 'secondary' : 'primary'}
                  indeterminate={item.status === 'pending'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

