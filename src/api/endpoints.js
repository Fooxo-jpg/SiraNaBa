import { api } from './client.js';

export const endpoints = {
  getTenant: () => api.get('/api/tenant'),
  getDashboardSummary: () => api.get('/api/dashboard/summary'),

  getTickets: () => api.get('/api/tickets'),
  getTicketCategories: () => api.get('/api/tickets/categories'),
  getTicket: (id) => api.get(`/api/tickets/${id}`),
  createTicket: (payload) => api.post('/api/tickets', payload),
  updateTicket: (id, payload) => api.patch(`/api/tickets/${id}`, payload),

  getBilling: () => api.get('/api/billing'),

  getNotifications: () => api.get('/api/notifications'),
  markAllNotificationsRead: () => api.post('/api/notifications/mark-all-read'),
  markNotificationRead: (id) => api.patch(`/api/notifications/${id}/read`),

  login: (email, password, remember = false) =>
    api.post('/api/auth/login', { email, password, remember }),
  logout: () => api.post('/api/auth/logout'),
  getMe: () => api.get('/api/auth/me'),
};
