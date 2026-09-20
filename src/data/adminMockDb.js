// Admin Portal data shell.
//
// All demo/mock records have been cleared. Every export keeps the exact shape
// the admin pages expect, but lists are empty and values are placeholders
// (0, '—') until a real backend is connected. Swap these for API calls
// (see src/api/endpoints.js) when the admin endpoints exist.

export const PLACEHOLDER = '—';

export const adminUser = { name: 'Administrator', role: PLACEHOLDER };

export const commandCenter = {
  stats: [
    { id: 'incidents', label: 'Active Incidents', value: '0', delta: PLACEHOLDER, tone: 'neutral', icon: 'alert' },
    { id: 'uptime', label: 'System Uptime', value: PLACEHOLDER, delta: PLACEHOLDER, tone: 'neutral', icon: 'trend' },
    { id: 'dispatch', label: 'Pending Dispatch', value: '0', delta: PLACEHOLDER, tone: 'neutral', icon: 'clock' },
    { id: 'devices', label: 'Total Devices', value: '0', delta: PLACEHOLDER, tone: 'neutral', icon: 'grid' },
  ],
  systemHealth: {
    title: 'Enterprise Infrastructure Telemetry',
    description: 'No telemetry data is available yet. Connect a data source to monitor properties and server nodes.',
    metrics: [
      { label: 'Network Latency', value: PLACEHOLDER },
      { label: 'Error Rate', value: PLACEHOLDER },
      { label: 'CPU Load', value: PLACEHOLDER },
      { label: 'DB Threads', value: PLACEHOLDER },
    ],
  },
  dispatchQueue: [],
  eventStream: [],
  staffReadiness: {
    onSiteTechnicians: { current: 0, total: 0 },
    inventoryAvailability: 0,
    emergencyProtocol: PLACEHOLDER,
    energyOptimization: PLACEHOLDER,
  },
  systemIntegrity: [],
};

export const triageDispatch = {
  stats: [
    { id: 'emergencies', label: 'Active Emergencies', value: '0', delta: PLACEHOLDER, tone: 'neutral', icon: 'alert' },
    { id: 'queue', label: 'Unassigned Queue', value: '0', delta: PLACEHOLDER, tone: 'neutral', icon: 'clock' },
    { id: 'staff', label: 'Staff On-Site', value: '0', delta: PLACEHOLDER, tone: 'neutral', icon: 'wrench' },
    { id: 'completed', label: 'Completed Today', value: '0', delta: PLACEHOLDER, tone: 'neutral', icon: 'check' },
  ],
  tickets: [],
  totalUnassigned: 0,
  dispatchedCount: 0,
  technicians: [], // [{ id, name, specialty }]
  coordinationHub: [],
  coordinator: { name: PLACEHOLDER, title: 'No coordinator assigned' },
  // Static reference policy text (not sample data).
  hazardGuidelines: [
    { level: 'Critical Response', tone: 'danger', text: 'Dispatch within 15m. Requires immediate building manager notification.' },
    { level: 'High Priority', tone: 'progress', text: 'Dispatch within 60m. Safety hazard with no immediate property damage.' },
  ],
};

export const tenantManagement = {
  tenants: [], // see TenantManagement.jsx for the record shape
  recentActivity: [],
  systemTasks: [], // [{ id, label, progress: 0..1 }]
};

export const staffManagement = {
  // Option lists used by filters/forms (configuration, not sample data).
  specialties: ['Electrician', 'Plumber', 'HVAC Specialist', 'General Repair', 'Cleaner'],
  capacityGroups: [
    { label: 'Electrical Engineering', specialties: ['Electrician'], color: 'bg-amber-500' },
    { label: 'Mechanical & HVAC', specialties: ['HVAC Specialist'], color: 'bg-blue-500' },
    { label: 'Hydraulic & Plumbing', specialties: ['Plumber'], color: 'bg-cyan-500' },
    { label: 'General Facility Repair', specialties: ['General Repair', 'Cleaner'], color: 'bg-forest-400' },
  ],
  // Staff roster now lives in the "staff" MongoDB collection (see
  // src/api/endpoints.js: getStaff/createStaff/updateStaff/removeStaff).
  // StaffManagement.jsx fetches it at load time; nothing is hardcoded here.
  staff: [], // record shape: { id, staffCode, name, specialty, availability, workload, tickets, email, phone }
  incidentReadiness: null, // percentage number once available
  operationalStatus: [
    { icon: 'shield', label: 'Security Clearance', detail: PLACEHOLDER, tone: 'neutral' },
    { icon: 'clock', label: 'Shift Overlap', detail: PLACEHOLDER, tone: 'neutral' },
  ],
  version: null,
};

export const configuration = {
  systemStatus: [
    { id: 'broker', label: 'Event Broker', status: PLACEHOLDER, icon: 'bolt', metrics: [{ label: 'Queue Depth:', value: PLACEHOLDER }, { label: 'Throughput:', value: PLACEHOLDER }] },
    { id: 'db', label: 'MongoDB Store', status: PLACEHOLDER, icon: 'database', metrics: [{ label: 'Storage Used:', value: PLACEHOLDER }, { label: 'Uptime:', value: PLACEHOLDER }] },
    { id: 'dispatch', label: 'Dispatch Cluster', status: PLACEHOLDER, icon: 'trend', metrics: [{ label: 'Nodes Online:', value: PLACEHOLDER }, { label: 'Failover:', value: PLACEHOLDER }] },
  ],
  logs: [],
  version: PLACEHOLDER,
  sessionRemaining: PLACEHOLDER,
};

export const iotEmergency = {
  activeCriticalAlerts: 0,
  bannerText: '',
  alerts: [],
  telemetry: { sensorNetwork: PLACEHOLDER, powerStability: null, activeNodes: 0, latencyMs: null },
  emergencyPersonnel: [],
  incidentCommand: [
    { label: 'Fire Dispatch', number: PLACEHOLDER },
    { label: 'Emergency Medical', number: PLACEHOLDER },
    { label: 'Security HQ', number: PLACEHOLDER },
  ],
};
