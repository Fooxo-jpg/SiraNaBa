import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import MonthlyMaintenance from '../../components/admin/MonthlyMaintenance.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { endpoints } from '../../api/endpoints.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';
import { formatRelativeTime } from '../../utils/format.js';
import { triageStats, isTicketAssigned, isTicketOpen } from '../../utils/triageStats.js';
import { reportFloor, summarizeReports } from '../../utils/ticketReports.js';

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
  const [tickets, setTickets] = useState([]);
  const [ticketsError, setTicketsError] = useState('');
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [staff, setStaff] = useState(null);
  const technicians = staff || [];
  const [staffError, setStaffError] = useState('');
  const [tenants, setTenants] = useState([]);
  const loadStaff = useCallback(async () => {
    try {
      setStaff(await endpoints.getStaff());
      setStaffError('');
    } catch (error) {
      setStaff(null);
      setStaffError(error.message || 'Could not load staff status.');
    }
  }, []);
  useEffect(() => { loadStaff(); }, [loadStaff]);
  useAutoRefresh(loadStaff);
  const loadTenants = useCallback(async () => {
    try {
      setTenants(await endpoints.getAdminTenants());
    } catch {
      setTenants([]);
    }
  }, []);
  useEffect(() => { loadTenants(); }, [loadTenants]);
  useAutoRefresh(loadTenants);
  const loadTickets = useCallback(async () => {
    try {
      setTickets(await endpoints.getAdminTickets());
      setTicketsLoaded(true);
      setTicketsError('');
    } catch (error) {
      setTicketsLoaded(false);
      setTicketsError(error.message || "Couldn't load the dispatch queue.");
    }
  }, []);
  useEffect(() => { loadTickets(); }, [loadTickets]);
  // Polling keeps the Loading... label in sync when the server-side Gemini
  // worker completes, without clients calling Gemini themselves.
  useAutoRefresh(loadTickets);
  const counts = triageStats(tickets, staff || []);
  const stats = [
    { id: 'emergencies', label: 'Active Emergencies', value: ticketsLoaded ? String(counts.emergencies) : '—', delta: 'Open critical / severe tickets', tone: counts.emergencies ? 'danger' : 'neutral', icon: 'alert' },
    { id: 'queue', label: 'Unassigned Queue', value: ticketsLoaded ? String(counts.unassigned) : '—', delta: 'Open tickets without assigned staff', icon: 'clock' },
    { id: 'staff', label: 'Staff On-Site', value: staff ? String(counts.online) : '—', delta: staffError ? 'Staff status unavailable' : 'Staff with online status', icon: 'wrench' },
    { id: 'completed', label: 'Completed Today', value: ticketsLoaded ? String(counts.completed) : '—', delta: 'Completed today · Philippine time', icon: 'check' },
  ];
  const isAssigned = isTicketAssigned;
  const pendingTickets = tickets.filter((ticket) => !isAssigned(ticket) && isTicketOpen(ticket));
  const coordinationTickets = tickets.filter((ticket) => isAssigned(ticket) && ticket.dispatchStatus === 'Coordinating');
  const dispatchedTickets = tickets.filter((ticket) => ticket.dispatchStatus === 'Dispatched' || ticket.dispatchStatus === 'Escalated');
  const completedTickets = tickets.filter((ticket) => isAssigned(ticket) && ['Fixed Problem', 'Cancelled'].includes(ticket.dispatchStatus));
  const recurringTickets = useMemo(() => {
    const tenantByUnit = new Map(
      tenants.map((tenant) => [`${Number(tenant.tower)}:${String(tenant.unit).trim().toLowerCase()}`, tenant])
    );
    return summarizeReports(tickets).groups
      .filter((group) => group.exact && group.tickets.length > 1)
      .map((group) => ({
        ...group,
        owner: tenantByUnit.get(`${Number(group.tower)}:${String(group.unit).trim().toLowerCase()}`)?.name || 'Owner not found',
        latest: group.tickets.reduce((latest, ticket) =>
          (Date.parse(ticket.submittedAt) || 0) > (Date.parse(latest?.submittedAt) || 0) ? ticket : latest, null),
      }))
      .slice(0, 5);
  }, [tickets, tenants]);
  const TABS = [
    { id: 'pending', label: 'Pending Review', count: pendingTickets.length },
    { id: 'dispatched', label: 'Dispatched', count: dispatchedTickets.length },
    { id: 'completed', label: 'Recently Completed', count: completedTickets.length },
  ];
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [assignModal, setAssignModal] = useState(null); // ticket object
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [activityTicket, setActivityTicket] = useState(null);
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
      setUnassignedTickets(allTickets.filter((ticket) => !isAssigned(ticket) && isTicketOpen(ticket)));
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

  const assignTechnician = async () => {
    if (!assignModal || !assignStaffId || assigning) return;
    setAssigning(true);
    setTicketsError('');
    try {
      const updated = await endpoints.assignAdminTicket(assignModal.id, assignStaffId);
      setTickets((current) => current.map((item) => (item.id === assignModal.id ? updated : item)));
      setAssignModal(null);
      setAssignStaffId('');
    } catch (error) {
      setTicketsError(error.message || "Couldn't assign the technician.");
    } finally {
      setAssigning(false);
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
    if (ticket.tower && ticket.unit) return `Main Building · Unit ${ticket.unit}`;
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
            <StatCard key={s.id} {...s} delta={undefined} />
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
                      <th className="pb-2 pr-3">Building / Room</th>
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
                        <td className="py-3 pr-3 align-top"><button type="button" onClick={() => setActivityTicket(t)} className="font-mono text-xs font-semibold text-forest-700 hover:underline" title="View ticket activity and staff assignment history">{t.id}</button></td>
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
                              onClick={() => { setAssignModal(t); setAssignStaffId(''); }}
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
            <Card className="p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Recurring Ticket Tracker</p>
                  <p className="mt-1 text-xs text-ink-700/50">Units reporting the same issue more than once.</p>
                </div>
                <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">{recurringTickets.length}</span>
              </div>
              {recurringTickets.length === 0 ? (
                <p className="rounded-lg border border-dashed border-black/10 px-3 py-6 text-center text-xs text-ink-700/50">No recurring unit tickets detected.</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1 thin-scrollbar">
                  {recurringTickets.map((item) => (
                    <li key={item.key} className="rounded-lg border border-black/10 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">{item.issue}</p>
                          <p className="mt-0.5 text-xs font-medium text-forest-700">{item.owner}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-status-highBg px-2 py-0.5 text-[10px] font-bold text-status-high">{item.tickets.length} reports</span>
                      </div>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div><dt className="text-ink-700/40">Building</dt><dd className="font-semibold text-ink-900">Main Building</dd></div>
                        <div><dt className="text-ink-700/40">Floor</dt><dd className="font-semibold text-ink-900">{item.floor || reportFloor(item.latest) || '—'}</dd></div>
                        <div><dt className="text-ink-700/40">Unit</dt><dd className="font-semibold text-ink-900">{item.unit}</dd></div>
                      </dl>
                      <p className="mt-2 text-[11px] text-ink-700/50">{item.active} active · Last reported {formatRelativeTime(item.latest?.submittedAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <MonthlyMaintenance />
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
        onClose={() => { if (!assigning) { setAssignModal(null); setAssignStaffId(''); } }}
        title={`Assign Technician — ${assignModal?.id || ''}`}
        footer={
          <>
            <button
              onClick={() => { setAssignModal(null); setAssignStaffId(''); }}
              disabled={assigning}
              className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              onClick={assignTechnician}
              disabled={technicians.length === 0 || !assignStaffId || assigning}
              className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {assigning ? 'Assigning…' : 'Assign'}
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
            value={assignStaffId}
            onChange={(event) => setAssignStaffId(event.target.value)}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400 disabled:bg-sand-50"
          >
            {technicians.length > 0 && <option value="">Select a technician…</option>}
            {technicians.length === 0 && <option>No technicians available</option>}
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.specialty}
              </option>
            ))}
          </select>
        </label>
      </Modal>
      <Modal open={!!activityTicket} onClose={() => setActivityTicket(null)} title={`Ticket activity — ${activityTicket?.id || ''}`}>
        <p className="mb-4 text-sm font-semibold text-ink-900">{activityTicket?.title}</p>
        {activityTicket?.timeline?.length ? <ol className="space-y-4 border-l-2 border-forest-100 pl-5">{[...activityTicket.timeline].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).map((event) => <li key={event.id} className="relative"><span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-forest-500" /><p className="text-sm font-semibold text-ink-900">{event.title}</p><p className="text-xs text-ink-700/60">{event.detail}</p><time className="mt-1 block text-[11px] text-ink-700/40">{new Date(event.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</time></li>)}</ol> : <p className="py-6 text-center text-sm text-ink-700/50">No activity has been recorded.</p>}
      </Modal>
    </AdminLayout>
  );
}
