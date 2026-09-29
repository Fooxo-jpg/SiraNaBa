import { api } from './client.js';

const toQuery = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
  const str = q.toString();
  return str ? `?${str}` : '';
};

export const endpoints = {
  getMonthlyMaintenance: () => api.get('/api/admin/monthly-maintenance'),
  updateMonthlyMaintenance: (date, invoiceNoticeDays) => api.put('/api/admin/monthly-maintenance', { date, invoiceNoticeDays }),
  getCommandCenter: () => api.get('/api/admin/command-center'),
  getTenant: () => api.get('/api/tenant'),
  updateTenantProfile: (payload) => api.patch('/api/tenant', payload),
  getDashboardSummary: () => api.get('/api/dashboard/summary'),

  getTickets: () => api.get('/api/tickets'),
  getTicketCategories: () => api.get('/api/tickets/categories'),
  getTicket: (id) => api.get(`/api/tickets/${id}`),
  createTicket: (payload) => api.post('/api/tickets', payload),
  updateTicket: (id, payload) => api.patch(`/api/tickets/${id}`, payload),
  updateTicketReportDetails: (id, payload) => api.post(`/api/admin/tickets/${id}/report-details`, payload),
  getAdminTickets: () => api.get('/api/admin/tickets'),
  assignAdminTicket: (ticketId, staffId) => api.post(`/api/admin/tickets/${ticketId}/assign`, { staffId }),
  markAdminTicketArrived: (ticketId) => api.post(`/api/admin/tickets/${ticketId}/dispatch-status`, { status: 'Arrived' }),
  updateAdminDispatchStatus: (ticketId, status) => api.post(`/api/admin/tickets/${ticketId}/dispatch-status`, { status }),

  getBilling: () => api.get('/api/billing'),
  addPaymentMethod: (payload) => api.post('/api/billing/payment-methods', payload),
  setPrimaryPaymentMethod: (id) => api.patch(`/api/billing/payment-methods/${id}/primary`),
  removePaymentMethod: (id) => api.delete(`/api/billing/payment-methods/${id}`),
  // Explicitly simulated checkout; server validates the selected obligation and exact allocations.
  pay: (payload) => api.post('/api/billing/pay', payload),

  getNotifications: () => api.get('/api/notifications'),
  markAllNotificationsRead: () => api.post('/api/notifications/mark-all-read'),
  markNotificationRead: (id) => api.patch(`/api/notifications/${id}/read`),

  // Admin: these read/write the same tenant records the tenant portal uses,
  // so an edit made on either side shows up on the other.
  getAdminTenants: () => api.get('/api/admin/tenants'),
  // Creates the tenant record + login and emails the credentials.
  registerTenant: (payload) => api.post('/api/admin/tenants', payload),
  updateAdminTenant: (tenantId, payload) => api.patch(`/api/admin/tenants/${tenantId}`, payload),
  // Issues a monthly statement with metered utilities. The tenant sees the same
  // balance and breakdown in Billing & Payments immediately after refresh.
  presentTenantBill: (tenantId, payload) => api.post(`/api/admin/tenants/${tenantId}/bills`, payload),
  markTenantPaid: (tenantId, payload) => api.post(`/api/admin/tenants/${tenantId}/mark-paid`, payload),
  reconcileTenantBilling: (tenantId, payload) => api.post(`/api/admin/tenants/${tenantId}/billing/reconcile`, payload),
  issueTenantRent: (tenantId, payload) => api.post(`/api/admin/tenants/${tenantId}/rent`, payload),
  // Admin: payments made in the tenant portal (reference code, mode, time) and saved payment methods.
  getAdminRecentPayments: (limit = 10) => api.get(`/api/admin/payments?limit=${limit}`),
  getAdminTenantPayments: (tenantId) => api.get(`/api/admin/payments/tenant/${tenantId}`),
  removeTenantAccount: (tenantId) => api.delete(`/api/admin/tenants/${tenantId}`),

  // Admin > Configuration: live MongoDB connection, version, sizes and collections.
  getDatabaseStatus: () => api.get('/api/admin/system/database'),
  cleanDatabase: (payload) => api.post('/api/admin/system/database/clean', payload),
  getSystemLogs: () => api.get('/api/admin/system/logs'),
  // Audit trail export. params: { from, to, level, action, tag } (all optional, dates are YYYY-MM-DD).
  getAuditLogSummary: (params = {}) => api.get(`/api/admin/system/logs/summary${toQuery(params)}`),
  downloadAuditLog: (format, params = {}) => api.download(`/api/admin/system/logs/export${toQuery({ ...params, format })}`),

  // Admin > Staff Management: the maintenance workforce roster.
  getStaff: () => api.get('/api/admin/staff'),
  createStaff: (payload) => api.post('/api/admin/staff', payload),
  updateStaff: (staffId, payload) => api.patch(`/api/admin/staff/${staffId}`, payload),
  toggleStaffAvailability: (staffId) => api.post(`/api/admin/staff/${staffId}/toggle-availability`),
  removeStaff: (staffId) => api.delete(`/api/admin/staff/${staffId}`),

  login: (email, password, remember = false) =>
    api.post('/api/auth/login', { email, password, remember }),
  logout: () => api.post('/api/auth/logout'),
  getMe: () => api.get('/api/auth/me'),
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword, confirmPassword }),
};
