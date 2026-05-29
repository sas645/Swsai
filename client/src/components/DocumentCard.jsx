import { useId, useState } from 'react';
import ProgressBar from './ProgressBar';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS = {
  uploading: { label: 'Uploading', className: 'badge--uploading' },
  uploaded: { label: 'Uploaded', className: 'badge--processing' },
  processing: { label: 'Processing', className: 'badge--processing' },
  ready: { label: 'Ready', className: 'badge--ready' },
  error: { label: 'Error', className: 'badge--error' },
};

export default function DocumentCard({ doc, onDelete, deleting }) {
  const [showDetails, setShowDetails] = useState(false);
  const detailsId = useId();
  const status = STATUS[doc.status] || STATUS.processing;
  const isProcessing = doc.status === 'processing' || doc.status === 'uploaded';
  const canOpenPdf = !!doc.filename && (doc.status === 'ready' || doc.status === 'processing' || doc.status === 'error');

  return (
    <article className="doc-card card">
      <div className="doc-card__header">
        <div className="doc-card__icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="doc-card__meta">
          <h3 title={doc.originalName}>{doc.originalName}</h3>
          <span className="doc-card__sub">
            {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
          </span>
        </div>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </div>

      {doc.status === 'uploading' && (
        <ProgressBar value={doc.uploadProgress} label="Uploading" variant="primary" />
      )}

      {isProcessing && (
        <div className="doc-card__processing">
          <ProgressBar
            value={doc.processingProgress}
            label={doc.processingStep || 'Background processing'}
            variant="secondary"
            indeterminate={doc.processingProgress === 0}
          />
          {doc.processingProgress > 0 && doc.processingProgress < 100 && (
            <p className="doc-card__hint">
              <span className="spinner spinner--sm" /> Indexing and preparing your document…
            </p>
          )}
        </div>
      )}

      {doc.status === 'ready' && (
        <p className="doc-card__ready">Document processed and available in the library.</p>
      )}

      <div className="doc-card__actions">
        <button
          type="button"
          className="btn btn--ghost"
          aria-expanded={showDetails}
          aria-controls={detailsId}
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? 'Hide details' : 'View details'}
        </button>

        {canOpenPdf && (
          <a
            className="btn btn--ghost"
            href={`/uploads/${doc.filename}`}
            target="_blank"
            rel="noreferrer"
          >
            Open PDF
          </a>
        )}

        <button
          type="button"
          className="btn btn--ghost btn--danger"
          onClick={() => onDelete(doc.id)}
          disabled={deleting}
        >
          {deleting ? 'Removing…' : 'Remove'}
        </button>
      </div>

      {showDetails && (
        <div id={detailsId} className="doc-card__details" role="region" aria-label="Document details">
          <div className="doc-card__details-grid">
            <Field label="Document ID" value={doc.id} mono />
            <Field label="Stored filename" value={doc.filename || '—'} mono />
            <Field label="Status" value={doc.status} />
            <Field label="Created at" value={doc.createdAt ? formatDate(doc.createdAt) : '—'} />
            <Field label="Updated at" value={doc.updatedAt ? formatDate(doc.updatedAt) : '—'} />
            {doc.errorMessage && <Field label="Error" value={doc.errorMessage} />}
          </div>
        </div>
      )}
    </article>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="doc-field">
      <div className="doc-field__label">{label}</div>
      <div className={`doc-field__value ${mono ? 'doc-field__value--mono' : ''}`}>{value}</div>
    </div>
  );
}
