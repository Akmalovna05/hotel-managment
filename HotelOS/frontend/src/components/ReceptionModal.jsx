import { useEffect } from 'react';

const CHECKIN_DEFAULT = {
  message: 'Check-in complete',
  roomNumber: '—',
  floor: '—',
  preferenceDeviation: false,
  invoiceId: '—',
  invoiceTotal: 0,
};

const CHECKOUT_DEFAULT = {
  message: 'Checkout complete',
  roomNumber: '—',
  invoice: { total: 0, items: [] },
};

export default function ReceptionModal({ modal, onClose }) {
  const { type, loading, data, error, ref } = modal;
  const isCheckIn = type === 'checkin';

  // ESC ile yopish
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const displayData = data || (isCheckIn ? CHECKIN_DEFAULT : CHECKOUT_DEFAULT);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`modal-header ${isCheckIn ? 'checkin' : 'checkout'}`}>
          <div className="modal-header-left">
            <div className="modal-icon">{isCheckIn ? '🛎️' : '🧾'}</div>
            <div>
              <h3>{isCheckIn ? 'Check-In Details' : 'Check-Out Details'}</h3>
              <p className="modal-ref">Ref: {ref}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <div className="spinner" />
              <span>Processing {isCheckIn ? 'Check-In' : 'Check-Out'}...</span>
            </div>
          ) : error ? (
            <div className="modal-error">
              <span className="modal-error-icon">⚠️</span>
              <div>
                <strong>Operation Failed</strong>
                <p>{error}</p>
              </div>
            </div>
          ) : isCheckIn ? (
            <CheckInDetails data={displayData} />
          ) : (
            <CheckOutDetails data={displayData} />
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="modal-footer">
            <button className="secondary" onClick={onClose}>Close</button>
            {!error && (
              <span className={`modal-status-badge ${isCheckIn ? 'success' : 'info'}`}>
                {isCheckIn ? '✓ Checked In' : '✓ Checked Out'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckInDetails({ data }) {
  return (
    <div className="modal-details">
      <div className="modal-detail-row highlight">
        <span>Room Assigned</span>
        <strong className="room-number-big">Room {data.roomNumber}</strong>
      </div>
      <div className="modal-detail-row">
        <span>Floor</span>
        <strong>{data.floor ?? '—'}</strong>
      </div>
      <div className="modal-detail-row">
        <span>Invoice ID</span>
        <strong>#{data.invoiceId}</strong>
      </div>
      <div className="modal-detail-row">
        <span>Invoice Total</span>
        <strong className="price">${data.invoiceTotal ?? 0}</strong>
      </div>
      <div className="modal-detail-row">
        <span>Preference Deviation</span>
        <strong className={data.preferenceDeviation ? 'warn' : 'ok'}>
          {data.preferenceDeviation ? '⚠ Yes' : '✓ No'}
        </strong>
      </div>
      <div className="modal-detail-row">
        <span>Status</span>
        <span className="status-pill occupied">Occupied</span>
      </div>
    </div>
  );
}

function CheckOutDetails({ data }) {
  const invoice = data.invoice || {};
  const items = invoice.items || [];

  return (
    <div className="modal-details">
      <div className="modal-detail-row highlight">
        <span>Room</span>
        <strong className="room-number-big">Room {data.roomNumber}</strong>
      </div>
      <div className="modal-detail-row">
        <span>Invoice Total</span>
        <strong className="price">${invoice.total ?? 0}</strong>
      </div>
      {invoice.id && (
        <div className="modal-detail-row">
          <span>Invoice ID</span>
          <strong>#{invoice.id}</strong>
        </div>
      )}
      <div className="modal-detail-row">
        <span>Room Status</span>
        <span className="status-pill dirty">Dirty (Cleaning Queued)</span>
      </div>
      {items.length > 0 && (
        <div className="modal-invoice-items">
          <p className="modal-items-title">Invoice Items</p>
          {items.map((item, i) => (
            <div key={i} className="modal-invoice-item">
              <span>{item.description || item.name}</span>
              <strong>${item.amount ?? item.price ?? 0}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
