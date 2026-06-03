import axios from 'axios'
import { store } from '../store'
import { logout } from '../store/authSlice'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          store.dispatch(logout())
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  refresh: (refresh) => api.post('/auth/refresh/', { refresh }),
  profile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (data) => api.post('/auth/change-password/', data),
  forgotPassword: (data) => api.post('/auth/forgot-password/', data),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
}

export const endpoints = {
  dashboard: () => api.get('/dashboard/'),
  rooms: (params) => api.get('/rooms/', { params }),
  room: (id) => api.get(`/rooms/${id}/`),
  createRoom: (data) => api.post('/rooms/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateRoom: (id, data) => api.patch(`/rooms/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteRoom: (id) => api.delete(`/rooms/${id}/`),
  roomAvailability: (params) => api.get('/rooms/availability/', { params }),
  guests: (params) => api.get('/guests/', { params }),
  guest: (id) => api.get(`/guests/${id}/`),
  createGuest: (data) => api.post('/guests/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateGuest: (id, data) => api.patch(`/guests/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteGuest: (id) => api.delete(`/guests/${id}/`),
  guestBookings: (id) => api.get(`/guests/${id}/bookings/`),
  guestInvoices: (id) => api.get(`/guests/${id}/invoices/`),
  bookings: (params) => api.get('/bookings/', { params }),
  booking: (id) => api.get(`/bookings/${id}/`),
  createBooking: (data) => api.post('/bookings/', data),
  updateBooking: (id, data) => api.patch(`/bookings/${id}/`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}/`),
  checkIn: (id) => api.post(`/bookings/${id}/check_in/`),
  checkOut: (id) => api.post(`/bookings/${id}/check_out/`),
  cancelBooking: (id) => api.post(`/bookings/${id}/cancel/`),
  bookingCalendar: () => api.get('/bookings/calendar/'),
  bookingTimeline: () => api.get('/bookings/timeline/'),
  bookingInvoice: (id) => api.get(`/bookings/${id}/invoice/`, { responseType: 'blob' }),
  housekeeping: (params) => api.get('/housekeeping/', { params }),
  createHousekeeping: (data) => api.post('/housekeeping/', data),
  updateHousekeeping: (id, data) => api.patch(`/housekeeping/${id}/`, data),
  completeHousekeeping: (id) => api.post(`/housekeeping/${id}/complete/`),
  housekeepingReport: () => api.get('/housekeeping/report/'),
  maintenance: (params) => api.get('/maintenance/', { params }),
  createMaintenance: (data) => api.post('/maintenance/', data),
  updateMaintenance: (id, data) => api.patch(`/maintenance/${id}/`, data),
  resolveMaintenance: (id) => api.post(`/maintenance/${id}/resolve/`),
  staff: (params) => api.get('/staff/', { params }),
  createStaff: (data) => api.post('/staff/', data),
  updateStaff: (id, data) => api.patch(`/staff/${id}/`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}/`),
  users: (params) => api.get('/users/', { params }),
  createUser: (data) => api.post('/users/', data),
  updateUser: (id, data) => api.patch(`/users/${id}/`, data),
  notifications: () => api.get('/notifications/'),
  markNotificationRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllNotificationsRead: () => api.post('/notifications/mark_all_read/'),
  activities: () => api.get('/activities/'),
}
