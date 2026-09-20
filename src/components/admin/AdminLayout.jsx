import React from 'react';
import AppShell from '../AppShell.jsx';
import PageHeader from '../nav/PageHeader.jsx';
import { adminUser } from '../../data/adminMockDb.js';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/triage', label: 'Triage & Dispatch', icon: 'ticket' },
  { to: '/admin/iot', label: 'IoT & Emergency', icon: 'wifi' },
  { to: '/admin/financial', label: 'Tenant & Financial', icon: 'card' },
  { to: '/admin/staff', label: 'Staff Management', icon: 'users' },
  { to: '/admin/config', label: 'Configuration', icon: 'settings' },
];

export default function AdminLayout({ crumb, children }) {
  return (
    <AppShell navItems={NAV_ITEMS} brandIcon="shield">
      <PageHeader
        crumb={crumb}
        user={{ name: adminUser.name, sub: 'Admin Portal' }}
        searchPlaceholder="Search systems, tenants..."
      />
      {children}
    </AppShell>
  );
}
