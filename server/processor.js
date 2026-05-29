const PROCESSING_STEPS = [
  { label: 'Validating PDF structure', weight: 15 },
  { label: 'Extracting metadata', weight: 20 },
  { label: 'Indexing text content', weight: 35 },
  { label: 'Generating preview', weight: 20 },
  { label: 'Finalizing document', weight: 10 },
];

export function simulateProcessing(db, docId, emit) {
  let progress = 0;
  let stepIndex = 0;

  const tick = () => {
    const step = PROCESSING_STEPS[stepIndex];
    if (!step) {
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE documents SET status = 'ready', processing_progress = 100, updated_at = ? WHERE id = ?`
      ).run(now, docId);

      const doc = getDoc(db, docId);
      emit('document:updated', doc);
      emit('document:ready', { ...doc, message: `"${doc.originalName}" is ready to view.` });
      return;
    }

    progress += 2 + Math.floor(Math.random() * 4);
    const stepCap = PROCESSING_STEPS.slice(0, stepIndex + 1).reduce((s, x) => s + x.weight, 0);
    if (progress >= stepCap) {
      stepIndex += 1;
    }

    const capped = Math.min(progress, 99);
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE documents SET processing_progress = ?, updated_at = ? WHERE id = ?`
    ).run(capped, now, docId);

    const doc = getDoc(db, docId);
    emit('document:updated', { ...doc, processingStep: step.label });
    setTimeout(tick, 400 + Math.random() * 600);
  };

  setTimeout(tick, 500);
}

function getDoc(db, id) {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  return row
    ? {
        id: row.id,
        filename: row.filename,
        originalName: row.original_name,
        fileSize: row.file_size,
        status: row.status,
        uploadProgress: row.upload_progress,
        processingProgress: row.processing_progress,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        errorMessage: row.error_message,
      }
    : null;
}
