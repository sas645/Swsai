import path from 'path';
import { extractPdfText, chunkText, storeChunks } from './rag.js';

const STEPS = [
  { label: 'Validating PDF structure', pct: 12 },
  { label: 'Extracting text', pct: 40 },
  { label: 'Chunking & indexing', pct: 75 },
  { label: 'Finalizing document', pct: 100 },
];

export async function processDocument(db, docId, filePath, emit) {
  try {
    await setStep(db, docId, emit, STEPS[0].label, 5);

    // Basic validation: file exists & is a PDF by extension
    if (!filePath?.toLowerCase().endsWith('.pdf')) {
      throw new Error('Uploaded file is not a PDF.');
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
  } catch (err) {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE documents SET status = 'error', error_message = ?, updated_at = ? WHERE id = ?`
    ).run(err?.message || 'Processing failed', now, docId);
    const doc = getDoc(db, docId);
    emit('document:updated', doc);
    emit('document:ready', { ...doc, message: `"${doc.originalName}" failed to process.` });
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
