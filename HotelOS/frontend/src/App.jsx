import { useState, useEffect } from 'react';
import { useDashboard } from './context/DashboardContext';
import { login, checkIn, checkOut, completeCleaning, createMaintenanceTicket, createOrder } from './api/client';
import LoginForm from './components/LoginForm';
import RoomGrid from './components/RoomGrid';
import AlertsPanel from './components/AlertsPanel';
import ReceptionModal from './components/ReceptionModal';

const ROOM_SERVICE_MENU = [
  { name: 'Breakfast Tray', price: 22 },
  { name: 'Club Sandwich', price: 18 },
  { name: 'Fresh Fruit Platter', price: 15 },
  { name: 'Sparkling Water', price: 6 },
  { name: 'Espresso Double', price: 4 },
];

const MAINTENANCE_CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'Housekeeping', 'Other'];

export default function App() {
  const { token, role, rooms, alerts, orders, saveSession, logout } = useDashboard();
  const [bookingRef, setBookingRef] = useState('BK-2026-001');
  const [checkoutRef, setCheckoutRef] = useState('BK-2026-001');
  const [toast, setToast] = useState(null);
  const [receptionModal, setReceptionModal] = useState(null); // { type, data, loading }

  // Form states
  const [cleanRoom, setCleanRoom] = useState('');
  const [cleanStaff, setCleanStaff] = useState('Staff Alice');

  const [maintRoom, setMaintRoom] = useState('');
  const [maintCategory, setMaintCategory] = useState('Plumbing');
  const [maintDesc, setMaintDesc] = useState('Leaking tap');
  const [maintSeverity, setMaintSeverity] = useState(3);
  const [maintImpact, setMaintImpact] = useState(false);

  const [rsRoom, setRsRoom] = useState('');
  const [rsItemIdx, setRsItemIdx] = useState(0);
  const [rsQty, setRsQty] = useState(1);

  // Show Toast helper
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
  };

  // Clear toast after timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Set default select values when rooms load
  useEffect(() => {
    if (rooms && rooms.length > 0) {
      if (!cleanRoom) {
        const firstDirty = rooms.find((r) => r.status === 'dirty');
        setCleanRoom(firstDirty ? firstDirty.room_number : rooms[0].room_number);
      }
      if (!maintRoom) setMaintRoom(rooms[0].room_number);
      if (!rsRoom) {
        const firstOccupied = rooms.find((r) => r.status === 'occupied');
        setRsRoom(firstOccupied ? firstOccupied.room_number : rooms[0].room_number);
      }
    }
  }, [rooms]);

  const handleLogin = async (username, password) => {
    try {
      const data = await login(username, password);
      saveSession(data.token, data.role);
      showToast('Logged in successfully', 'success');
    } catch (e) {
      showToast(e.response?.data?.error || 'Login failed', 'error');
      throw e;
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>HotelOS Operations Panel</h1>
        <div className="header-controls">
          <span className="badge">Role: {role}</span>
          <button className="secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main>
        <div className="dashboard-content">
          <section className="panel">
            <h2>Room Floor Plan</h2>
            <RoomGrid rooms={rooms} />
          </section>

          {/* Reception Controls */}
          <section className="panel">
            <h2>Reception Services</h2>
            <div className="form-grid">
              <label>
                Check In Booking Reference
                <div className="form-row">
                  <input
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    placeholder="Booking Reference"
                  />
                  <button
                    onClick={async () => {
                      setReceptionModal({ type: 'checkin', loading: true, data: null, ref: bookingRef });
                      try {
                        const res = await checkIn(bookingRef);
                        setReceptionModal({ type: 'checkin', loading: false, data: res, ref: bookingRef });
                        showToast(`Checked in: Room ${res.roomNumber} (Invoice: $${res.invoiceTotal})`, 'success');
                      } catch (e) {
                        setReceptionModal({
                          type: 'checkin', loading: false, ref: bookingRef,
                          data: null,
                          error: e.message || 'Check-in failed'
                        });
                        showToast(e.message || 'Check-in failed', 'error');
                      }
                    }}
                  >
                    Check In
                  </button>
                </div>
              </label>

              <label>
                Check Out Booking Reference
                <div className="form-row">
                  <input
                    value={checkoutRef}
                    onChange={(e) => setCheckoutRef(e.target.value)}
                    placeholder="Booking Reference"
                  />
                  <button
                    className="secondary"
                    onClick={async () => {
                      setReceptionModal({ type: 'checkout', loading: true, data: null, ref: checkoutRef });
                      try {
                        const res = await checkOut(checkoutRef);
                        setReceptionModal({ type: 'checkout', loading: false, data: res, ref: checkoutRef });
                        showToast(`Checked out Room ${res.roomNumber}. Final Invoice: $${res.invoice?.total || '0'}`, 'success');
                      } catch (e) {
                        setReceptionModal({
                          type: 'checkout', loading: false, ref: checkoutRef,
                          data: null,
                          error: e.message || 'Check-out failed'
                        });
                        showToast(e.message || 'Check-out failed', 'error');
                      }
                    }}
                  >
                    Check Out
                  </button>
                </div>
              </label>
            </div>
          </section>

          {/* Housekeeping Panel */}
          <section className="panel">
            <h2>Housekeeping Services</h2>
            <div className="form-grid">
              <label>
                Select Room
                <select value={cleanRoom} onChange={(e) => setCleanRoom(e.target.value)}>
                  {rooms.map((r) => (
                    <option key={`hk-room-${r.room_number}`} value={r.room_number}>
                      Room {r.room_number} ({r.status})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assigned Staff Name
                <input
                  value={cleanStaff}
                  onChange={(e) => setCleanStaff(e.target.value)}
                  placeholder="Staff Name"
                />
              </label>
              <button
                onClick={async () => {
                  try {
                    if (!cleanRoom) return showToast('No room selected', 'error');
                    await completeCleaning(cleanRoom, cleanStaff);
                    showToast(`Room ${cleanRoom} marked clean and available`, 'success');
                  } catch (e) {
                    showToast(e.response?.data?.error || e.message, 'error');
                  }
                }}
              >
                Complete Cleaning
              </button>
            </div>
          </section>

          {/* Maintenance Panel */}
          <section className="panel">
            <h2>Maintenance Services</h2>
            <div className="form-grid">
              <label>
                Room Number
                <select value={maintRoom} onChange={(e) => setMaintRoom(e.target.value)}>
                  {rooms.map((r) => (
                    <option key={`maint-room-${r.room_number}`} value={r.room_number}>
                      Room {r.room_number} ({r.status})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select value={maintCategory} onChange={(e) => setMaintCategory(e.target.value)}>
                  {MAINTENANCE_CATEGORIES.map((cat) => (
                    <option key={`cat-${cat}`} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <input
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Describe the issue"
                />
              </label>
              <label>
                Severity
                <select value={maintSeverity} onChange={(e) => setMaintSeverity(parseInt(e.target.value))}>
                  <option value="1">1 - Minor (Low Impact)</option>
                  <option value="2">2 - Moderate</option>
                  <option value="3">3 - Major</option>
                  <option value="4">4 - Critical</option>
                  <option value="5">5 - Immediate Action Required</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={maintImpact}
                  onChange={(e) => setMaintImpact(e.target.checked)}
                />
                Guest Impact?
              </label>
              <button
                onClick={async () => {
                  try {
                    if (!maintRoom) return showToast('No room selected', 'error');
                    const res = await createMaintenanceTicket({
                      roomNumber: maintRoom,
                      category: maintCategory,
                      description: maintDesc,
                      severity: maintSeverity,
                      guestImpact: maintImpact,
                    });
                    showToast(`Ticket #${res.ticket?.id} created (Queue Position: ${res.queuePosition})`, 'success');
                  } catch (e) {
                    showToast(e.response?.data?.error || e.message, 'error');
                  }
                }}
              >
                Report Fault
              </button>
            </div>
          </section>

          {/* Room Service Panel */}
          <section className="panel">
            <h2>Room Service</h2>
            <div className="form-grid">
              <label>
                Select Room
                <select value={rsRoom} onChange={(e) => setRsRoom(e.target.value)}>
                  {rooms.map((r) => (
                    <option key={`rs-room-${r.room_number}`} value={r.room_number}>
                      Room {r.room_number} ({r.status})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Select MenuItem
                <select value={rsItemIdx} onChange={(e) => setRsItemIdx(parseInt(e.target.value))}>
                  {ROOM_SERVICE_MENU.map((item, idx) => (
                    <option key={`menu-${idx}`} value={idx}>
                      {item.name} (${item.price})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rsQty}
                  onChange={(e) => setRsQty(parseInt(e.target.value) || 1)}
                />
              </label>
              <button
                onClick={async () => {
                  try {
                    if (!rsRoom) return showToast('No room selected', 'error');
                    const selectedItem = ROOM_SERVICE_MENU[rsItemIdx];
                    await createOrder({
                      roomNumber: rsRoom,
                      bookingId: 1, // Optional placeholder, backend can handle it
                      items: [{ name: selectedItem.name, quantity: rsQty, unitPrice: selectedItem.price }],
                    });
                    showToast(`Order for ${rsQty}x ${selectedItem.name} placed for Room ${rsRoom}`, 'success');
                  } catch (e) {
                    showToast(e.response?.data?.error || e.message, 'error');
                  }
                }}
              >
                Place Order
              </button>
            </div>
          </section>
        </div>

        {/* Live Alerts Panel */}
        <AlertsPanel alerts={alerts} orders={orders} />
      </main>

      {/* Reception Modal */}
      {receptionModal && (
        <ReceptionModal
          modal={receptionModal}
          onClose={() => setReceptionModal(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
