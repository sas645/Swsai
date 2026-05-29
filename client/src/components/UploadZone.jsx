import { useCallback, useRef, useState } from 'react';

export default function UploadZone({ onUploadFiles, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files) => {
      const arr = Array.from(files || []);
      if (!arr.length) return;
      onUploadFiles(arr);
    },
    [onUploadFiles]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <section className="upload-zone card">
      <div
        className={`upload-zone__drop ${dragOver ? 'upload-zone__drop--active' : ''} ${disabled ? 'upload-zone__drop--disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="upload-zone__icon">
          {disabled ? <span className="spinner" /> : (
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
        <h2>{disabled ? 'Uploading documents…' : 'Upload documents'}</h2>
        <p>
          Drag and drop files here, or click to browse. You can select multiple files. Max 50 MB each.
        </p>
      </div>
    </section>
  );
}
