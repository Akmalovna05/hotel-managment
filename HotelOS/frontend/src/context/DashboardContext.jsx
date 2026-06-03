import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { fetchRooms, setAuthToken } from '../api/client';

const DashboardContext = createContext(null);

function roomsReducer(state, action) {
  switch (action.type) {
    case 'SET_ROOMS':
      return action.rooms;
    case 'UPDATE_ROOM':
      return state.map((r) =>
        r.room_number === action.roomNumber
          ? { ...r, status: action.status, updated_at: action.timestamp }
          : r
      );
    case 'ADD_ALERT':
      return state;
    default:
      return state;
  }
}

export function DashboardProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('hotelos_token') || '');
  const [role, setRole] = useState(localStorage.getItem('hotelos_role') || '');
  const [rooms, dispatch] = useReducer(roomsReducer, []);
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    setAuthToken(token);
    fetchRooms().then((data) => dispatch({ type: 'SET_ROOMS', rooms: data })).catch(console.error);

    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, { auth: { token } });
    socketRef.current = socket;

    socket.on('roomStatusChanged', (payload) => {
      dispatch({
        type: 'UPDATE_ROOM',
        roomNumber: payload.roomNumber,
        status: payload.status,
        timestamp: payload.timestamp,
      });
    });
    socket.on('maintenanceAlert', (payload) => {
      setAlerts((prev) => [payload, ...prev].slice(0, 20));
    });
    socket.on('orderStatusChanged', (payload) => {
      setOrders((prev) => [payload, ...prev].slice(0, 20));
    });

    return () => socket.disconnect();
  }, [token]);

  const saveSession = (newToken, newRole) => {
    localStorage.setItem('hotelos_token', newToken);
    localStorage.setItem('hotelos_role', newRole);
    setToken(newToken);
    setRole(newRole);
  };

  const logout = () => {
    localStorage.removeItem('hotelos_token');
    localStorage.removeItem('hotelos_role');
    setToken('');
    setRole('');
    setAuthToken(null);
    if (socketRef.current) socketRef.current.disconnect();
  };

  return (
    <DashboardContext.Provider value={{ token, role, rooms, alerts, orders, saveSession, logout, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
