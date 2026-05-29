import { useEffect, useMemo, useRef, useState } from 'react';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function NotificationCenter({
  unread,
  notifications,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const unreadLabel = useMemo(() => (unread > 99 ? '99+' : String(unread)), [unread]);

  return (
    <div className="notif" ref={panelRef}>
      <button
        type="button"
        className="notif__btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="notif__icon" aria-hidden>
          🔔
        </span>
        {unread > 0 && <span className="notif__badge">{unreadLabel}</span>}
      </button>

      {open && (
        <div className="notif__panel" role="dialog" aria-label="Notifications">
          <div className="notif__panel-head">
            <div>
              <strong>Notifications</strong>
              <div className="notif__sub">{unread ? `${unread} unread` : 'All caught up'}</div>
            </div>
            <div className="notif__actions">
              <button type="button" className="btn btn--ghost" onClick={onRefresh}>
                Refresh
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onMarkAllRead}
                disabled={!unread}
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="notif__list">
            {notifications.length === 0 ? (
              <div className="notif__empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notif__item ${n.read ? '' : 'notif__item--unread'}`}>
                  <div className="notif__item-main">
                    <div className="notif__msg">{n.message}</div>
                    <div className="notif__meta">{formatTime(n.createdAt)} · {n.type}</div>
                  </div>
                  {!n.read && (
                    <button type="button" className="btn btn--ghost" onClick={() => onMarkRead(n.id)}>
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

