import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { LoadingState, ErrorState } from '../components/Common.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatDate, formatRelativeTime, formatTime } from '../utils/format.js';

const STAGES = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];

export default function Maintenance() {
  const [tickets, setTickets] = useState([]);
  const [serviceHealth, setServiceHealth] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading');

  const load = () => {
    setStatus('loading');
    endpoints
      .getTickets()
      .then(({ tickets, serviceHealth }) => {
        setTickets(tickets);
        setServiceHealth(serviceHealth);
        const firstActive = tickets.find((t) => t.stage !== 'Resolved') || tickets[0];
        setSelectedId((prev) => prev || firstActive?.id);
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

  const selected = tickets.find((t) => t.id === selectedId);
  const stageIndex = selected ? STAGES.indexOf(selected.stage) : -1;

  const withdrawTicket = () => {
    if (!selected) return;
    endpoints.updateTicket(selected.id, { stage: 'Resolved' }).then(load);
  };

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
            {/* Left: ticket list */}
            <div className="space-y-6">
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
                      <button
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full rounded-lg border-l-4 p-3 text-left transition-colors ${
                          t.id === selectedId
                            ? 'border-forest-500 bg-forest-50'
                            : 'border-transparent hover:bg-sand-100'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-ink-700/50">{t.id}</span>
                          <StatusBadge label={t.priority} />
                        </div>
                        <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                        <p className="mt-0.5 text-xs text-ink-700/50">
                          {t.stage} • {formatRelativeTime(t.updatedAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>

                <button className="mt-4 block w-full text-center text-sm font-medium text-forest-600 hover:underline">
                  View Archived Tickets ›
                </button>
              </Card>

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
            </div>

            {/* Right: ticket detail */}
            <div className="lg:col-span-2">
              {!selected ? (
                <Card className="flex h-full items-center justify-center p-10 text-sm text-ink-700/50">
                  Select a ticket to view its details.
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-xs text-ink-700/50">
                        <span className="rounded bg-sand-100 px-2 py-0.5 font-medium">
                          {selected.category}
                        </span>
                        <span>{selected.id}</span>
                      </div>
                      <h2 className="text-xl font-bold text-ink-900">{selected.title}</h2>
                      <p className="mt-1 text-xs text-ink-700/50">
                        Submitted {formatDate(selected.submittedAt)} • Updated{' '}
                        {formatRelativeTime(selected.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600">
                        Message Support
                      </button>
                      <button className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">
                        Edit Request
                      </button>
                    </div>
                  </div>

                  {/* Stage tracker */}
                  <div className="mb-6 flex items-center">
                    {STAGES.map((stage, i) => (
                      <React.Fragment key={stage}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                              i < stageIndex
                                ? 'border-forest-500 bg-forest-500 text-white'
                                : i === stageIndex
                                ? 'border-forest-500 text-forest-600'
                                : 'border-black/10 text-ink-700/30'
                            }`}
                          >
                            {i < stageIndex ? <Icon name="check" size={14} /> : i + 1}
                          </div>
                          <span
                            className={`text-center text-[11px] font-medium ${
                              i === stageIndex ? 'text-forest-600' : 'text-ink-700/40'
                            }`}
                          >
                            {stage}
                            {i === stageIndex && <span className="block">Active Stage</span>}
                          </span>
                        </div>
                        {i < STAGES.length - 1 && (
                          <div
                            className={`mx-1 h-0.5 flex-1 ${
                              i < stageIndex ? 'bg-forest-500' : 'bg-black/10'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                        Description
                      </p>
                      <p className="text-sm leading-relaxed text-ink-900">{selected.description}</p>

                      <div className="mt-4 flex gap-6 border-t border-black/5 pt-4 text-sm">
                        <div>
                          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-700/50">
                            <Icon name="grid" size={13} /> Location
                          </p>
                          <p className="font-medium text-ink-900">{selected.location}</p>
                        </div>
                        <div>
                          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-700/50">
                            <Icon name="wrench" size={13} /> Urgency
                          </p>
                          <StatusBadge label={selected.priority} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                        Assigned Specialist
                      </p>
                      <div className="flex items-center gap-3 rounded-lg border border-black/5 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 text-ink-700/50">
                          <Icon name="wrench" size={15} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink-900">
                            {selected.specialist?.name || 'Unassigned'}
                          </p>
                          <p className="text-xs text-ink-700/50">{selected.specialist?.title}</p>
                        </div>
                      </div>

                      <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                        Attachments
                      </p>
                      <div className="flex gap-2">
                        {selected.attachments?.map((a) => (
                          <div
                            key={a.id}
                            className="flex h-14 w-14 items-center justify-center rounded-lg bg-sand-100 text-ink-700/40"
                          >
                            <Icon name="grid" size={16} />
                          </div>
                        ))}
                        <button className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-black/15 text-ink-700/40 hover:bg-sand-50">
                          <Icon name="plus" size={14} />
                          <span className="text-[10px]">Add Photo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {selected.safetyNote && (
                    <div className="mt-5 flex items-center justify-between rounded-lg bg-status-highBg px-4 py-3">
                      <p className="flex items-center gap-2 text-xs text-status-high">
                        <Icon name="info" size={14} /> Safety Note: {selected.safetyNote}
                      </p>
                      <button
                        onClick={withdrawTicket}
                        className="text-xs font-semibold text-status-high hover:underline"
                      >
                        Withdraw Request
                      </button>
                    </div>
                  )}

                  {selected.timeline?.length > 0 && (
                    <div className="mt-6 border-t border-black/5 pt-5">
                      <h3 className="mb-4 font-semibold text-ink-900">Timeline &amp; Updates</h3>
                      <ul className="space-y-4">
                        {selected.timeline.map((event) => (
                          <li key={event.id} className="flex gap-3">
                            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600">
                              <Icon name="check" size={13} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink-900">{event.title}</p>
                              <p className="text-xs leading-relaxed text-ink-700/60">{event.detail}</p>
                              <p className="mt-0.5 text-xs text-ink-700/40">
                                {formatTime(event.timestamp)} • {formatDate(event.timestamp)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
