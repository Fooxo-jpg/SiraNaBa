import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { triageDispatch } from '../../data/adminMockDb.js';
import { endpoints } from '../../api/endpoints.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';
import { formatRelativeTime } from '../../utils/format.js';

const CATEGORY_ICON = {
  Plumbing: 'droplet',
  Electrical: 'bolt',
  Structural: 'wrench',
  'Fire Safety': 'flame',
  General: 'fileText',
};

function formatTowerRoom(location) {
  const value = String(location || '');
  const room = value.match(/(?:unit|room|#)?\s*(\d{1,4})\b/i)?.[1] || '—';
  const towerToken = value.match(/(?:tower|building|block)\s*([a-z0-9]+)/i)?.[1];
  const tower = towerToken
    ? (/^\d+$/.test(towerToken) ? towerToken : String(towerToken.charCodeAt(0) - 64))
    : '1';
  return room === '—' ? value || '—' : `${tower}-${room}`;
}

export default function TriageDispatch() {
  const { stats, dispatchedCount, technicians, coordinator, hazardGuidelines } =
    triageDispatch;
  const [tickets, setTickets] = useState([]);
  const [ticketsError, setTicketsError] = useState('');
  const loadTickets = useCallback(async () => {
    try {
      setTickets(await endpoints.getAdminTickets());
      setTicketsError('');
    } catch (error) {
      setTicketsError(error.message || "Couldn't load the dispatch queue.");
    }
  }, []);
  useEffect(() => { loadTickets(); }, [loadTickets]);
  // Polling keeps the Loading... label in sync when the server-side Gemini
  // worker completes, without clients calling Gemini themselves.
  useAutoRefresh(loadTickets);
  const isAssigned = (ticket) => ticket.specialist?.name && ticket.specialist.name !== 'Unassigned';
  const pendingTickets = tickets.filter((ticket) => !isAssigned(ticket) && !['Resolved', 'Cancelled'].includes(ticket.stage));
  const coordinationTickets = tickets.filter((ticket) => isAssigned(ticket) && ticket.dispatchStatus === 'Coordinating');
  const dispatchedTickets = tickets.filter((ticket) => ticket.dispatchStatus === 'Dispatched' || ticket.dispatchStatus === 'Escalated');
  const completedTickets = tickets.filter((ticket) => isAssigned(ticket) && ['Fixed Problem', 'Cancelled'].includes(ticket.dispatchStatus));
  const TABS = [
    { id: 'pending', label: 'Pending Review', count: pendingTickets.length },
    { id: 'dispatched', label: 'Dispatched', count: dispatchedTickets.length },
    { id: 'completed', label: 'Recently Completed', count: completedTickets.length },
  ];
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [assignModal, setAssignModal] = useState(null); // ticket object
  const [quickDispatchOpen, setQuickDispatchOpen] = useState(false);
  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [dispatchStaff, setDispatchStaff] = useState([]);
  const [dispatchSelections, setDispatchSelections] = useState({});
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchingTicketId, setDispatchingTicketId] = useState(null);
  const [dispatchError, setDispatchError] = useState('');

  const openQuickDispatch = async () => {
    setQuickDispatchOpen(true);
    setDispatchLoading(true);
    setDispatchError('');
    try {
      const [allTickets, staff] = await Promise.all([endpoints.getAdminTickets(), endpoints.getStaff()]);
      setUnassignedTickets(allTickets.filter((ticket) => !ticket.specialist || ticket.specialist.name === 'Unassigned'));
      setDispatchStaff(staff);
    } catch (error) {
      setDispatchError(error.message || "Couldn't load the unassigned ticket queue.");
    } finally {
      setDispatchLoading(false);
    }
  };

  const dispatchTicket = async (ticket) => {
    const staffId = dispatchSelections[ticket.id];
    if (!staffId) return;
    setDispatchingTicketId(ticket.id);
    setDispatchError('');
    try {
      const updatedTicket = await endpoints.assignAdminTicket(ticket.id, staffId);
      setTickets((current) => current.map((item) => (item.id === ticket.id ? updatedTicket : item)));
      setUnassignedTickets((current) => current.filter((item) => item.id !== ticket.id));
    } catch (error) {
      setDispatchError(error.message || 'Could not assign this ticket. It may have just been assigned elsewhere.');
    } finally {
      setDispatchingTicketId(null);
    }
  };

  const visibleTickets = useMemo(() => {
    const tabTickets = tab === 'pending' ? pendingTickets : tab === 'dispatched' ? dispatchedTickets : completedTickets;
    if (!query) return tabTickets;
    return tabTickets.filter(
      (t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase())
    );
  }, [tab, query, pendingTickets]);

  const updateDispatchStatus = async (ticket, status) => {
    try {
      const updated = await endpoints.updateAdminDispatchStatus(ticket.id, status);
      setTickets((current) => current.map((item) => (item.id === ticket.id ? updated : item)));
    } catch (error) {
      setTicketsError(error.message || "Couldn't update the dispatch status.");
    }
  };

  const markArrived = async (ticket) => {
    try {
      const updated = await endpoints.markAdminTicketArrived(ticket.id);
      setTickets((current) => current.map((item) => (item.id === ticket.id ? updated : item)));
    } catch (error) {
      setTicketsError(error.message || "Couldn't mark maintenance staff as arrived.");
    }
  };

  const towerRoom = (ticket) => {
    if (ticket.tower && ticket.unit) return `Tower ${ticket.tower} · Unit ${ticket.unit}`;
    return formatTowerRoom(ticket.location);
  };

  return (
    <AdminLayout crumb="Triage & Dispatch">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Triage &amp; Dispatch Queue</h1>
            <p className="text-sm text-ink-700/60">Manage and assign maintenance work orders based on hazard priority.</p>
          </div>
          <div className="flex items-center gap-3">
            {technicians.length > 0 && (
              <div className="flex -space-x-2">
                {technicians.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    title={t.name}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sand-100 text-[10px] font-semibold text-ink-700/60"
                  >
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                ))}
              </div>
            )}
            <button onClick={openQuickDispatch} className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600">
              <Icon name="wrench" size={15} /> Quick Dispatch
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.id} {...s} />
          ))}
        </div>

        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-3">
            <div className="flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`border-b-2 px-3 pb-3 -mb-3 text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? 'border-forest-500 text-forest-600'
                      : 'border-transparent text-ink-700/50 hover:text-ink-900'
                  }`}
                >
                  {t.label}
                  {t.count !== null && ` (${t.count.toString().padStart(2, '0')})`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">Filter tickets</span>
                <Icon
                  name="search"
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-700/40"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter tickets..."
                  className="w-40 rounded-md border border-black/10 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-forest-400 sm:w-52"
                />
              </label>
              <button className="flex items-center gap-1 rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium hover:bg-sand-100">
                <Icon name="filter" size={13} /> Filter
              </button>
              <button className="flex items-center gap-1 rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium hover:bg-sand-100">
                <Icon name="sort" size={13} /> Sort
              </button>
            </div>
          </div>

          {ticketsError && <p role="alert" className="mb-3 rounded-md bg-status-highBg px-3 py-2 text-xs text-status-high">{ticketsError}</p>}

          {visibleTickets.length > 0 ? (
            <>
              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                      <th className="pb-2 pr-3">Ticket ID</th>
                      <th className="pb-2 pr-3">Subject &amp; Location</th>
                      <th className="pb-2 pr-3">Tower / Room</th>
                      <th className="pb-2 pr-3">Severity</th>
                      <th className="pb-2 pr-3">Category</th>
                      <th className="pb-2 pr-3">Reported</th>
                      <th className="pb-2 text-right">Assignment</th>
                      {tab === 'dispatched' && <th className="pb-2 pl-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {visibleTickets.map((t) => (
                      <tr key={t.id}>
                        <td className="py-3 pr-3 align-top font-mono text-xs font-semibold text-ink-700/60">{t.id}</td>
                        <td className="py-3 pr-3 align-top">
                          <p className="font-semibold text-ink-900">{t.title}</p>
                          <p className="text-xs text-ink-700/50">{t.location}</p>
                        </td>
                        <td className="py-3 pr-3 align-top font-mono text-xs font-semibold text-ink-700/70">
                          {towerRoom(t)}
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <StatusBadge label={t.priority || 'Loading...'} />
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <span className="flex items-center gap-1.5 text-ink-700/70">
                            <Icon name={CATEGORY_ICON[t.category] || 'fileText'} size={14} /> {t.category}
                          </span>
                        </td>
                        <td className="py-3 pr-3 align-top text-ink-700/60">{formatRelativeTime(t.submittedAt)}</td>
                        <td className="py-3 text-right align-top">
                          {t.specialist?.name && t.specialist.name !== 'Unassigned' ? (
                            <span className="inline-flex items-center gap-1.5 text-ink-900">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand-100 text-[9px] font-semibold text-ink-700/60">
                                {t.specialist.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </span>
                              {t.specialist.name}
                              {t.dispatchStatus && <StatusBadge label={t.dispatchStatus} />}
                            </span>
                          ) : (
                            <button
                              onClick={() => setAssignModal(t)}
                              className="rounded-md border border-black/10 px-2.5 py-1 text-xs font-semibold text-forest-600 hover:bg-forest-50"
                            >
                              Assign Tech
                            </button>
                          )}
                        </td>
                        {tab === 'dispatched' && (
                          <td className="py-3 pl-3 text-right align-top">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => updateDispatchStatus(t, 'Fixed Problem')} className="rounded border border-forest-200 px-2 py-1 text-[10px] font-semibold text-forest-700 hover:bg-forest-50">Fixed Problem</button>
                              <button onClick={() => updateDispatchStatus(t, 'Escalated')} className="rounded border border-status-high/30 px-2 py-1 text-[10px] font-semibold text-status-high hover:bg-status-highBg">Escalate</button>
                              <button onClick={() => updateDispatchStatus(t, 'Cancelled')} className="rounded border border-black/10 px-2 py-1 text-[10px] font-semibold text-ink-700/60 hover:bg-sand-100">Cancelled</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-700/50">
                <span>
                  Showing {visibleTickets.length} of {tab === 'pending' ? pendingTickets.length : tab === 'dispatched' ? dispatchedTickets.length : completedTickets.length} work orders
                </span>
                <div className="flex gap-2">
                  <button className="rounded-md border border-black/10 px-3 py-1.5 font-medium hover:bg-sand-100 disabled:opacity-40" disabled>
                    Prev
                  </button>
                  <button className="rounded-md border border-black/10 px-3 py-1.5 font-medium hover:bg-sand-100">
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-ink-700/50">
              {tab === 'pending' && pendingTickets.length === 0 ? 'No pending work orders.' : 'No tickets in this view yet.'}
            </p>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-ink-900">Active Coordination Hub</h2>
                <p className="text-xs text-ink-700/50">Real-time updates from maintenance teams on the field.</p>
              </div>
              <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                Live Feed
              </span>
            </div>
            {coordinationTickets.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-700/50">No staff are coordinating arrival yet.</p>
            )}
            <ul className="divide-y divide-black/5">
              {coordinationTickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 text-[10px] font-semibold text-ink-700/60">
                      {ticket.specialist.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <p className="text-sm text-ink-900">
                      <span className="font-semibold">{ticket.specialist.name}</span> is coordinating arrival for{' '}
                      <span className="font-semibold">{ticket.id}</span> — {ticket.title}
                      <span className="block text-xs text-ink-700/50">{towerRoom(ticket)} · {ticket.specialist.title}</span>
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <StatusBadge label="Coordinating" />
                    <button onClick={() => markArrived(ticket)} className="rounded-md bg-forest-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-600">
                      <Icon name="check" size={13} /> Arrived
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-6">
            <Card className="p-5 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Coordinator Context</p>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700">
                <Icon name="eye" size={22} />
              </div>
              <p className="text-sm font-semibold text-ink-900">{coordinator.name}</p>
              <p className="mb-3 text-xs text-ink-700/50">{coordinator.title}</p>
              <div className="flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 py-2 text-xs font-medium hover:bg-sand-100">
                  <Icon name="mail" size={13} /> Message
                </button>
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 py-2 text-xs font-medium hover:bg-sand-100">
                  <Icon name="phone" size={13} /> Call
                </button>
              </div>
            </Card>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Hazard Guidelines</p>
              <div className="space-y-2">
                {hazardGuidelines.map((g) => (
                  <div
                    key={g.level}
                    className={`rounded-lg border-l-4 p-3 text-xs ${
                      g.tone === 'danger'
                        ? 'border-status-high bg-status-highBg'
                        : 'border-status-progress bg-status-progressBg'
                    }`}
                  >
                    <p className={`mb-0.5 font-bold uppercase ${g.tone === 'danger' ? 'text-status-high' : 'text-status-progress'}`}>
                      {g.level}
                    </p>
                    <p className="text-ink-700/70">{g.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={quickDispatchOpen} onClose={() => setQuickDispatchOpen(false)} title="Quick Dispatch — Unassigned Tickets">
        <p className="mb-4 text-sm text-ink-700/60">Select the maintenance staff member for each unassigned work order. This updates the ticket status to Assigned.</p>
        {dispatchError && <p role="alert" className="mb-3 rounded-md bg-status-highBg p-3 text-xs text-status-high">{dispatchError}</p>}
        {dispatchLoading && <p className="py-6 text-center text-sm text-ink-700/50">Loading unassigned tickets…</p>}
        {!dispatchLoading && unassignedTickets.length === 0 && (
          <p className="rounded-md bg-forest-50 p-4 text-sm text-forest-700">No unassigned tickets are waiting for dispatch.</p>
        )}
        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1 thin-scrollbar">
          {unassignedTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-black/10 p-3">
              <div className="mb-3">
                <p className="text-xs font-semibold text-forest-700">{ticket.id} · {ticket.category}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900">{ticket.title}</p>
                <p className="mt-0.5 text-xs text-ink-700/60">{ticket.location}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={dispatchSelections[ticket.id] || ''}
                  onChange={(event) => setDispatchSelections((current) => ({ ...current, [ticket.id]: event.target.value }))}
                  aria-label={`Assign staff to ${ticket.id}`}
                  className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-forest-400"
                >
                  <option value="">Select maintenance staff…</option>
                  {dispatchStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name} — {staff.specialty} ({staff.workload}%)</option>
                  ))}
                </select>
                <button
                  onClick={() => dispatchTicket(ticket)}
                  disabled={!dispatchSelections[ticket.id] || dispatchingTicketId === ticket.id}
                  className="rounded-md bg-forest-500 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {dispatchingTicketId === ticket.id ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`Assign Technician — ${assignModal?.id || ''}`}
        footer={
          <>
            <button
              onClick={() => setAssignModal(null)}
              className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setAssignModal(null)}
              disabled={technicians.length === 0}
              className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Assign
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-700/70">{assignModal?.title}</p>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-700/50">
            Technician
          </span>
          <select
            disabled={technicians.length === 0}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400 disabled:bg-sand-50"
          >
            {technicians.length === 0 && <option>No technicians available</option>}
            {technicians.map((t) => (
              <option key={t.id}>
                {t.name} — {t.specialty}
              </option>
            ))}
          </select>
        </label>
      </Modal>
    </AdminLayout>
  );
}
