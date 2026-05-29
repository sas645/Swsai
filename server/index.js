import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { initDb, rowToDoc } from './db.js';
import { simulateProcessing } from './processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');

[uploadsDir, dataDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const db = initDb();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uuidv4()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

function emit(event, payload) {
  io.emit(event, payload);
}

function listDocuments() {
  const rows = db
    .prepare('SELECT * FROM documents ORDER BY created_at DESC')
    .all();
  return rows.map(rowToDoc);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/documents', (_req, res) => {
  res.json(listDocuments());
});

app.get('/api/documents/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Document not found' });
  res.json(rowToDoc(row));
});

app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const doc = {
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    status: 'uploaded',
    uploadProgress: 100,
    processingProgress: 0,
    createdAt: now,
    updatedAt: now,
    errorMessage: null,
  };

  db.prepare(
    `INSERT INTO documents (id, filename, original_name, file_size, status, upload_progress, processing_progress, created_at, updated_at)
     VALUES (@id, @filename, @originalName, @fileSize, @status, @uploadProgress, @processingProgress, @createdAt, @updatedAt)`
  ).run({
    id: doc.id,
    filename: doc.filename,
    originalName: doc.originalName,
    fileSize: doc.fileSize,
    status: 'processing',
    uploadProgress: 100,
    processingProgress: 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });

  const saved = rowToDoc(db.prepare('SELECT * FROM documents WHERE id = ?').get(id));
  emit('document:created', saved);
  emit('document:updated', saved);

  res.status(201).json(saved);
  simulateProcessing(db, id, emit);
});

app.delete('/api/documents/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Document not found' });

  const filePath = path.join(uploadsDir, row.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  emit('document:deleted', { id: req.params.id });
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(400).json({ error: err.message || 'Upload failed' });
});

io.on('connection', (socket) => {
  socket.emit('documents:sync', listDocuments());
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
