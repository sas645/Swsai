import { v4 as uuidv4 } from 'uuid';

export function listNotifications(db, { limit = 50 } = {}) {
  const rows = db
    .prepare(
      `SELECT id, message, type, created_at, read
       FROM notifications
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit);

  return rows.map(rowToNotification);
}

export function createNotification(db, { message, type = 'info', dedupeKey = null }) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO notifications (id, message, type, created_at, read, dedupe_key)
     VALUES (?, ?, ?, ?, 0, ?)`
  );
  const info = stmt.run(id, message, type, createdAt, dedupeKey);
  if (info.changes === 0) return null;

  return { id, message, type, createdAt, read: false, dedupeKey };
}

export function markNotificationRead(db, id) {
  db.prepare(`UPDATE notifications SET read = 1 WHERE id = ?`).run(id);
}

export function markAllNotificationsRead(db) {
  db.prepare(`UPDATE notifications SET read = 1 WHERE read = 0`).run();
}

export function unreadCount(db) {
  return db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE read = 0`).get().c;
}

function rowToNotification(row) {
  return {
    id: row.id,
    message: row.message,
    type: row.type,
    createdAt: row.created_at,
    read: !!row.read,
  };
}

