import path from 'path';
import { extractPdfText, chunkText, storeChunks } from './rag.js';

const STEPS = [
  { label: 'Validating document', pct: 12 },
  { label: 'Extracting text', pct: 40 },
  { label: 'Chunking & indexing', pct: 75 },
  { label: 'Finalizing document', pct: 100 },
];

export async function processDocument(db, docId, filePath, emit, notify) {
  try {
    await setStep(db, docId, emit, STEPS[0].label, 5);

    // Accept any file type - processor will attempt to extract text
    if (!filePath) {
      throw new Error('No file path provided.');
    }

    await setStep(db, docId, emit, STEPS[0].label, STEPS[0].pct);

    await setStep(db, docId, emit, STEPS[1].label, 20);
    const text = await extractPdfText(filePath);
    await setStep(db, docId, emit, STEPS[1].label, STEPS[1].pct);

    await setStep(db, docId, emit, STEPS[2].label, 55);
    const chunks = chunkText(text);
    storeChunks(db, docId, chunks);
    await setStep(db, docId, emit, STEPS[2].label, STEPS[2].pct);

    // Placeholder: embeddings step will be inserted here in the next task.
    await setStep(db, docId, emit, STEPS[3].label, 95);

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE documents SET status = 'ready', processing_progress = 100, updated_at = ? WHERE id = ?`
    ).run(now, docId);

    const doc = getDoc(db, docId);
    emit('document:updated', doc);
    emit('document:ready', { ...doc, message: `"${doc.originalName}" is ready to view.` });

    await maybeNotifyBulkComplete(db, docId, notify);
  } catch (err) {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE documents SET status = 'error', error_message = ?, updated_at = ? WHERE id = ?`
    ).run(err?.message || 'Processing failed', now, docId);
    const doc = getDoc(db, docId);
    emit('document:updated', doc);
    emit('document:ready', { ...doc, message: `"${doc.originalName}" failed to process.` });

    notify?.({ type: 'error', message: `"${doc?.originalName || 'Document'}" failed to process.` });
    await maybeNotifyBulkComplete(db, docId, notify);
  }
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
        batchId: row.batch_id || null,
      }
    : null;
}

async function setStep(db, docId, emit, label, pct) {
  const capped = Math.max(0, Math.min(99, pct));
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE documents SET processing_progress = ?, updated_at = ? WHERE id = ?`
  ).run(capped, now, docId);
  const doc = getDoc(db, docId);
  emit('document:updated', { ...doc, processingStep: label });
  await sleep(250 + Math.random() * 450);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function maybeNotifyBulkComplete(db, docId, notify) {
  if (!notify) return;
  const row = db.prepare('SELECT batch_id FROM documents WHERE id = ?').get(docId);
  const batchId = row?.batch_id || null;
  if (!batchId) return;

  const totals = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as readyCount,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorCount,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processingCount
       FROM documents
       WHERE batch_id = ?`
    )
    .get(batchId);

  if (!totals || totals.processingCount > 0) return;

  const dedupeKey = `bulk:${batchId}`;
  if ((totals.errorCount || 0) === 0) {
    notify({
      type: 'success',
      message: `${totals.total} files uploaded successfully`,
      dedupeKey,
    });
  } else {
    notify({
      type: 'error',
      message: `Bulk upload finished: ${totals.readyCount} succeeded, ${totals.errorCount} failed`,
      dedupeKey,
    });
  }
}
