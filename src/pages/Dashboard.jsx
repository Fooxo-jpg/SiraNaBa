import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ProgressBar, LoadingState, ErrorState } from '../components/Common.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatRelativeTime, formatDate } from '../utils/format.js';

export default function Dashboard() {
  const { tenant } = useSession();
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = () => {
    setStatus('loading');
    endpoints
      .getDashboardSummary()
      .then((data) => {
        setSummary(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(load, []);

  // SessionContext re-reads the tenant record in the background; when it changes
  // (e.g. an admin marked rent as paid) refresh the summary too - quietly, without
  // flipping back to the loading state. The first run is the mount, handled above.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    endpoints.getDashboardSummary().then(setSummary).catch(() => {});
  }, [tenant]);

  return (
    <Layout>
      {status === 'loading' && <LoadingState label="Loading your dashboard…" />}
      {status === 'error' && <ErrorState message="We couldn't load your dashboard." onRetry={load} />}

      {status === 'ready' && summary && (
        <div className="space-y-6">
          {/* Hero */}
          <Card className="relative overflow-hidden bg-ink-900 p-8 text-white">
            <div className="max-w-lg">
              <span className="inline-block rounded-full bg-forest-500/90 px-3 py-1 text-xs font-semibold tracking-wide">
                TENANT PORTAL
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight">
                Welcome back, {tenant ? tenant.lastName : '…'}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Everything you need for your home at {tenant?.building || 'your building'} is at
                your fingertips. View your current balance, track maintenance requests, or explore
                community updates.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/billing"
                  className="rounded-md bg-forest-500 px-4 py-2.5 text-sm font-semibold hover:bg-forest-600"
                >
                  Pay Rent Early
                </Link>
                <Link
                  to="/maintenance/new"
                  className="rounded-md border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                >
                  Submit Request
                </Link>
              </div>
            </div>
          </Card>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-5">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                <Icon name="card" size={18} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">
                Current Balance
              </p>
              <p className="mt-1 text-2xl font-bold text-ink-900">$0.0</p>
              <p className="mt-1 text-xs text-ink-700/50">Due on —</p>
            </Card>

            <Card className="p-5">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                <Icon name="wrench" size={18} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">
                Active Tickets
              </p>
              <p className="mt-1 text-2xl font-bold text-ink-900">0.0</p>
              <p className="mt-1 text-xs text-ink-700/50">—</p>
            </Card>

            <Card className="p-5">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                <Icon name="calendar" size={18} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">
                Next Scheduled Maintenance
              </p>
              <p className="mt-1 text-2xl font-bold text-ink-900">—</p>
              <p className="mt-1 text-xs text-ink-700/50">—</p>
            </Card>

            <Card className="p-5">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                <Icon name="clock" size={18} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">
                Days Until Rent Due
              </p>
              <p className="mt-1 text-2xl font-bold text-ink-900">0.0 Days</p>
              <p className="mt-1 text-xs text-ink-700/50">—</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 lg:col-span-2">
              <div>
                <h2 className="mb-3 text-lg font-semibold text-ink-900">Management Tools</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {summary.managementTools.map((tool) => (
                    <Link key={tool.id} to={tool.route}>
                      <Card className="h-full p-5 transition-shadow hover:shadow-md">
                        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                          <Icon name={tool.icon} size={18} />
                        </div>
                        <p className="text-sm font-semibold text-ink-900">{tool.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-700/60">
                          {tool.description}
                        </p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">Utility Consumption</h2>
                    <p className="text-xs text-ink-700/50">
                      Estimated usage for the current billing cycle
                    </p>
                  </div>
                  <Link to="/billing" className="text-sm font-medium text-forest-600 hover:underline">
                    View Details ›
                  </Link>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-ink-900">
                        <Icon name="bolt" size={15} className="text-amber-500" /> Electricity
                      </span>
                      <span className="text-ink-700/60">0.0 kWh / 0.0 kWh</span>
                    </div>
                    <ProgressBar value={0} max={1} color="bg-amber-500" />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-ink-900">
                        <Icon name="droplet" size={15} className="text-sky-500" /> Water
                      </span>
                      <span className="text-ink-700/60">0.0 Gal / 0.0 Gal</span>
                    </div>
                    <ProgressBar value={0} max={1} color="bg-sky-500" />
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-forest-50 p-4">
                    <Icon name="trend" size={17} className="mt-0.5 flex-shrink-0 text-forest-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink-900">Efficiency Insight</p>
                      <p className="text-xs text-ink-700/60">0.0% vs neighbors in {tenant?.building || 'your building'}.</p>
                    </div>
                    <StatusBadge label="—" tone="neutral" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-ink-900">Recent Activity</h2>
                <p className="mb-4 text-xs text-ink-700/50">Track updates across your portal</p>
                <ul className="space-y-4">
                  {summary.recentActivity.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{item.title}</p>
                        <p className="text-xs text-ink-700/50">
                          {formatDate(item.timestamp)} • {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                      <StatusBadge label={item.status} />
                    </li>
                  ))}
                </ul>
                <Link
                  to="/notifications"
                  className="mt-5 block rounded-md border border-black/10 py-2 text-center text-sm font-medium text-ink-900 hover:bg-sand-100"
                >
                  View All Notifications
                </Link>
              </Card>

              <Card className="bg-forest-50 p-6">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-forest-700">
                  <Icon name="wrench" size={14} /> FAST SERVICE
                </div>
                <h3 className="text-lg font-bold text-ink-900">Need a quick repair for your unit?</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-700/60">
                  Our facility maintenance team is available 24/7 for critical issues.
                </p>
                <Link
                  to="/maintenance/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600"
                >
                  <Icon name="plus" size={15} /> Create Ticket
                </Link>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
