import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { LoadingState, ErrorState } from '../components/Common.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatRelativeTime } from '../utils/format.js';
import { useAutoRefresh } from '../utils/useAutoRefresh.js';

export default function Maintenance() {
  const [tickets, setTickets] = useState([]);
  const [serviceHealth, setServiceHealth] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const [historyView, setHistoryView] = useState(false);
  const [calendarView, setCalendarView] = useState(false);
  const [schedules, setSchedules] = useState([]);

  const load = useCallback(() => {
    setStatus('loading');
    endpoints
      .getTickets()
      .then(({ tickets, serviceHealth }) => {
        setTickets(tickets);
        setServiceHealth(serviceHealth);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const refreshTickets = useCallback(() => {
    endpoints
      .getTickets()
      .then(({ tickets }) => setTickets(tickets))
      .catch(() => {
        // Keep the current table visible when a background refresh fails.
        // The next polling cycle will try again.
      });
  }, []);

  useEffect(() => {
    load();
    endpoints.getTenantMaintenanceSchedules().then(setSchedules).catch(() => setSchedules([]));
  }, [load]);
  // The server processes Gemini triage in a rate-limited queue. Refresh this
  // ticket state so Loading... changes to the final severity in-place without
  // replacing the whole page with the initial loading screen.
  useAutoRefresh(refreshTickets);

  const activeTickets = useMemo(() => tickets.filter((ticket) => !['Resolved', 'Cancelled'].includes(ticket.stage)), [tickets]);
  const archivedTickets = useMemo(() => tickets.filter((ticket) => ticket.stage === 'Resolved'), [tickets]);
  const cancelledTickets = useMemo(() => tickets.filter((ticket) => ticket.stage === 'Cancelled'), [tickets]);
  const displayedTickets = useMemo(
    () =>
      (historyView ? [...archivedTickets, ...cancelledTickets] : activeTickets).filter(
        (t) => !query || t.title.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase())
      ),
    [activeTickets, archivedTickets, cancelledTickets, query, historyView]
  );
  const completedDurations = useMemo(() => archivedTickets.map((ticket) => {
    const completed = (ticket.timeline || []).find((event) => event.title === 'Fixed Problem')?.timestamp || ticket.updatedAt;
    const start = new Date(ticket.submittedAt).getTime(), end = new Date(completed).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 36e5 : null;
  }).filter((value) => value != null), [archivedTickets]);
  const averageFixHours = completedDurations.length
    ? Math.round(completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length)
    : null;

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
              <button onClick={() => setCalendarView((value) => !value)} className="flex items-center gap-1.5 rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">
                <Icon name="calendar" size={15} /> {calendarView ? 'Hide Calendar' : 'Calendar'}
              </button>
              <button onClick={() => setHistoryView((value) => !value)} className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">
                <span className="flex items-center gap-1.5"><Icon name="history" size={15} />{historyView ? 'Active Requests' : 'Ticket History'}</span>
              </button>
              <Link
                to="/maintenance/new"
                className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
              >
                <Icon name="wrench" size={15} /> New Ticket
              </Link>
            </div>
          </div>

          {calendarView && <Card className="p-5">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-ink-900">Maintenance Calendar</h2><p className="text-xs text-ink-700/50">Upcoming building work affecting your unit.</p></div><span className="rounded-full bg-status-highBg px-2 py-1 text-xs font-semibold text-status-high">{schedules.length} upcoming</span></div>
            {schedules.length === 0 ? <p className="rounded-lg border border-dashed border-black/10 p-6 text-center text-sm text-ink-700/50">No maintenance is scheduled for your unit.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{schedules.map((schedule) => {
              const date = new Date(schedule.scheduledAt);
              return <div key={schedule.id} className="rounded-lg border border-status-high/20 bg-status-highBg p-4"><p className="text-xs font-bold uppercase text-status-high">{date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}</p><p className="mt-1 font-semibold text-ink-900">{date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}</p><p className="mt-2 text-sm text-ink-700/70">{schedule.reason}</p></div>;
            })}</div>}
          </Card>}

          {schedules.length > 0 && !calendarView && <button onClick={() => setCalendarView(true)} className="flex w-full items-center gap-3 rounded-lg border border-status-high/20 bg-status-highBg p-4 text-left text-sm text-status-high"><Icon name="bell" size={18} /><span><strong>Upcoming maintenance:</strong> {new Date(schedules[0].scheduledAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} — {schedules[0].reason}</span></button>}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Ticket list */}
            <div className="lg:col-span-2">
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-ink-900">{historyView ? 'Ticket History' : 'Active Requests'}</h2>
                  <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold text-ink-700/60">
                    {(historyView ? archivedTickets.length + cancelledTickets.length : activeTickets.length)}
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
                  {displayedTickets.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/maintenance/${t.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-transparent p-3 text-left transition-colors hover:border-forest-500 hover:bg-forest-50"
                      >
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-medium text-ink-700/50">{t.id}</span>
                            <StatusBadge label={t.priority || 'Loading...'} />
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

                {displayedTickets.length === 0 && (
                  <p className="py-6 text-center text-sm text-ink-700/50">No {historyView ? 'ticket history' : 'active tickets'}.</p>
                )}
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
                  <Icon name="trend" size={15} className="text-forest-600" /> Your Maintenance Report
                </p>
                <dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between"><dt className="text-ink-700/60">Average repair duration</dt><dd className="font-semibold">{averageFixHours == null ? 'No completed tickets' : `${averageFixHours}h`}</dd></div><div className="flex justify-between"><dt className="text-ink-700/60">Completed requests</dt><dd className="font-semibold">{archivedTickets.length}</dd></div><div className="flex justify-between"><dt className="text-ink-700/60">Currently active</dt><dd className="font-semibold">{activeTickets.length}</dd></div><div className="flex justify-between"><dt className="text-ink-700/60">Resolution rate</dt><dd className="font-semibold">{tickets.length ? `${Math.round((archivedTickets.length / tickets.length) * 100)}%` : '—'}</dd></div></dl>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
