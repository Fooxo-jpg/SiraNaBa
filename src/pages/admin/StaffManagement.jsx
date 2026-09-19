import React, { useMemo, useRef, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import { staffManagement } from '../../data/adminMockDb.js';

const PAGE_SIZE = 8;

const SPECIALTY_ICONS = {
  Electrician: 'bolt',
  Plumber: 'droplet',
  'HVAC Specialist': 'settings',
  'General Repair': 'wrench',
  Cleaner: 'refresh',
};

const AVAILABILITY = {
  online: { label: 'ONLINE', dot: 'bg-status-success', tag: 'ACTIVE', tagCls: 'text-status-success' },
  away: { label: 'AWAY', dot: 'bg-status-progress', tag: 'ON BREAK', tagCls: 'text-status-progress' },
  offline: { label: 'OFFLINE', dot: 'bg-ink-700/30', tag: 'OFF DUTY', tagCls: 'text-status-progress' },
};

const inputCls =
  'w-full rounded-md border border-black/10 bg-sand-50 px-3 py-2 text-sm outline-none focus:border-forest-400';

const EMPTY_FORM = { name: '', specialty: 'Electrician', coverage: '', phone: '' };

function loadColor(pct) {
  if (pct >= 75) return 'bg-status-high';
  if (pct >= 50) return 'bg-status-progress';
  return 'bg-forest-500';
}

function Avatar({ name }) {
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-forest-100 text-[11px] font-semibold text-forest-700">
      {name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}

export default function StaffManagement() {
  const { specialties, capacityGroups, operationalStatus, version, incidentReadiness } = staffManagement;
  const [staff, setStaff] = useState(staffManagement.staff);
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('All Specialties');
  const [availability, setAvailability] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const [dispatchPick, setDispatchPick] = useState(null);
  const [smsSent, setSmsSent] = useState(false);
  const matrixRef = useRef(null);

  const online = staff.filter((s) => s.availability === 'online');
  const highCapacity = staff.filter((s) => s.workload >= 75).length;
  const avgWorkload = staff.length ? Math.round(staff.reduce((s, m) => s + m.workload, 0) / staff.length) : 0;

  const empty = staff.length === 0;
  const stats = [
    { id: 'total', label: 'Total Workforce', value: String(staff.length), delta: empty ? '—' : `${online.length} Active Professionals`, icon: 'users' },
    { id: 'avail', label: 'Availability Rate', value: `${empty ? 0 : Math.round((online.length / staff.length) * 100)}%`, delta: empty ? '—' : `${online.length} Currently Online`, tone: empty ? 'neutral' : 'success', icon: 'check' },
    { id: 'load', label: 'Avg. Workload', value: `${avgWorkload}%`, delta: empty ? '—' : `${highCapacity} High Capacity Nodes`, tone: 'neutral', icon: 'bolt' },
    { id: 'ready', label: 'Incident Readiness', value: incidentReadiness == null ? '—' : `${incidentReadiness}%`, delta: '—', icon: 'shield' },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter(
      (s) =>
        (!q || [s.name, s.id, s.coverage, s.specialty].some((v) => v.toLowerCase().includes(q))) &&
        (specialty === 'All Specialties' || s.specialty === specialty) &&
        (availability === 'All' || s.availability === availability)
    );
  }, [staff, query, specialty, availability]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const matrix = capacityGroups.map((g) => {
    const members = staff.filter((s) => g.specialties.includes(s.specialty));
    const util = members.length ? Math.round(members.reduce((s, m) => s + m.workload, 0) / members.length) : 0;
    return { ...g, count: members.length, util };
  });

  const resetPage = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  const openModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.coverage.trim()) next.coverage = 'Enter at least one coverage area';
    setErrors(next);
    if (Object.keys(next).length) return;

    const n = staff.reduce((m, s) => Math.max(m, parseInt(s.id.slice(3), 10)), 200) + 1;
    const parts = form.name.trim().split(/\s+/);
    setStaff((list) => [
      ...list,
      {
        id: `ST-${n}`,
        name: form.name.trim(),
        specialty: form.specialty,
        availability: 'offline',
        coverage: form.coverage.trim(),
        coverageNote: 'Single Zone',
        workload: 0,
        tickets: 0,
        email: `${parts[0][0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}@siranaba.com`,
        phone: form.phone.trim() || '—',
      },
    ]);
    setModalOpen(false);
  };

  const removeStaff = (id) => {
    setStaff((list) => list.filter((s) => s.id !== id));
    setMenuId(null);
  };

  const toggleAvailability = (id) => {
    setStaff((list) =>
      list.map((s) => (s.id === id ? { ...s, availability: s.availability === 'online' ? 'offline' : 'online' } : s))
    );
    setMenuId(null);
  };

  const findTech = () => {
    const pick = [...online].sort((a, b) => a.workload - b.workload)[0];
    setDispatchPick(pick || 'none');
  };

  return (
    <AdminLayout crumb="Staff Management">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Maintenance Staff Management</h1>
            <p className="max-w-xl text-sm text-ink-700/60">
              Monitor workforce availability, specialty distribution, and active workload telemetry across all property sectors.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              <Icon name="grid" size={15} /> Specialty Matrix
            </button>
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
            >
              <Icon name="plus" size={15} /> Add New Staff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.id} {...s} />
          ))}
        </div>

        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="relative flex-1 sm:max-w-md">
              <span className="sr-only">Search staff</span>
              <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                value={query}
                onChange={(e) => resetPage(setQuery)(e.target.value)}
                placeholder="Search staff by name, ID, or coverage area..."
                className="w-full rounded-lg border border-black/10 py-2 pl-8 pr-3 text-sm outline-none focus:border-forest-400"
              />
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <select
                value={specialty}
                onChange={(e) => resetPage(setSpecialty)(e.target.value)}
                aria-label="Filter by specialty"
                className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400"
              >
                <option>All Specialties</option>
                {specialties.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-sand-100 ${
                  showFilters ? 'border-forest-400 text-forest-700' : 'border-black/10'
                }`}
              >
                <Icon name="filter" size={14} /> Filter
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-sand-50 p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Availability</span>
              {['All', 'online', 'away', 'offline'].map((a) => (
                <button
                  key={a}
                  onClick={() => resetPage(setAvailability)(a)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    availability === a ? 'bg-forest-500 text-white' : 'bg-white text-ink-700/70 hover:bg-sand-100'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                  <th className="pb-2 pr-3">Professional Identity</th>
                  <th className="pb-2 pr-3">Specialty & Role</th>
                  <th className="pb-2 pr-3">Availability</th>
                  <th className="pb-2 pr-3">Coverage Area</th>
                  <th className="pb-2 pr-3">Workload Telemetry</th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((s) => {
                  const av = AVAILABILITY[s.availability];
                  return (
                    <tr key={s.id}>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={s.name} />
                          <span className="leading-tight">
                            <span className="block font-semibold text-ink-900">{s.name}</span>
                            <span className="block font-mono text-[11px] text-ink-700/50">{s.id}</span>
                          </span>
                        </span>
                        <span className="mt-1 flex flex-col text-[11px] text-ink-700/50">
                          <span className="flex items-center gap-1.5"><Icon name="mail" size={11} />{s.email}</span>
                          <span className="flex items-center gap-1.5"><Icon name="phone" size={11} />{s.phone}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-1.5 font-medium text-ink-900">
                          <Icon name={SPECIALTY_ICONS[s.specialty] || 'wrench'} size={14} className="text-forest-600" />
                          {s.specialty}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-900">
                          <span className={`h-2 w-2 rounded-full ${av.dot}`} /> {av.label}
                        </span>
                        <span className={`mt-0.5 block pl-3.5 text-[10px] font-bold ${av.tagCls}`}>{av.tag}</span>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-ink-900">
                          <Icon name="mapPin" size={12} className="text-ink-700/40" /> {s.coverage}
                        </span>
                        <span className="block pl-[18px] text-ink-700/50">{s.coverageNote}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="w-40">
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-ink-700/60">
                            <span>{s.workload}%</span>
                            <span>{s.tickets} {s.tickets === 1 ? 'TICKET' : 'TICKETS'}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
                            <div className={`h-full rounded-full ${loadColor(s.workload)}`} style={{ width: `${s.workload}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="relative py-3 text-right">
                        <button
                          onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                          aria-label={`Actions for ${s.name}`}
                          className="rounded-md p-1 text-ink-700/50 hover:bg-sand-100"
                        >
                          <Icon name="dots" size={16} />
                        </button>
                        {menuId === s.id && (
                          <>
                            <button aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuId(null)} />
                            <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-black/10 bg-white text-left shadow-lg">
                              <button onClick={() => toggleAvailability(s.id)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                                <Icon name="refresh" size={14} /> Mark {s.availability === 'online' ? 'Offline' : 'Online'}
                              </button>
                              <button onClick={() => removeStaff(s.id)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-status-high hover:bg-status-highBg">
                                <Icon name="trash" size={14} /> Remove Staff
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-700/50">
                {empty ? 'No staff registered yet.' : 'No staff match this filter.'}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 text-xs text-ink-700/50">
            <span>Showing {rows.length} of {filtered.length} staff members</span>
            <span className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded px-2 py-1 font-semibold hover:bg-sand-100 disabled:opacity-40"
              >
                PREVIOUS
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                  className={`h-7 w-7 rounded font-semibold ${
                    n === currentPage ? 'bg-forest-500 text-white' : 'hover:bg-sand-100'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                className="rounded px-2 py-1 font-semibold hover:bg-sand-100 disabled:opacity-40"
              >
                NEXT
              </button>
            </span>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div ref={matrixRef} className="scroll-mt-4 lg:col-span-2">
          <Card className="h-full p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-900">
              <Icon name="trend" size={16} className="text-ink-700/50" /> Specialty Capacity Matrix
            </h2>
            <div className="space-y-4">
              {matrix.map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold text-ink-900">
                      {m.label}
                      <span className="rounded bg-sand-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-700/50">{m.count} STAFF</span>
                    </span>
                    <span className="text-[11px] font-bold text-ink-700/50">{m.util}% UTILIZATION</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sand-100">
                    <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.util}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs italic text-ink-700/50">
              <span>{empty ? 'No capacity data yet.' : 'Workforce capacity updated moments ago.'}</span>
              <button className="font-semibold not-italic text-forest-600 hover:underline">OPTIMIZATION REPORT</button>
            </div>
          </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-forest-200 bg-forest-50 p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-forest-800">
                <Icon name="bolt" size={15} /> Rapid Dispatch
              </h2>
              <p className="mb-4 text-xs text-ink-700/70">
                Identify and deploy the nearest online specialist for immediate critical hazard mitigation.
              </p>
              <button
                onClick={findTech}
                className="mb-2 w-full rounded-md bg-forest-600 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
              >
                Find Available Tech
              </button>
              <button
                onClick={() => setSmsSent(true)}
                disabled={smsSent || online.length === 0}
                className="w-full rounded-md border border-black/10 bg-white py-2.5 text-sm font-semibold hover:bg-sand-100 disabled:text-forest-600"
              >
                {smsSent ? `✓ SMS sent to ${online.length} online staff` : 'Mass Notification (SMS)'}
              </button>
              {dispatchPick && (
                <p className="mt-3 rounded-md bg-white p-3 text-xs text-ink-900" role="status">
                  {dispatchPick === 'none' ? (
                    'No staff are currently online.'
                  ) : (
                    <>
                      <span className="font-semibold">{dispatchPick.name}</span> ({dispatchPick.specialty}) is the best
                      match: {dispatchPick.workload}% workload, {dispatchPick.coverage}.
                    </>
                  )}
                </p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-900">Operational Status</h2>
              <div className="space-y-2">
                {operationalStatus.map((o) => (
                  <div key={o.label} className="flex items-center gap-3 rounded-lg border border-black/5 p-3">
                    <Icon name={o.icon} size={18} className={o.tone === 'success' ? 'text-status-success' : o.tone === 'progress' ? 'text-status-progress' : 'text-ink-700/40'} />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold text-ink-900">{o.label}</p>
                      <p className="text-xs text-ink-700/50">{o.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">
          <span className="flex gap-4">
            <button className="hover:text-ink-900">Access Logs</button>
            <button className="hover:text-ink-900">HR Compliance</button>
            <button className="hover:text-ink-900">Insurance Docs</button>
          </span>
          {version && <span className="font-mono normal-case">{version}</span>}
        </footer>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Staff"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-sand-100">
              Cancel
            </button>
            <button type="submit" form="add-staff" className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600">
              Add Staff Member
            </button>
          </>
        }
      >
        <form id="add-staff" onSubmit={submit} noValidate className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">Full Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maria Santos" className={inputCls} />
            {errors.name && <span className="mt-1 block text-xs text-status-high">{errors.name}</span>}
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Specialty</span>
              <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className={inputCls}>
                {specialties.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Contact Number</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">Coverage Area</span>
            <input value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} placeholder="e.g. Building A, Parking Lot" className={inputCls} />
            {errors.coverage && <span className="mt-1 block text-xs text-status-high">{errors.coverage}</span>}
          </label>
        </form>
      </Modal>
    </AdminLayout>
  );
}
