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

  tickets: [
    {
      id: 'TKT-2901',
      category: 'Plumbing',
      title: 'Kitchen Sink Faucet Leaking',
      priority: 'High',
      stage: 'In Progress', // Submitted | Assigned | In Progress | Resolved
      submittedAt: '2023-10-24T00:00:00',
      updatedAt: '2023-10-24T10:20:00',
      description:
        'The main faucet in the kitchen is dripping constantly, even when tightened fully. It started two days ago and is getting worse.',
      location: 'Kitchen / Main Sink',
      specialist: { name: 'Marcus Johnson', title: 'Certified Facility Technician' },
      attachments: [{ id: 'att_1', url: null, label: 'Leak photo' }],
      safetyNote: 'Please keep children and pets away from the affected area.',
      timeline: [
        {
          id: 'tl_1',
          title: 'Technician Arrival',
          detail: 'Marcus Johnson arrived at Unit 402 and confirmed the leak on the kitchen faucet assembly.',
          timestamp: '2023-10-24T10:42:00',
        },
        {
          id: 'tl_2',
          title: 'Request Assigned',
          detail: 'Ticket assigned to Marcus Johnson (Plumbing Specialist).',
          timestamp: '2023-10-24T08:15:00',
        },
        {
          id: 'tl_3',
          title: 'Ticket Received',
          detail: 'Your request was successfully logged into our system and prioritized.',
          timestamp: '2023-10-23T17:30:00',
        },
      ],
    },
    {
      id: 'TKT-2854',
      category: 'HVAC',
      title: 'Bedroom AC Unit Making Noise',
      priority: 'Medium',
      stage: 'Assigned',
      submittedAt: '2023-10-24T00:00:00',
      updatedAt: '2023-10-24T08:00:00',
      description: 'The bedroom AC unit makes a rattling noise on startup.',
      location: 'Bedroom',
      specialist: { name: 'Unassigned', title: '' },
      attachments: [],
      safetyNote: '',
      timeline: [],
    },
    {
      id: 'TKT-2712',
      category: 'Electrical',
      title: 'Balcony Light Fixture Replacement',
      priority: 'Low',
      stage: 'Submitted',
      submittedAt: '2023-10-25T00:00:00',
      updatedAt: '2023-10-25T00:01:00',
      description: 'Balcony light fixture flickers and needs replacement.',
      location: 'Balcony',
      specialist: { name: 'Unassigned', title: '' },
      attachments: [],
      safetyNote: '',
      timeline: [],
    },
    {
      id: 'TKT-2640',
      category: 'Locksmith',
      title: 'Sticking Front Door Lock',
      priority: 'Medium',
      stage: 'Resolved',
      submittedAt: '2023-10-15T00:00:00',
      updatedAt: '2023-10-17T00:00:00',
      description: 'Front door lock sticks when turning the key.',
      location: 'Front Door',
      specialist: { name: 'Robert Chen', title: 'Certified Facility Technician' },
      attachments: [],
      safetyNote: '',
      timeline: [],
    },
  ],

  serviceHealth: {
    averageResponseHours: 4.2,
    resolutionRate: 0.98,
  },

  billing: {
    currentBalanceDue: 2450.0,
    dueDate: '2024-06-01',
    autoPayActive: true,
    breakdown: [
      { label: 'Monthly Rent', amount: 2100.0 },
      { label: 'Parking (Spot #42)', amount: 150.0 },
      { label: 'Utilities Total', amount: 200.0 },
    ],
    paymentMethod: {
      brand: 'Visa',
      last4: '8842',
      expiry: '12/26',
      isPrimary: true,
    },
    utilityBreakdowns: [
      { id: 'electricity', label: 'Electricity', value: 412, unit: 'kWh', deltaLabel: '12% vs last month', trend: 'up', usageVsLimit: 0.72 },
      { id: 'water', label: 'Water Usage', value: 2450, unit: 'Gallons', deltaLabel: '4% vs last month', trend: 'down', usageVsLimit: 0.72 },
      { id: 'internet', label: 'Internet Data', value: 842, unit: 'GB', deltaLabel: '22% vs last month', trend: 'up', usageVsLimit: 0.72 },
      { id: 'facility', label: 'Facility Services', value: null, unit: 'Flat Rate', deltaLabel: 'No change', trend: 'flat', usageVsLimit: 0.72 },
    ],
    transactions: [
      { id: 'TXN-48892', title: 'Monthly Rent & Utilities (May)', date: '2024-05-01', amount: 2450.0, status: 'Completed' },
      { id: 'TXN-39821', title: 'Maintenance Fee - Emergency Plumbing', date: '2024-04-15', amount: 75.0, status: 'Completed' },
      { id: 'TXN-39410', title: 'Monthly Rent & Utilities (April)', date: '2024-04-01', amount: 2380.0, status: 'Completed' },
      { id: 'TXN-38992', title: 'Late Payment Charge', date: '2024-03-12', amount: 50.0, status: 'Failed' },
      { id: 'TXN-38771', title: 'Monthly Rent & Utilities (March)', date: '2024-03-01', amount: 2380.0, status: 'Completed' },
    ],
    totalTransactionCount: 24,
  },

  // Intentionally empty: no live notifications until the backend is
  // connected. The Notification Center page shows a static template card
  // (not sourced from this array) so the intended card design stays visible.
  notifications: [],

  ticketCategories: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Locksmith', 'Structural', 'Pest Control', 'Other'],
};
