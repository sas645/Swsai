import { useCallback, useRef, useState } from 'react';
import ProgressBar from './ProgressBar';

export default function UploadZone({ onUpload, uploading, uploadProgress, uploadFileName }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        onUpload(null, 'Only PDF files are allowed.');
        return;
      }
      onUpload(file);
    },
    [onUpload]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!uploading) handleFiles(e.dataTransfer.files);
  };

  return (
    <section className="upload-zone card">
      <div
        className={`upload-zone__drop ${dragOver ? 'upload-zone__drop--active' : ''} ${uploading ? 'upload-zone__drop--disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="upload-zone__icon">
          {uploading ? <span className="spinner" /> : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <h2>{uploading ? 'Uploading document…' : 'Upload company PDF'}</h2>
        <p>
          {uploading
            ? uploadFileName
            : 'Drag and drop a PDF here, or click to browse. Max 50 MB.'}
        </p>
      </div>

      {uploading && (
        <div className="upload-zone__progress">
          <ProgressBar value={uploadProgress} label="Upload progress" variant="primary" />
        </div>
      )}
    </section>
  );
}
