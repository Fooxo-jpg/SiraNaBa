import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { LoadingState, ErrorState } from '../components/Common.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatRelativeTime } from '../utils/format.js';

const CATEGORY_ICON = { Payments: 'card', Maintenance: 'wrench', Community: 'info' };
const PAGE_SIZE = 6;

// Not real data - shown only while /api/notifications returns nothing, so
// the intended card layout stays visible. Remove once live alerts exist.
const TEMPLATE_NOTIFICATION = {
  id: 'template',
  category: 'Maintenance',
  title: 'Notification title',
  body: 'This is a placeholder card. Once the backend is connected, real alerts will appear here in this layout.',
  timestamp: new Date().toISOString(),
  cta: { label: 'Example action', route: '#' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('loading');
  const [category, setCategory] = useState('All Alerts');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setStatus('loading');
    endpoints
      .getNotifications()
      .then((data) => {
        setNotifications(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(load, []);

  const counts = useMemo(
    () => ({
      'All Alerts': notifications.length,
      Unread: notifications.filter((n) => !n.read).length,
      Payments: notifications.filter((n) => n.category === 'Payments').length,
      Maintenance: notifications.filter((n) => n.category === 'Maintenance').length,
      Community: notifications.filter((n) => n.category === 'Community').length,
    }),
    [notifications]
  );

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchesCategory =
        category === 'All Alerts' ||
        (category === 'Unread' ? !n.read : n.category === category);
      const matchesQuery =
        !query ||
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.body.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [notifications, category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const markAllRead = () =>
    endpoints.markAllNotificationsRead().then((data) => setNotifications(data));

  const markRead = (id) =>
    endpoints.markNotificationRead(id).then(() =>
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    );

  return (
    <Layout crumb="Notifications">
      {status === 'loading' && <LoadingState label="Loading notifications…" />}
      {status === 'error' && <ErrorState message="We couldn't load your notifications." onRetry={load} />}

      {status === 'ready' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">Notification Center</h1>
              <p className="text-sm text-ink-700/60">
                Stay updated with the latest alerts from SiraNaBa property management.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={markAllRead}
                className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
              >
                Mark all as read
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600">
                <Icon name="bell" size={15} /> Alert Settings
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Categories sidebar */}
            <div className="space-y-5 lg:col-span-1">
              <Card className="p-4">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                  Categories
                </p>
                <nav className="flex flex-col gap-1">
                  {['All Alerts', 'Unread', 'Payments', 'Maintenance', 'Community'].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCategory(c);
                        setPage(1);
                      }}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        category === c
                          ? 'bg-forest-100 text-forest-700'
                          : 'text-ink-700/70 hover:bg-sand-100'
                      }`}
                    >
                      {c}
                      <span className="text-xs text-ink-700/40">{counts[c]}</span>
                    </button>
                  ))}
                </nav>
              </Card>

              <Card className="border-status-high/20 bg-status-highBg/60 p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-status-high">
                  <Icon name="alert" size={14} /> FACILITY ALERT
                </p>
                <p className="text-xs leading-relaxed text-ink-900/70">
                  Always double-check water or electricity maintenance schedules to avoid
                  disruption. SiraNaBa sends high-priority alerts 24h in advance.
                </p>
                <button className="mt-2 text-xs font-semibold text-status-high hover:underline">
                  Learn about protocol ›
                </button>
              </Card>
            </div>

            {/* Notification list */}
            <div className="space-y-4 lg:col-span-3">
              <label className="relative block">
                <span className="sr-only">Search alerts</span>
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
                />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search alerts by keyword or ID..."
                  className="w-full rounded-lg border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest-400"
                />
              </label>

              {notifications.length === 0 && (
                <Card className="flex items-start gap-3 border-dashed p-4">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                    <Icon name={CATEGORY_ICON[TEMPLATE_NOTIFICATION.category]} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                        {TEMPLATE_NOTIFICATION.category}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700/50">
                        Template
                      </span>
                      <span className="ml-auto text-xs text-ink-700/40">
                        {formatRelativeTime(TEMPLATE_NOTIFICATION.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{TEMPLATE_NOTIFICATION.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-700/60">
                      {TEMPLATE_NOTIFICATION.body}
                    </p>
                    <span className="mt-2 inline-block text-sm font-semibold text-forest-600/50">
                      {TEMPLATE_NOTIFICATION.cta.label} ›
                    </span>
                  </div>
                </Card>
              )}

              {notifications.length > 0 && paged.length === 0 && (
                <Card className="p-10 text-center text-sm text-ink-700/50">
                  No alerts match this view.
                </Card>
              )}

              {paged.map((n) => (
                <Card
                  key={n.id}
                  className={`flex items-start gap-3 p-4 ${!n.read ? 'border-l-4 border-l-forest-500' : ''}`}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                    <Icon name={CATEGORY_ICON[n.category] || 'bell'} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                        {n.category}
                      </span>
                      <StatusBadge label={n.severity} />
                      <span className="ml-auto text-xs text-ink-700/40">
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-700/60">{n.body}</p>
                    {n.cta && (
                      <Link
                        to={n.cta.route}
                        onClick={() => markRead(n.id)}
                        className="mt-2 inline-block text-sm font-semibold text-forest-600 hover:underline"
                      >
                        {n.cta.label} ›
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      aria-label="Mark as read"
                      className="rounded-full p-1 text-ink-700/40 hover:bg-sand-100"
                    >
                      <Icon name="dots" size={16} />
                    </button>
                  )}
                </Card>
              ))}

              <div className="flex items-center justify-between pt-2 text-sm">
                <span className="text-ink-700/50">
                  Showing {paged.length} of {filtered.length} results
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-black/10 px-3 py-1.5 font-medium hover:bg-sand-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`h-8 w-8 rounded-md text-xs font-medium ${
                        page === i + 1
                          ? 'bg-forest-500 text-white'
                          : 'border border-black/10 hover:bg-sand-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-md border border-black/10 px-3 py-1.5 font-medium hover:bg-sand-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
