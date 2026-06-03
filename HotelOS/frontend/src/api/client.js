import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({ baseURL: API_URL });

// NASA Standard: Every request must have a unique ID for telemetry tracking
api.interceptors.request.use((config) => {
  const correlationId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  config.headers['x-correlation-id'] = correlationId;
  return config;
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function login(username, password) {
  try {
    const { data } = await api.post('/api/auth/login', { username, password });
    return data;
  } catch (error) {
    console.error('[NASA Telemetry] Login failed:', error.response?.data || error.message);
    throw error;
  }
}

export async function fetchRooms() {
  const { data } = await api.get('/api/reception/rooms/availability');
  return data.rooms;
}

export async function checkIn(bookingReference) {
  try {
    const { data } = await api.post('/api/reception/check-in', { bookingReference });
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Check-in failed';
    throw new Error(errorMsg);
  }
}

export async function checkOut(bookingReference) {
  try {
    const { data } = await api.post('/api/reception/check-out', { bookingReference });
    return data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Check-out failed';
    throw new Error(errorMsg);
  }
}

export async function completeCleaning(roomNumber, staffName) {
  const { data } = await api.post('/api/housekeeping/tasks/complete', { roomNumber, staffName });
  return data;
}

export async function createMaintenanceTicket(payload) {
  const { data } = await api.post('/api/maintenance/tickets', payload);
  return data;
}

export async function createOrder(payload) {
  const { data } = await api.post('/api/roomservice/orders', payload);
  return data;
}
