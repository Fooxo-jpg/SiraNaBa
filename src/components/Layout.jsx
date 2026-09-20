import React, { useEffect, useState } from 'react';
import AppShell from './AppShell.jsx';
import PageHeader from './nav/PageHeader.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { endpoints } from '../api/endpoints.js';

export const NOTIFICATIONS_CHANGED = 'siranaba:notifications-changed';

// Real unread count from /api/notifications; re-checked whenever a page mounts
// or the Notifications page marks something as read.
function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      endpoints
        .getNotifications()
        .then((list) => alive && setCount(list.filter((n) => !n.read).length))
        .catch(() => {});
    load();
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, []);
  return count;
}

export default function Layout({ crumb, children }) {
  const { tenant } = useSession();
  const unreadCount = useUnreadCount();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'grid', end: true },
    { to: '/maintenance', label: 'Maintenance', icon: 'wrench' },
    { to: '/billing', label: 'Payments', icon: 'card' },
    { to: '/notifications', label: 'Notifications', icon: 'bell', badge: unreadCount },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const user = {
    initials: tenant ? `${tenant.firstName[0]}${tenant.lastName[0]}` : '··',
    name: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Loading…',
    sub: tenant ? `Unit ${tenant.unit}, ${tenant.building}` : '',
  };

  return (
    <AppShell navItems={navItems} brandIcon="grid">
      <PageHeader
        crumb={crumb}
        user={user}
        searchPlaceholder="Search tickets, bills..."
        unreadCount={unreadCount}
        showMessages
        profileTo="/settings"
      />
      {children}
    </AppShell>
  );
}
