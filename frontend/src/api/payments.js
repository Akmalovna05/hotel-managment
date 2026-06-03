import api from './client'

export const paymentsApi = {
  analytics: () => api.get('/payments/analytics/'),
  bookingStatus: (bookingId) => api.get(`/payments/booking-status/${bookingId}/`),

  invoices: (params) => api.get('/payments/invoices/', { params }),
  invoice: (id) => api.get(`/payments/invoices/${id}/`),
  generateInvoice: (bookingId) => api.post('/payments/invoices/generate/', { booking: bookingId }),
  exportInvoice: (id) => api.get(`/payments/invoices/${id}/export/`, { responseType: 'blob' }),

  records: (params) => api.get('/payments/records/', { params }),
  record: (id) => api.get(`/payments/records/${id}/`),
  history: (params) => api.get('/payments/records/history/', { params }),
  createRecord: (data) => api.post('/payments/records/', data),
  processCard: (data) => api.post('/payments/records/process_card/', data),
  markPaid: (data) => api.post('/payments/records/mark_paid/', data),
  refund: (id, data) => api.post(`/payments/records/${id}/refund/`, data),
  receipt: (id) => api.get(`/payments/records/${id}/receipt/`, { responseType: 'blob' }),

  transactions: (params) => api.get('/payments/transactions/', { params }),
}
