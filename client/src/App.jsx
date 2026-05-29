import { useCallback, useEffect, useState } from 'react';
import { deleteDocument, fetchDocuments, uploadDocument } from './api';
import DocumentCard from './components/DocumentCard';
import NotificationToast from './components/NotificationToast';
import UploadZone from './components/UploadZone';
import { useSocket } from './hooks/useSocket';
import './App.css';

let notificationId = 0;

function upsertDoc(list, doc) {
  const idx = list.findIndex((d) => d.id === doc.id);
  if (idx === -1) return [doc, ...list];
  const next = [...list];
  next[idx] = { ...next[idx], ...doc };
  return next;
}

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);

  const addNotification = useCallback((title, message, type = 'success') => {
    const id = ++notificationId;
    setNotifications((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useSocket({
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
    onSync: (docs) => {
      setDocuments(docs);
      setLoading(false);
    },
    onCreated: (doc) => setDocuments((prev) => upsertDoc(prev, doc)),
    onUpdated: (doc) => setDocuments((prev) => upsertDoc(prev, doc)),
    onReady: (payload) => {
      setDocuments((prev) => upsertDoc(prev, payload));
      addNotification('Processing complete', payload.message);
    },
    onDeleted: ({ id }) => setDocuments((prev) => prev.filter((d) => d.id !== id)),
  });

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(() => addNotification('Error', 'Could not load documents.', 'info'))
      .finally(() => setLoading(false));
  }, [addNotification]);

  const handleUpload = async (file, errorMsg) => {
    if (errorMsg) {
      addNotification('Invalid file', errorMsg, 'info');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);

    const tempId = `temp-${Date.now()}`;
    const placeholder = {
      id: tempId,
      originalName: file.name,
      fileSize: file.size,
      status: 'uploading',
      uploadProgress: 0,
      processingProgress: 0,
      createdAt: new Date().toISOString(),
    };
    setDocuments((prev) => [placeholder, ...prev]);

    try {
      const doc = await uploadDocument(file, (pct) => {
        setUploadProgress(pct);
        setDocuments((prev) =>
          prev.map((d) => (d.id === tempId ? { ...d, uploadProgress: pct } : d))
        );
      });
      setDocuments((prev) => prev.filter((d) => d.id !== tempId));
      setDocuments((prev) => upsertDoc(prev, doc));
      addNotification('Upload complete', `"${file.name}" uploaded. Processing started.`);
    } catch (err) {
      setDocuments((prev) => prev.filter((d) => d.id !== tempId));
      addNotification('Upload failed', err.message, 'info');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
      addNotification('Removed', 'Document deleted from the library.');
    } catch {
      addNotification('Error', 'Could not delete document.', 'info');
    } finally {
      setDeletingId(null);
    }
  };

  const processingCount = documents.filter((d) => d.status === 'processing').length;
  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <div className="header__logo">D</div>
          <div>
            <h1>Document Management</h1>
            <p>Company PDF library & processing</p>
          </div>
        </div>
        <div className="header__status">
          <span className={`status-dot ${connected ? 'status-dot--on' : ''}`} />
          {connected ? 'Live updates' : 'Connecting…'}
        </div>
      </header>

      <main className="main">
        <UploadZone
          onUpload={handleUpload}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadFileName={uploadFileName}
        />

        <section className="stats">
          <div className="stat card">
            <span className="stat__value">{documents.length}</span>
            <span className="stat__label">Total documents</span>
          </div>
          <div className="stat card">
            <span className="stat__value stat__value--amber">{processingCount}</span>
            <span className="stat__label">Processing</span>
          </div>
          <div className="stat card">
            <span className="stat__value stat__value--green">{readyCount}</span>
            <span className="stat__label">Ready</span>
          </div>
        </section>

        <section className="library">
          <div className="library__head">
            <h2>Document library</h2>
            {loading && <span className="library__loading"><span className="spinner spinner--sm" /> Loading…</span>}
          </div>

          {!loading && documents.length === 0 && (
            <div className="empty card">
              <p>No documents yet. Upload your first company PDF above.</p>
            </div>
          )}

          <div className="doc-grid">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={handleDelete}
                deleting={deletingId === doc.id}
              />
            ))}
          </div>
        </section>
      </main>

      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}
