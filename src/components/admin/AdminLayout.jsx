import React from 'react';
import AppShell from '../AppShell.jsx';
import PageHeader from '../nav/PageHeader.jsx';
import { useSession } from '../../context/SessionContext.jsx';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/triage', label: 'Triage & Dispatch', icon: 'ticket' },
  { to: '/admin/iot', label: 'IoT & Emergency', icon: 'shield' },
  { to: '/admin/financial', label: 'Tenant & Financial', icon: 'card' },
  { to: '/admin/staff', label: 'Staff Management', icon: 'users' },
  { to: '/admin/config', label: 'Configuration', icon: 'settings' },
];

export default function AdminLayout({ crumb, children }) {
  const { user } = useSession();
  const email = user?.email || 'Loading…';

  return (
    <AppShell navItems={NAV_ITEMS} brandIcon="homeCheck">
      <PageHeader
        crumb={crumb}
        user={{ initials: email === 'Loading…' ? '··' : email.charAt(0).toUpperCase(), name: email, sub: 'Administrator' }}
        searchPlaceholder="Search systems, tenants..."
      />
      {children}
    </AppShell>
  );
}
