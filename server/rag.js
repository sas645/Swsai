import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

export async function extractPdfText(filePath) {
  const data = fs.readFileSync(filePath);
  const parsed = await pdf(data);
  return (parsed.text || '').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

export function chunkText(text, { chunkSize = 1200, overlap = 200 } = {}) {
  const cleaned = (text || '').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + chunkSize);
    const slice = cleaned.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export function storeChunks(db, docId, chunks) {
  const now = new Date().toISOString();

  const insertChunk = db.prepare(
    `INSERT INTO document_chunks (id, doc_id, chunk_index, text, char_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertFts = db.prepare(
    `INSERT INTO document_chunks_fts (text, doc_id, chunk_index, chunk_id)
     VALUES (?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    // Clear previous chunks (re-processing)
    db.prepare('DELETE FROM document_chunks WHERE doc_id = ?').run(docId);
    db.prepare('DELETE FROM document_chunks_fts WHERE doc_id = ?').run(docId);

    chunks.forEach((text, idx) => {
      const id = uuidv4();
      insertChunk.run(id, docId, idx, text, text.length, now);
      insertFts.run(text, docId, idx, id);
    });
  });

  tx();
}

export function searchChunksLexical(db, query, { limit = 8 } = {}) {
  if (!query?.trim()) return [];
  const q = query.trim();
  // Using bm25() ranking from FTS5 (lower is better).
  const rows = db
    .prepare(
      `
      SELECT
        f.doc_id as doc_id,
        f.chunk_index as chunk_index,
        f.chunk_id as chunk_id,
        c.text as text,
        bm25(document_chunks_fts) as score
      FROM document_chunks_fts f
      JOIN document_chunks c ON c.id = f.chunk_id
      WHERE document_chunks_fts MATCH ?
      ORDER BY score ASC
      LIMIT ?
    `
    )
    .all(q, limit);

  return rows.map((r) => ({
    docId: r.doc_id,
    chunkIndex: r.chunk_index,
    chunkId: r.chunk_id,
    text: r.text,
    score: r.score,
  }));
}

