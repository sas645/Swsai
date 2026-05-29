const API_BASE = '/api';

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to load documents');
  return res.json();
}

export function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let message = 'Upload failed';
        try {
          const err = JSON.parse(xhr.responseText);
          message = err.error || message;
        } catch {
          /* ignore */
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('POST', `${API_BASE}/documents/upload`);
    xhr.send(formData);
  });
}

export function uploadDocumentWithMeta({ file, onProgress, batchId }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    if (batchId) formData.append('batchId', batchId);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let message = 'Upload failed';
        try {
          const err = JSON.parse(xhr.responseText);
          message = err.error || message;
        } catch {
          /* ignore */
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('POST', `${API_BASE}/documents/upload`);
    xhr.send(formData);
  });
}

export async function deleteDocument(id) {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function searchChunks(q, limit = 8) {
  const url = new URL(`${window.location.origin}${API_BASE}/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchNotifications(limit = 50) {
  const url = new URL(`${window.location.origin}${API_BASE}/notifications`);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark read');
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark all read');
  return res.json();
}
