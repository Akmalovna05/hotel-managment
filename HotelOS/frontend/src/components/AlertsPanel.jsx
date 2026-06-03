export default function AlertsPanel({ alerts, orders }) {
  return (
    <aside className="alerts-panel">
      <h2>Live Log Updates</h2>
      
      <div className="alerts-section">
        <h3>Maintenance Alerts</h3>
        <ul>
          {alerts.length === 0 && <li className="muted">No active alerts</li>}
          {alerts.map((a, i) => (
            <li key={`m-${a.ticketId || i}`}>
              <span className="alert-title">Room {a.roomNumber} — {a.category}</span>
              <span className="alert-meta">Severity: {a.severity} • {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Just now'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="alerts-section">
        <h3>Room Service Orders</h3>
        <ul>
          {orders.length === 0 && <li className="muted">No active orders</li>}
          {orders.map((o, i) => (
            <li key={`o-${o.orderId || i}`}>
              <span className="alert-title">Order #{o.orderId} — Room {o.roomNumber}</span>
              <span className="alert-meta">Status: {o.status?.toUpperCase()} • {o.timestamp ? new Date(o.timestamp).toLocaleTimeString() : 'Just now'}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
