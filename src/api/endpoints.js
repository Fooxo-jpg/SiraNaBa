import { api } from './client.js';

export const endpoints = {
  getTenant: () => api.get('/api/tenant'),
  getDashboardSummary: () => api.get('/api/dashboard/summary'),

  getTickets: () => api.get('/api/tickets'),
  getTicket: (id) => api.get(`/api/tickets/${id}`),
  createTicket: (payload) => api.post('/api/tickets', payload),
  updateTicket: (id, payload) => api.patch(`/api/tickets/${id}`, payload),

  getBilling: () => api.get('/api/billing'),

  getNotifications: () => api.get('/api/notifications'),
  markAllNotificationsRead: () => api.post('/api/notifications/mark-all-read'),
  markNotificationRead: (id) => api.patch(`/api/notifications/${id}/read`),

  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),
};
