import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatPhp, formatDate, formatRelativeTime, formatPaidAt } from '../../utils/format.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';
import { tenantManagement } from '../../data/adminMockDb.js';
import { endpoints } from '../../api/endpoints.js';
import { MethodLogo, methodTitle, methodSubtitle } from '../../components/billing/PaymentParts.jsx';
import { useTenantRegistry } from '../../context/TenantRegistryContext.jsx';
import { TOWERS, UNIT_TYPES, RENT_BY_TYPE, ALL_ROOMS, levelByKey, roomById, vacantRooms } from '../../data/buildingData.js';

const ACTIVITY_TONES = {
  success: 'bg-status-successBg text-status-success',
  progress: 'bg-status-progressBg text-status-progress',
};

// `type`, `tower` and `roomId` come from the building map (buildingData.js), so a
// tenant can only be assigned to a room that really exists and is still vacant.
const todayISO = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD

const EMPTY_FORM = () => ({
  name: '',
  type: UNIT_TYPES[0],
  tower: TOWERS[0].id,
  roomId: '',
  leaseStart: todayISO(),
  email: '',
  phone: '',
});

const inputCls =
  'w-full rounded-md border border-black/10 bg-sand-50 px-3 py-2 text-sm outline-none focus:border-forest-400';

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
}

function exportCsv(rows) {
  const header = ['ID', 'Name', 'Tower', 'Unit', 'Unit Type', 'Email', 'Phone', 'Occupancy', 'Lease Start', 'Monthly Rent (PHP)', 'Payment', 'Due Date', 'Account'];
  const lines = rows.map((t) =>
    [t.id, t.name, `Tower ${t.tower}`, t.unit, t.type, t.email, t.phone, t.occupancy, t.leaseStart, t.rent, t.payment, t.dueDate, t.account]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tenants.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-ink-900">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-status-high">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-700/50">{hint}</span>
      )}
    </label>
  );
}

export default function TenantManagement() {
  const { tenants, activity, occupiedIds, loading, syncError, reload, pushActivity } = useTenantRegistry();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState({ invoices: false, ledger: false });

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [paymentFilter, setPaymentFilter] = useState('All Payments');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // { tone: 'success' | 'warning' | 'error', text } shown above the stats.
  const [notice, setNotice] = useState(null);

  // Edit Details modal: which tenant is being edited, plus its form state.
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Payments made by tenants (from the database, same records as the tenant's Billing page).
  const [payments, setPayments] = useState([]);
  const [paymentsError, setPaymentsError] = useState('');
  const loadPayments = useCallback(async () => {
    try {
      setPayments(await endpoints.getAdminRecentPayments(10));
      setPaymentsError('');
    } catch (err) {
      setPaymentsError(err.message || "Couldn't load payments.");
    }
  }, []);
  useEffect(() => {
    loadPayments();
  }, [loadPayments]);
  useAutoRefresh(loadPayments);

  // "View Payments" modal: one tenant's history + saved methods.
  const [payTarget, setPayTarget] = useState(null);
  const [payDetail, setPayDetail] = useState(null);
  const [payDetailError, setPayDetailError] = useState('');
  const openPayments = async (t) => {
    setMenuId(null);
    setPayTarget(t);
    setPayDetail(null);
    setPayDetailError('');
    try {
      setPayDetail(await endpoints.getAdminTenantPayments(t.accountId));
    } catch (err) {
      setPayDetailError(err.message || "Couldn't load this tenant's payments.");
    }
  };

  const nextId = `T-${String(tenants.reduce((m, t) => Math.max(m, parseInt(t.id.slice(2), 10) || 0), 0) + 1).padStart(4, '0')}`;

  const stats = useMemo(() => {
    const overdue = tenants.filter((t) => t.payment === 'Overdue').length;
    const pct = (occupiedIds.size / ALL_ROOMS.length) * 100;
    return [
      { id: 'total', label: 'Total Tenants', value: String(tenants.length), delta: tenants.length ? 'Registry count' : '—', icon: 'users' },
      {
        id: 'occ',
        label: 'Occupancy',
        value: `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`,
        delta: `${occupiedIds.size} / ${ALL_ROOMS.length} units occupied`,
        tone: occupiedIds.size ? 'success' : 'neutral',
        icon: 'grid',
      },
      {
        id: 'delinq',
        label: 'Delinquencies',
        value: String(overdue),
        delta: !tenants.length ? '—' : overdue ? 'Needs attention' : 'All clear',
        tone: !tenants.length ? 'neutral' : overdue ? 'danger' : 'success',
        icon: 'alert',
      },
      {
        id: 'rent',
        label: 'Gross Rent',
        value: formatPhp(tenants.reduce((s, t) => s + t.rent, 0)),
        delta: tenants.length ? 'Current cycle' : '—',
        icon: 'dollar',
      },
    ];
  }, [tenants, occupiedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter(
      (t) =>
        (!q || [t.name, t.unit, t.id, t.email, t.type, `T${t.tower}`].some((v) => v.toLowerCase().includes(q))) &&
        (typeFilter === 'All Types' || t.type === typeFilter) &&
        (paymentFilter === 'All Payments' || t.payment === paymentFilter)
    );
  }, [tenants, query, typeFilter, paymentFilter]);

  // Vacant rooms for the selected unit type + tower, grouped by floor for the dropdown.
  const vacantOptions = useMemo(() => {
    const rooms = vacantRooms({ type: form.type, tower: form.tower, occupiedIds });
    const groups = [];
    rooms.forEach((r) => {
      const label = levelByKey(r.levelKey).label;
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.rooms.push(r);
      else groups.push({ label, rooms: [r] });
    });
    // Lowest floor first reads more naturally in a dropdown than the map's top-down order.
    return { count: rooms.length, groups: groups.reverse() };
  }, [form.type, form.tower, occupiedIds]);

  // "Studio (88 vacant)" - counts across both towers.
  const vacantByType = useMemo(() => {
    const counts = Object.fromEntries(UNIT_TYPES.map((t) => [t, 0]));
    ALL_ROOMS.forEach((r) => {
      if (!occupiedIds.has(r.id)) counts[r.type] += 1;
    });
    return counts;
  }, [occupiedIds]);

  const openModal = (roomId = '') => {
    const room = roomById(roomId);
    setForm(room ? { ...EMPTY_FORM(), type: room.type, tower: room.tower, roomId: room.id } : EMPTY_FORM());
    setErrors({});
    setSubmitError('');
    setModalOpen(true);
  };

  // Arriving from the Map View ("Assign tenant" / "View in registry") passes the
  // room or tenant through router state.
  useEffect(() => {
    const st = location.state;
    if (!st) return;
    if (st.assignRoomId && !occupiedIds.has(st.assignRoomId)) openModal(st.assignRoomId);
    if (st.query) setQuery(st.query);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = {};
    if (!form.name.trim()) next.name = 'Full legal name is required';
    const room = roomById(form.roomId);
    if (!room) next.roomId = 'Select a vacant unit';
    else if (occupiedIds.has(room.id)) next.roomId = 'This unit is already assigned';
    if (!form.leaseStart) next.leaseStart = 'Select a lease start date';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    setErrors(next);
    if (Object.keys(next).length) return;

    // The server creates the tenant record and login (using the registered email),
    // works out the rent from the unit type, and emails the login details.
    setSubmitting(true);
    setSubmitError('');
    let created;
    try {
      created = await endpoints.registerTenant({
        fullName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        roomId: room.id,
        tower: room.tower,
        unit: room.number,
        unitType: room.type,
        leaseStart: form.leaseStart,
      });
    } catch (err) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);

    // The tenant now exists in the database; pull the fresh list (with its real ID).
    await reload();
    const tenant = {
      name: form.name.trim(),
      email: form.email.trim(),
      tower: room.tower,
      unit: room.number,
      leaseStart: form.leaseStart,
    };
    pushActivity({
      icon: 'plus',
      tone: 'success',
      title: 'New Lease Registered',
      detail: `${tenant.name} (Tower ${tenant.tower}, Unit ${tenant.unit}) successfully onboarded. Lease starts ${formatDate(tenant.leaseStart + 'T00:00:00')}.`,
    });
    setModalOpen(false);
    setNotice({
      tone: created.emailSent ? 'success' : 'warning',
      text: `${tenant.name}'s account was created with ${tenant.email}. ${created.emailMessage}`,
    });
  };

  const markPaid = async (t) => {
    setMenuId(null);
    // Clears the balance in the database, so the tenant's Billing page shows it too.
    try {
      await endpoints.markTenantPaid(t.accountId);
    } catch (err) {
      setNotice({ tone: 'error', text: `Couldn't mark ${t.name} as paid: ${err.message}` });
      return;
    }
    await reload();
    loadPayments();
    pushActivity({ icon: 'check', tone: 'success', title: 'Payment Received', detail: `${t.name} (Unit ${t.unit}) marked as paid.` });
  };

  const removeTenant = async (t) => {
    setMenuId(null);
    // Deletes the tenant record and their login, so the unit can be assigned again.
    try {
      await endpoints.removeTenantAccount(t.accountId);
    } catch (err) {
      setNotice({ tone: 'error', text: `Couldn't remove ${t.name}: ${err.message}` });
      return;
    }
    await reload();
    pushActivity({ icon: 'trash', tone: 'progress', title: 'Tenant Removed', detail: `${t.name} left ${t.tower ? `Tower ${t.tower}` : t.building || 'the building'}, Unit ${t.unit}. The unit is vacant again.` });
  };

  const openEdit = (t) => {
    setMenuId(null);
    setEditForm({ firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone });
    setEditError('');
    setEditTarget(t);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (editSaving || !editTarget) return;
    const f = { ...editForm, firstName: editForm.firstName.trim(), lastName: editForm.lastName.trim(), email: editForm.email.trim(), phone: editForm.phone.trim() };
    if (!f.firstName || !f.lastName) return setEditError('First and last name are required.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setEditError('Enter a valid email.');

    setEditSaving(true);
    setEditError('');
    try {
      // Same record the tenant edits in Account Settings, so they see this too.
      await endpoints.updateAdminTenant(editTarget.accountId, {
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.email,
        phone: f.phone || null,
      });
    } catch (err) {
      setEditError(err.message || 'Could not save changes. Please try again.');
      setEditSaving(false);
      return;
    }
    setEditSaving(false);
    await reload();
    const emailChanged = f.email.toLowerCase() !== editTarget.email.toLowerCase();
    pushActivity({ icon: 'pencil', tone: 'success', title: 'Tenant Details Updated', detail: `${f.firstName} ${f.lastName} (Unit ${editTarget.unit}) contact details were updated.` });
    setNotice({
      tone: 'success',
      text: `${f.firstName} ${f.lastName}'s details were saved.${emailChanged ? ` Their sign-in email is now ${f.email.toLowerCase()}.` : ''}`,
    });
    setEditTarget(null);
  };

  return (
    <AdminLayout crumb="Tenant & Financial">
      <div className="space-y-6">
        {notice && (
          <div
            role="status"
            className={`flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm ${
              { success: 'bg-status-successBg text-status-success', warning: 'bg-status-progressBg text-status-progress', error: 'bg-status-highBg text-status-high' }[notice.tone]
            }`}
          >
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss" className="flex-shrink-0 opacity-70 hover:opacity-100">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        {syncError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-status-progressBg px-4 py-3 text-sm text-status-progress">
            <span>Couldn't refresh tenants from the server ({syncError}). Showing the last data loaded.</span>
            <button onClick={reload} className="flex-shrink-0 font-semibold underline">Retry</button>
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Tenant Management</h1>
            <p className="text-sm text-ink-700/60">Admin-level facility directory and occupancy oversight.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportCsv(filtered)}
              className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              <Icon name="download" size={15} /> Export
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
            >
              <Icon name="plus" size={15} /> Add New Tenant
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
            <label className="relative flex-1 sm:max-w-xs">
              <span className="sr-only">Search tenants</span>
              <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search identity, unit, ID..."
                className="w-full rounded-lg border border-black/10 py-2 pl-8 pr-3 text-sm outline-none focus:border-forest-400"
              />
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by type"
                className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400"
              >
                <option>All Types</option>
                {UNIT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-sand-100 ${
                  showFilters ? 'border-forest-400 text-forest-700' : 'border-black/10'
                }`}
              >
                <Icon name="filter" size={14} /> Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-sand-50 p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Payment</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-forest-400"
              >
                <option>All Payments</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Overdue</option>
              </select>
              <button
                onClick={() => {
                  setPaymentFilter('All Payments');
                  setTypeFilter('All Types');
                  setQuery('');
                }}
                className="ml-auto text-xs font-semibold text-forest-600 hover:underline"
              >
                Reset
              </button>
            </div>
          )}

          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                  <th className="pb-2 pr-3">Tenant Identity</th>
                  <th className="pb-2 pr-3">Unit</th>
                  <th className="pb-2 pr-3">Contact Info</th>
                  <th className="pb-2 pr-3">Lease / Occupancy</th>
                  <th className="pb-2 pr-3">Rent</th>
                  <th className="pb-2 pr-3">Payment</th>
                  <th className="pb-2 pr-3">Due Date</th>
                  <th className="pb-2 pr-3">Account Status</th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="py-3 pr-3">
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-forest-100 text-[10px] font-semibold text-forest-700">
                          {initials(t.name)}
                        </span>
                        <span className="leading-tight">
                          <span className="block font-semibold text-ink-900">{t.name}</span>
                          <span className="font-mono text-[11px] text-ink-700/50">{t.id}</span>
                        </span>
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="block font-mono text-xs text-ink-900">{t.tower ? `T${t.tower}` : t.building || '—'} · {t.unit}</span>
                      <span className="text-[11px] text-ink-700/50">{t.type || '—'}</span>
                    </td>
                    <td className="py-3 pr-3 text-xs leading-relaxed text-ink-700/70">
                      <span className="flex items-center gap-1.5"><Icon name="mail" size={12} />{t.email || '—'}</span>
                      <span className="flex items-center gap-1.5"><Icon name="phone" size={12} />{t.phone || '—'}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge label={t.occupancy} />
                      {t.leaseStart && (
                        <span className="mt-1 block text-[11px] text-ink-700/50">
                          Starts {formatDate(t.leaseStart + 'T00:00:00')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-ink-900">{formatPhp(t.rent)}</td>
                    <td className="py-3 pr-3"><StatusBadge label={t.payment} /></td>
                    <td className="whitespace-nowrap py-3 pr-3 text-xs text-ink-700/70">
                      <span className="flex items-center gap-1.5"><Icon name="calendar" size={12} />{t.dueDate ? formatDate(t.dueDate + 'T00:00:00', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}</span>
                    </td>
                    <td className="py-3 pr-3"><StatusBadge label={t.account} /></td>
                    <td className="relative py-3 text-right">
                      <button
                        onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                        aria-label={`Actions for ${t.name}`}
                        className="rounded-md p-1 text-ink-700/50 hover:bg-sand-100"
                      >
                        <Icon name="dots" size={16} />
                      </button>
                      {menuId === t.id && (
                        <>
                          <button aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuId(null)} />
                          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-black/10 bg-white text-left shadow-lg">
                            <button onClick={() => openEdit(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                              <Icon name="pencil" size={14} /> Edit Details
                            </button>
                            <button onClick={() => openPayments(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                              <Icon name="card" size={14} /> View Payments
                            </button>
                            {t.payment !== 'Paid' && (
                              <button onClick={() => markPaid(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                                <Icon name="check" size={14} /> Mark as Paid
                              </button>
                            )}
                            <button onClick={() => removeTenant(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-status-high hover:bg-status-highBg">
                              <Icon name="trash" size={14} /> Remove Tenant
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-700/50">
                {loading && tenants.length === 0
                  ? 'Loading tenants…'
                  : tenants.length === 0
                    ? 'No tenants registered yet.'
                    : 'No tenants match this filter.'}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-ink-700/50">
            <span>Showing {filtered.length} of {tenants.length} tenants</span>
            <span className="flex gap-2">
              <button disabled className="rounded border border-black/10 px-2.5 py-1 font-semibold opacity-50">PREV</button>
              <button disabled className="rounded border border-black/10 px-2.5 py-1 font-semibold opacity-50">NEXT</button>
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-ink-900">Recent Payments</h2>
              <p className="text-xs text-ink-700/50">Live from the database: payments made by tenants in their portal, plus ones you record.</p>
            </div>
            <button onClick={loadPayments} className="flex items-center gap-1 text-xs font-semibold uppercase text-forest-600 hover:underline">
              <Icon name="refresh" size={12} /> Refresh
            </button>
          </div>
          {paymentsError && <p role="alert" className="mb-2 text-xs text-status-high">{paymentsError}</p>}
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                  <th className="pb-2 pr-3">Reference Code</th>
                  <th className="pb-2 pr-3">Tenant</th>
                  <th className="pb-2 pr-3">Payment Mode</th>
                  <th className="pb-2 pr-3">Date &amp; Time (PHT)</th>
                  <th className="pb-2 pr-3 text-right">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {payments.map((p) => {
                  const when = formatPaidAt(p.paidAt, p.date);
                  return (
                    <tr key={p.referenceCode}>
                      <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-ink-900">{p.referenceCode}</td>
                      <td className="py-2.5 pr-3 leading-tight">
                        <span className="block font-semibold text-ink-900">{p.tenantName}</span>
                        <span className="text-[11px] text-ink-700/50">{p.tenantCode} · Unit {p.unit}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-700/80">{p.paymentMode || '—'}</td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-xs leading-tight text-ink-700/70">
                        <span className="block">{when.date}</span>
                        <span className="text-ink-700/50">{when.time}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-ink-900">{formatPhp(p.amount)}</td>
                      <td className="py-2.5"><StatusBadge label={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {payments.length === 0 && !paymentsError && (
              <p className="py-6 text-center text-sm text-ink-700/50">No payments recorded yet.</p>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-ink-900">Recent Account Activity</h2>
                <p className="text-xs text-ink-700/50">Automated financial assessments and record updates.</p>
              </div>
              <button className="text-xs font-semibold uppercase text-forest-600 hover:underline">Full Audit Trail</button>
            </div>
            {activity.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-700/50">No account activity yet.</p>
            )}
            <ul className="divide-y divide-black/5">
              {activity.map((a, i) => (
                <li key={`${a.title}-${i}`} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${ACTIVITY_TONES[a.tone]}`}>
                      <Icon name={a.icon} size={13} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{a.title}</p>
                      <p className="text-xs text-ink-700/60">{a.detail}</p>
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs text-ink-700/40">{formatRelativeTime(a.at)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-ink-900">System Tasks</h2>
            {tenantManagement.systemTasks.length === 0 && (
              <p className="mb-4 text-xs text-ink-700/50">No scheduled tasks running.</p>
            )}
            {tenantManagement.systemTasks.map((task) => (
              <div key={task.id} className="mb-4">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase text-ink-700/50">
                  <span>{task.label}</span>
                  <span className="text-forest-600">{Math.round(task.progress * 100)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
                  <div className="h-full rounded-full bg-forest-500" style={{ width: `${task.progress * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <button
                onClick={() => setTasks((s) => ({ ...s, invoices: true }))}
                disabled={tasks.invoices}
                className="w-full rounded-md border border-black/10 py-2 text-sm font-medium hover:bg-sand-100 disabled:text-forest-600"
              >
                {tasks.invoices ? '✓ Invoices queued' : 'Generate Monthly Invoices'}
              </button>
              <button
                onClick={() => setTasks((s) => ({ ...s, ledger: true }))}
                disabled={tasks.ledger}
                className="w-full rounded-md border border-black/10 py-2 text-sm font-medium hover:bg-sand-100 disabled:text-forest-600"
              >
                {tasks.ledger ? '✓ Ledger synced' : 'Sync Ledger to Cloud'}
              </button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={`Payments: ${payTarget?.name || ''}`}
        maxWidth="max-w-2xl"
        footer={
          <button onClick={() => setPayTarget(null)} className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600">
            Close
          </button>
        }
      >
        {payDetailError && <p role="alert" className="text-xs text-status-high">{payDetailError}</p>}
        {!payDetail && !payDetailError && <p className="py-6 text-center text-sm text-ink-700/50">Loading…</p>}
        {payDetail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg bg-sand-100 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-700/50">Total paid</span>
              <span className="text-lg font-bold text-ink-900">{formatPhp(payDetail.totalPaid)}</span>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Payment history</p>
              {payDetail.transactions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-black/10 bg-sand-50 p-4 text-center text-sm text-ink-700/50">No payments yet.</p>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                        <th className="pb-2 pr-3">Reference</th>
                        <th className="pb-2 pr-3">Mode</th>
                        <th className="pb-2 pr-3">Date &amp; Time (PHT)</th>
                        <th className="pb-2 pr-3 text-right">Amount</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {payDetail.transactions.map((tx) => {
                        const when = formatPaidAt(tx.paidAt, tx.date);
                        return (
                          <tr key={tx.id}>
                            <td className="py-2 pr-3 font-mono text-xs font-semibold">{tx.id}</td>
                            <td className="py-2 pr-3">{tx.paymentMode || '—'}</td>
                            <td className="whitespace-nowrap py-2 pr-3 text-xs leading-tight text-ink-700/70">
                              {when.date}<br />{when.time}
                            </td>
                            <td className="py-2 pr-3 text-right font-semibold">{formatPhp(tx.amount)}</td>
                            <td className="py-2"><StatusBadge label={tx.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Saved payment methods</p>
              {payDetail.paymentMethods.length === 0 ? (
                <p className="rounded-lg border border-dashed border-black/10 bg-sand-50 p-4 text-center text-sm text-ink-700/50">None saved.</p>
              ) : (
                <div className="space-y-2">
                  {payDetail.paymentMethods.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-black/5 p-3">
                      <MethodLogo method={m} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{methodTitle(m)}</p>
                        <p className="truncate text-xs text-ink-700/50">{methodSubtitle(m)}</p>
                      </div>
                      {m.isPrimary && <StatusBadge label="Primary" tone="success" />}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-ink-700/40">Only the last 4 digits are on file. Full card numbers and CVVs are never stored.</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Tenant Details"
        footer={
          <>
            <button onClick={() => setEditTarget(null)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-sand-100">
              Cancel
            </button>
            <button
              type="submit"
              form="edit-tenant"
              disabled={editSaving}
              className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
            >
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <p className="-mt-2 mb-4 text-xs text-ink-700/60">
          {editTarget?.id} · {editTarget?.tower ? `Tower ${editTarget.tower}` : editTarget?.building}, Unit {editTarget?.unit}. These are the same details the tenant
          sees in their Account Settings; changing the email also changes the address they sign in with.
        </p>
        <form id="edit-tenant" onSubmit={saveEdit} noValidate className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First Name">
              <input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Last Name">
              <input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Email Address">
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Contact Number">
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} />
            </Field>
          </div>
          {editError && (
            <p role="alert" className="rounded-md bg-status-highBg px-3 py-2 text-xs text-status-high">
              {editError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Tenant"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-sand-100">
              Cancel
            </button>
            <button
              type="submit"
              form="register-tenant"
              disabled={submitting}
              className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
            >
              {submitting ? 'Registering…' : 'Authorize Registration'}
            </button>
          </>
        }
      >
        <p className="-mt-2 mb-4 text-xs text-ink-700/60">
          Input mandatory lease information and contact records. A tenant account is created with the email below and the login details are emailed to it.
        </p>
        <form id="register-tenant" onSubmit={submit} noValidate className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-700/40">Personal Identity</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Full Legal Name" error={errors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jonathan Burke" className={inputCls} />
              </Field>
              <Field label="System ID (Auto)">
                <input value={nextId} readOnly className={`${inputCls} font-mono text-ink-700/60`} />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-700/40">Location & Lease</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Unit Type">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value, roomId: '' })}
                  className={inputCls}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tower">
                <select
                  value={form.tower}
                  onChange={(e) => setForm({ ...form, tower: Number(e.target.value), roomId: '' })}
                  className={inputCls}
                >
                  {TOWERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Assigned Unit"
                error={errors.roomId}
                hint={`${vacantOptions.count} vacant ${vacantOptions.count === 1 ? 'unit' : 'units'}`}
              >
                <select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  disabled={vacantOptions.count === 0}
                  className={inputCls}
                >
                  <option value="">{vacantOptions.count === 0 ? 'No vacant units' : 'Select a unit…'}</option>
                  {vacantOptions.groups.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Lease Start Date" error={errors.leaseStart}>
                <input
                  type="date"
                  value={form.leaseStart}
                  onChange={(e) => setForm({ ...form, leaseStart: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Monthly Rent (PHP)"
                hint={`Fixed rate for ${form.type} units.`}
              >
                <input
                  value={formatPhp(RENT_BY_TYPE[form.type])}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  className={`${inputCls} cursor-not-allowed bg-sand-100 font-semibold text-ink-700/70`}
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-700/40">Contact & Notifications</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Email Address" error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tenant@example.com" className={inputCls} />
              </Field>
              <Field label="Contact Number">
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" className={inputCls} />
              </Field>
            </div>
          </div>
          {submitError && (
            <p role="alert" className="rounded-md bg-status-highBg px-3 py-2 text-xs text-status-high">
              {submitError}
            </p>
          )}
        </form>
      </Modal>
    </AdminLayout>
  );
}
