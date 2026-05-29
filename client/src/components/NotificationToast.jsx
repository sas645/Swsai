export default function NotificationToast({ notifications, onDismiss }) {
  if (!notifications.length) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {notifications.map((n) => (
        <div key={n.id} className={`toast toast--${n.type}`}>
          <div className="toast__icon">{n.type === 'success' ? '✓' : 'ℹ'}</div>
          <div className="toast__body">
            <strong>{n.title}</strong>
            <p>{n.message}</p>
          </div>
          <button type="button" className="toast__close" onClick={() => onDismiss(n.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
