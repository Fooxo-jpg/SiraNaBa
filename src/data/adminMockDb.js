// Static demo data for the Admin Portal. This mirrors the Visily mockup
// content directly - it's a UI demo for internal/admin testing, not wired
// to a live backend the way the tenant portal is.

export const adminUser = { name: 'Alex Rivers', role: 'Admin Lead' };

export const commandCenter = {
  stats: [
    { id: 'incidents', label: 'Active Incidents', value: '12', delta: '+3 from last hour', tone: 'danger', icon: 'alert' },
    { id: 'uptime', label: 'System Uptime', value: '99.98%', delta: 'Last 30 days', tone: 'success', icon: 'trend' },
    { id: 'dispatch', label: 'Pending Dispatch', value: '08', delta: 'Average wait: 14m', tone: 'neutral', icon: 'clock' },
    { id: 'devices', label: 'Total Devices', value: '1,402', delta: '98% Online', tone: 'neutral', icon: 'grid' },
  ],
  systemHealth: {
    title: 'Enterprise Infrastructure Telemetry',
    description:
      'Monitoring real-time connectivity across 4 properties and 12 server nodes. All primary gateways are currently operational with green status.',
    metrics: [
      { label: 'Network Latency', value: '14ms avg' },
      { label: 'Error Rate', value: '0.002%' },
      { label: 'CPU Load', value: '24.5%' },
      { label: 'DB Threads', value: '112 Active' },
    ],
  },
  dispatchQueue: [
    { id: 'WO-8821', age: '12m ago', title: 'Elevator B-1 Stuck', location: 'Skyline Towers' },
    { id: 'WO-8819', age: '18m ago', title: 'Water Leakage - Unit 402', location: 'Willow Gardens' },
    { id: 'WO-8815', age: '34m ago', title: 'Security Gate Failure', location: 'Nexus Hub' },
  ],
  eventStream: [
    { time: '10:42:01', assetId: 'GW-4402', event: 'HVAC Temp Threshold Exceeded', priority: 'Critical' },
    { time: '10:41:45', assetId: 'LCK-092', event: 'Forced Entry Attempt (Main Hall)', priority: 'High' },
    { time: '10:40:12', assetId: 'SNR-112', event: 'Routine Calibration Complete', priority: 'Low' },
    { time: '10:38:59', assetId: 'PMP-A1', event: 'Vibration Anomaly Detected', priority: 'Medium' },
    { time: '10:35:22', assetId: 'GW-4402', event: 'Heartbeat Restored', priority: 'Informational' },
  ],
  staffReadiness: {
    onSiteTechnicians: { current: 14, total: 20 },
    inventoryAvailability: 0.92,
    emergencyProtocol: 'Level 1 - Standard Ops',
    energyOptimization: 'Active - 4% Savings Today',
  },
  systemIntegrity: [
    { level: 'log', text: 'Backup sequence initiated...' },
    { level: 'ok', text: 'Cloud sync successful.' },
    { level: 'err', text: 'Gateway 10-A handshake timeout.' },
  ],
};

export const triageDispatch = {
  stats: [
    { id: 'emergencies', label: 'Active Emergencies', value: '03', delta: '+2 since last hour', tone: 'danger', icon: 'alert' },
    { id: 'queue', label: 'Unassigned Queue', value: '12', delta: 'Avg. Wait: 18m', tone: 'neutral', icon: 'clock' },
    { id: 'staff', label: 'Staff On-Site', value: '08', delta: '85% Utilization', tone: 'neutral', icon: 'wrench' },
    { id: 'completed', label: 'Completed Today', value: '24', delta: 'Target: 30', tone: 'success', icon: 'check' },
  ],
  tickets: [
    { id: 'WO-8821', subject: 'Main Water Line Leak - Building B Lobby', location: 'Building B, Ground Floor', severity: 'Critical', category: 'Plumbing', reported: '12 mins ago', assignee: null },
    { id: 'WO-8819', subject: 'Elevator Panel Electrical Short', location: 'Building A, Elevator 2', severity: 'Critical', category: 'Electrical', reported: '24 mins ago', assignee: null },
    { id: 'WO-8815', subject: 'Exposed Rebar on Level 4 Balcony', location: 'Parking Structure, L4', severity: 'High', category: 'Structural', reported: '1 hour ago', assignee: 'John Miller' },
    { id: 'WO-8798', subject: 'Blocked Fire Exit Door Jammed', location: 'Building C, Wing 2', severity: 'Critical', category: 'Fire Safety', reported: '2 hours ago', assignee: null },
    { id: 'WO-8792', subject: 'HVAC Unit Rattle Complaint', location: 'Building A, Room 402', severity: 'Medium', category: 'General', reported: '4 hours ago', assignee: 'Sarah Chen' },
    { id: 'WO-8785', subject: 'Cracked Pavement Near Entrance', location: 'Main Gate Access', severity: 'Low', category: 'General', reported: '6 hours ago', assignee: null },
  ],
  totalUnassigned: 12,
  coordinationHub: [
    { id: 'ev1', name: 'John Miller', action: 'arrived at Building A', link: 'Elevator 2', time: '5m ago' },
    { id: 'ev2', name: 'Sarah Chen', action: 'updated WO-8792 status to', link: 'Pending Parts', time: '12m ago' },
    { id: 'ev3', name: 'Mike Ross', action: 'completed emergency repair', link: 'WO-8801 - Water Leak', time: '20m ago' },
  ],
  coordinator: { name: 'Marcus Thorne', title: 'Maintenance Coordinator' },
  hazardGuidelines: [
    { level: 'Critical Response', tone: 'danger', text: 'Dispatch within 15m. Requires immediate building manager notification.' },
    { level: 'High Priority', tone: 'progress', text: 'Dispatch within 60m. Safety hazard with no immediate property damage.' },
  ],
};

export const tenantFinancial = {
  stats: [
    { id: 'receivables', label: 'Total Receivables', value: '$142,500.00', delta: '+12.5%', tone: 'success' },
    { id: 'utilities', label: 'Pending Utilities', value: '$4,280.45', delta: '+2.4%', tone: 'success' },
    { id: 'outflow', label: 'Operational Outflow', value: '$32,150.00', delta: '-5.1%', tone: 'danger' },
    { id: 'delinquencies', label: 'Active Delinquencies', value: '8 Units', delta: 'No Change', tone: 'neutral' },
  ],
  ledgers: [
    { unit: 'Unit 402-A', tenant: 'Sarah Jenkins', status: 'Active', leaseEnd: '2024-12-15', balance: 0 },
    { unit: 'Unit 110-B', tenant: 'Michael Chen', status: 'Active', leaseEnd: '2025-03-20', balance: 1250.0 },
    { unit: 'Unit 305-C', tenant: 'Elena Rodriguez', status: 'Delinquent', leaseEnd: '2024-08-30', balance: 3400.5 },
    { unit: 'Unit 201-A', tenant: 'David Smith', status: 'Active', leaseEnd: '2025-01-10', balance: -450.0 },
    { unit: 'Unit 512-D', tenant: 'Aisha Khan', status: 'Eviction', leaseEnd: '2024-05-12', balance: 8200.0 },
  ],
  recentActivity: [
    { icon: 'check', tone: 'success', title: 'Utility Invoice Generated', detail: 'Batch #MAY-24 successfully processed for 142 units.', time: '2 hours ago' },
    { icon: 'alert', tone: 'progress', title: 'Late Fee Warning', detail: 'System auto-notified 8 tenants regarding outstanding balances.', time: '5 hours ago' },
    { icon: 'grid', tone: 'neutral', title: 'Tenant Onboarding Completed', detail: 'Lease records finalized for Sarah Jenkins (Unit 402-A).', time: '1 day ago' },
  ],
  upcomingCycle: {
    nextRentDue: 'June 1, 2024',
    daysRemaining: 3,
    totalCycleDays: 30,
    events: [
      { label: 'Utility Read Cutoff', detail: 'May 31, 23:59 EST', icon: 'calendar' },
      { label: 'ACH Batch Release', detail: 'June 3, 09:00 EST', icon: 'card' },
    ],
  },
};

export const configuration = {
  systemStatus: [
    { id: 'broker', label: 'Event Broker', status: 'Healthy', icon: 'bolt', metrics: [{ label: 'Queue Depth:', value: '0 msgs' }, { label: 'Throughput:', value: '1,242 req/s' }] },
    { id: 'db', label: 'MongoDB Store', status: 'Connected', icon: 'database', metrics: [{ label: 'Storage Used:', value: '42.8 GB / 100 GB' }, { label: 'Uptime:', value: '154d 12h 04m' }] },
    { id: 'dispatch', label: 'Dispatch Cluster', status: 'Degraded', icon: 'trend', metrics: [{ label: 'Nodes Online:', value: '2 / 3 Active' }, { label: 'Failover:', value: 'AUTO_ENABLED' }] },
  ],
  logs: [
    { time: '2024-05-20 14:22:01.442', level: 'INFO', tag: 'STORAGE', text: 'WiredTiger message: [1716214921:442436][2341:0x7f300c], checkpoint-cleanup: [checkpoint-cleanup] completed' },
    { time: '2024-05-20 14:21:55.109', level: 'WARN', tag: 'COMMAND', text: 'Slow query detected on collection "SiraNaBa.events": 142ms. Operation: find({ status: "PENDING" })' },
    { time: '2024-05-20 14:20:12.883', level: 'INFO', tag: 'NETWORK', text: 'Accepted connection from 10.0.42.181:54228 #4412 (11 connections now open)' },
    { time: '2024-05-20 14:18:44.001', level: 'ERROR', tag: 'REPLICA', text: 'Heartbeat to peer node-admin-02 failed after 3 retries. Error: Network unreachable' },
    { time: '2024-05-20 14:15:33.229', level: 'DEBUG', tag: 'ACCESS', text: 'Authenticated user "svc_dispatcher" on database "admin" using SCRAM-SHA-256' },
  ],
  version: 'SiraNaBa Core v4.2.1-stable',
  sessionRemaining: 'Admin Session: 12h remaining',
};

export const iotEmergency = {
  activeCriticalAlerts: 2,
  bannerText: 'North Wing suppression system engaged. Security dispatch in transit.',
  alerts: [
    {
      id: 'EM-782',
      time: '14:22:05',
      type: 'FIRE ALERT',
      icon: 'flame',
      severity: 'Critical',
      location: 'North Wing - Level 4',
      detail: 'Smoke detected in Server Room 402B. Suppression system armed.',
    },
    {
      id: 'EM-781',
      time: '14:15:30',
      type: 'SECURITY ALERT',
      icon: 'shield',
      severity: 'Warning',
      location: 'Parking Gate C',
      detail: 'Unauthorized access attempt detected at secondary exit.',
    },
  ],
  telemetry: { sensorNetwork: '100% Online', powerStability: 0.984, activeNodes: 1240, latencyMs: 12 },
  emergencyPersonnel: [
    { name: 'Alex Rivers', role: 'Admin Lead • On-Site', status: 'Active' },
    { name: 'Maintenance Team A', role: 'Responding to Gate C', status: 'Dispatch' },
  ],
  incidentCommand: [
    { label: 'Fire Dispatch', number: '555-0199' },
    { label: 'Emergency Medical', number: '555-0188' },
    { label: 'Security HQ', number: '555-0177' },
  ],
};
