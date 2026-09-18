// Seed data shaped exactly like the payloads the real API endpoints should
// return. Replace this file's contents with live data once the backend
// (GET /api/tenant, /api/tickets, /api/billing, /api/notifications) exists.

export const db = {
  tenant: {
    id: 'usr_4021',
    firstName: 'Alex',
    lastName: 'Rivers',
    unit: '402',
    building: 'Building A',
    avatarUrl: null,
    rentDueDate: '2024-11-01',
    currentBalance: 2450.0,
    autoPayEnabled: true,
    daysUntilRentDue: 12,
  },

  utilityUsage: {
    cycleLabel: 'Current billing cycle',
    electricity: { used: 380, limit: 500, unit: 'kWh', deltaVsNeighbors: -12 },
    water: { used: 1120, limit: 2000, unit: 'Gal' },
  },

  managementTools: [
    {
      id: 'maintenance',
      title: 'Maintenance',
      description: 'Report leaks, electrical issues, or structural repairs.',
      icon: 'wrench',
      route: '/maintenance',
    },
    {
      id: 'billing',
      title: 'Billing Center',
      description: 'View utility breakdowns and download past invoices.',
      icon: 'history',
      route: '/billing',
    },
    {
      id: 'tracking',
      title: 'Live Tracking',
      description: 'Monitor the real-time status of your open tickets.',
      icon: 'shield',
      route: '/maintenance',
    },
  ],

  recentActivity: [
    { id: 'act_1', title: 'Rent Payment Processed', timestamp: '2023-10-01T09:12:00', status: 'Successful' },
    { id: 'act_2', title: 'Sink Repair Assigned', timestamp: '2023-10-24T10:30:00', status: 'Scheduled' },
    { id: 'act_3', title: 'AC Unit Service', timestamp: '2023-10-23T14:00:00', status: 'Completed' },
    { id: 'act_4', title: 'System Security Update', timestamp: '2023-10-20T11:15:00', status: 'Applied' },
  ],

  // Placeholder ticket only — replace with real data once the backend is connected.
  tickets: [
    {
      id: 'TKT-0000',
      category: 'General',
      title: 'Placeholder Maintenance Request',
      priority: 'Low',
      stage: 'Submitted', // Submitted | Assigned | In Progress | Resolved
      submittedAt: null,
      updatedAt: null,
      estimatedCompletion: null,
      description: 'No request details yet.',
      location: '—',
      specialist: {
        name: 'Unassigned',
        title: '',
        rating: 0,
        reviewCount: 0,
        eta: null,
        status: 'Not started',
        phone: null,
      },
      attachments: [],
      safetyNote: '',
      timeline: [],
    },
  ],

  serviceHealth: {
    averageResponseHours: 0.0,
    resolutionRate: 0,
  },

  billing: {
    currentBalanceDue: 0.0,
    dueDate: null,
    autoPayActive: false,
    breakdown: [
      { label: 'Monthly Rent', amount: 0.0 },
      { label: 'Parking', amount: 0.0 },
      { label: 'Utilities Total', amount: 0.0 },
    ],
    paymentMethod: {
      brand: 'Card',
      last4: '0000',
      expiry: '00/00',
      isPrimary: true,
    },
    utilityBreakdowns: [
      { id: 'electricity', label: 'Electricity', value: 0, unit: 'kWh', deltaLabel: 'No change', trend: 'flat', usageVsLimit: 0 },
      { id: 'water', label: 'Water Usage', value: 0, unit: 'Gallons', deltaLabel: 'No change', trend: 'flat', usageVsLimit: 0 },
      { id: 'internet', label: 'Internet Data', value: 0, unit: 'GB', deltaLabel: 'No change', trend: 'flat', usageVsLimit: 0 },
      { id: 'facility', label: 'Facility Services', value: null, unit: 'Flat Rate', deltaLabel: 'No change', trend: 'flat', usageVsLimit: 0 },
    ],
    // Intentionally empty: no live transactions until the backend is connected.
    transactions: [],
    totalTransactionCount: 0,
  },

  // Intentionally empty: no live notifications until the backend is
  // connected. The Notification Center page shows a static template card
  // (not sourced from this array) so the intended card design stays visible.
  notifications: [],

  ticketCategories: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Locksmith', 'Structural', 'Pest Control', 'Other'],
};
