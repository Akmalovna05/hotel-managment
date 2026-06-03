import axios from 'axios'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const publicBookingApi = {
  rooms: (params) => publicApi.get('/public/rooms/', { params }),
  room: (id) => publicApi.get(`/public/rooms/${id}/`),
  createBooking: (data) => publicApi.post('/public/bookings/', data),
  checkout: (reference) => publicApi.get(`/public/checkout/${reference}/`),
  pay: (data) => publicApi.post('/public/pay/', data),
  confirmation: (reference) => publicApi.get(`/public/confirmation/${reference}/`),
  paymentHistory: (reference) => publicApi.get(`/public/history/${reference}/`),
  downloadReceipt: (reference) =>
    publicApi.get(`/public/receipt/${reference}/`, { responseType: 'blob' }),
  downloadInvoice: (reference) =>
    publicApi.get(`/public/invoice/${reference}/`, { responseType: 'blob' }),
}
