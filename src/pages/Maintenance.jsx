import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { LoadingState, ErrorState } from '../components/Common.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatRelativeTime } from '../utils/format.js';

export default function Maintenance() {
  const [tickets, setTickets] = useState([]);
  const [serviceHealth, setServiceHealth] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading');

  const load = () => {
    setStatus('loading');
    endpoints
      .getTickets()
      .then(({ tickets, serviceHealth }) => {
        setTickets(tickets);
        setServiceHealth(serviceHealth);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(load, []);

  const activeTickets = useMemo(
    () =>
      tickets.filter(
        (t) => !query || t.title.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase())
      ),
    [tickets, query]
  );

  return (
    <Layout crumb="Maintenance">
      {status === 'loading' && <LoadingState label="Loading tickets…" />}
      {status === 'error' && <ErrorState message="We couldn't load your tickets." onRetry={load} />}

      {status === 'ready' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">Maintenance</h1>
              <p className="text-sm text-ink-700/60">
                Submit requests and monitor the real-time progress of your maintenance tickets.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">
                Request History
              </button>
              <Link
                to="/maintenance/new"
                className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
              >
                <Icon name="wrench" size={15} /> New Ticket
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Ticket list */}
            <div className="lg:col-span-2">
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-ink-900">Active Requests</h2>
                  <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold text-ink-700/60">
                    {tickets.length}
                  </span>
                </div>
                <label className="relative mb-3 block">
                  <span className="sr-only">Search tickets</span>
                  <Icon
                    name="search"
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by ID or Title..."
                    className="w-full rounded-lg border border-black/10 bg-sand-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-forest-400"
                  />
                </label>

                <ul className="space-y-1.5">
                  {activeTickets.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/maintenance/${t.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-transparent p-3 text-left transition-colors hover:border-forest-500 hover:bg-forest-50"
                      >
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-medium text-ink-700/50">{t.id}</span>
                            <StatusBadge label={t.priority} />
                            {t.stage === 'In Progress' && (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-forest-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-forest-500" /> Live
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm font-semibold text-ink-900">{t.title}</p>
                          <p className="mt-0.5 text-xs text-ink-700/50">
                            {t.stage} • {formatRelativeTime(t.updatedAt)}
                          </p>
                        </div>
                        <Icon name="chevronRight" size={16} className="flex-shrink-0 text-ink-700/30" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <button className="mt-4 block w-full text-center text-sm font-medium text-forest-600 hover:underline">
                  View Archived Tickets ›
                </button>
              </Card>
            </div>

            {/* Service health */}
            <div className="space-y-6">
              {serviceHealth && (
                <Card className="bg-ink-900 p-5 text-white">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                    Service Health
                  </p>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-white/70">Average Response Time</span>
                    <span className="font-semibold">{serviceHealth.averageResponseHours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Resolution Rate</span>
                    <span className="font-semibold">
                      {Math.round(serviceHealth.resolutionRate * 100)}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-forest-400"
                      style={{ width: `${serviceHealth.resolutionRate * 100}%` }}
                    />
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                  <Icon name="info" size={15} className="text-forest-600" /> Tip
                </p>
                <p className="text-xs leading-relaxed text-ink-700/60">
                  Click any ticket to see its live status, assigned technician, and full activity
                  log.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
