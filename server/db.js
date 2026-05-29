import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'documents.db');

export function initDb() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'uploading',
      upload_progress INTEGER NOT NULL DEFAULT 0,
      processing_progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      error_message TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      char_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON document_chunks(doc_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_document_chunks_doc_chunk ON document_chunks(doc_id, chunk_index);
  `);

  // Full-text search index for fast lexical retrieval (baseline RAG)
  // If an older virtual-table schema exists, rebuild it.
  const existingFts = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'document_chunks_fts'`)
    .get();
  if (existingFts) {
    db.exec(`DROP TABLE IF EXISTS document_chunks_fts;`);
  }
  db.exec(`
    CREATE VIRTUAL TABLE document_chunks_fts
    USING fts5(text, doc_id, chunk_index, chunk_id);
  `);

  return db;
}

export function rowToDoc(row) {
  if (!row) return null;
  return {
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
  };
}
