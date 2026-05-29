import { useCallback, useEffect, useState } from 'react';
import {
  deleteDocument,
  fetchDocuments,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  uploadDocumentWithMeta,
} from './api';
import DocumentCard from './components/DocumentCard';
import NotificationCenter from './components/NotificationCenter';
import NotificationToast from './components/NotificationToast';
import UploadZone from './components/UploadZone';
import UploadQueue from './components/UploadQueue';
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
  const [uploadItems, setUploadItems] = useState([]);
  const [queueMinimized, setQueueMinimized] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const [systemUnread, setSystemUnread] = useState(0);
  const [systemNotifications, setSystemNotifications] = useState([]);

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
    onNotificationsSync: (payload) => {
      setSystemUnread(payload.unread || 0);
      setSystemNotifications(payload.notifications || []);
    },
    onNotificationCreated: (n) => {
      setSystemNotifications((prev) => [n, ...prev]);
      setSystemUnread((u) => u + (n.read ? 0 : 1));
      // Also show a toast for important system notifications.
      addNotification('Notification', n.message, n.type === 'error' ? 'info' : 'success');
    },
  });

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(() => addNotification('Error', 'Could not load documents.', 'info'))
      .finally(() => setLoading(false));
  }, [addNotification]);

  const refreshSystemNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications(50);
      setSystemUnread(data.unread || 0);
      setSystemNotifications(data.notifications || []);
    } catch {
      addNotification('Error', 'Could not load notifications.', 'info');
    }
  }, [addNotification]);

  useEffect(() => {
    refreshSystemNotifications();
  }, [refreshSystemNotifications]);

  const handleUploadFiles = async (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    const pdfs = selected.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    const rejected = selected.length - pdfs.length;
    if (rejected) addNotification('Some files skipped', 'Only PDF files can be uploaded.', 'info');
    if (!pdfs.length) return;

    const batchId = pdfs.length > 3 ? `batch-${Date.now()}` : null;
    if (batchId) {
      addNotification('Upload in progress', `Processing ${pdfs.length} files in background.`, 'info');
      setQueueMinimized(true);
    }

    const newItems = pdfs.map((file) => ({
      localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      file,
    }));
    setUploadItems((prev) => [...newItems, ...prev]);

    // Upload sequentially (simpler and more stable); can be upgraded to limited concurrency later.
    for (const item of newItems) {
      setUploadItems((prev) =>
        prev.map((x) => (x.localId === item.localId ? { ...x, status: 'uploading', progress: 0 } : x))
      );

      try {
        const doc = await uploadDocumentWithMeta({
          file: item.file,
          batchId,
          onProgress: (pct) => {
            setUploadItems((prev) =>
              prev.map((x) => (x.localId === item.localId ? { ...x, progress: pct } : x))
            );
          },
        });

        setUploadItems((prev) =>
          prev.map((x) => (x.localId === item.localId ? { ...x, status: 'complete', progress: 100 } : x))
        );
        setDocuments((prev) => upsertDoc(prev, doc));

        if (!batchId) {
          addNotification('Upload complete', `"${item.name}" uploaded. Processing started.`);
        }
      } catch (err) {
        setUploadItems((prev) =>
          prev.map((x) =>
            x.localId === item.localId
              ? { ...x, status: 'failed', error: err.message, progress: x.progress || 0 }
              : x
          )
        );
        addNotification('Upload failed', `${item.name}: ${err.message}`, 'info');
      }
    }
  };

  const clearDone = () => {
    setUploadItems((prev) => prev.filter((i) => i.status === 'uploading' || i.status === 'pending'));
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
        <div className="header__right">
          <NotificationCenter
            unread={systemUnread}
            notifications={systemNotifications}
            onRefresh={refreshSystemNotifications}
            onMarkRead={async (id) => {
              await markNotificationRead(id);
              setSystemNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
              setSystemUnread((u) => Math.max(0, u - 1));
            }}
            onMarkAllRead={async () => {
              await markAllNotificationsRead();
              setSystemNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              setSystemUnread(0);
            }}
          />
          <div className="header__status">
            <span className={`status-dot ${connected ? 'status-dot--on' : ''}`} />
            {connected ? 'Live updates' : 'Connecting…'}
          </div>
        </div>
      </header>

      <main className="main">
        <UploadZone
          onUploadFiles={handleUploadFiles}
          disabled={false}
        />

        <UploadQueue
          items={uploadItems}
          minimized={queueMinimized}
          onToggleMinimized={() => setQueueMinimized((v) => !v)}
          onClearCompleted={clearDone}
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
