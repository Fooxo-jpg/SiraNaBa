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
import { endpoints } from '../../api/endpoints.js';
import AuditExportModal from '../../components/admin/AuditExportModal.jsx';
import AdminBillingPanel from '../../components/billing/AdminBillingPanel.jsx';
import BillingDetails, { amountLabel } from '../../components/billing/BillingDetails.jsx';
import { useTenantRegistry } from '../../context/TenantRegistryContext.jsx';
import { UNIT_TYPES, RENT_BY_TYPE, ALL_ROOMS, levelByKey, roomById, vacantRooms } from '../../data/buildingData.js';

const ACTIVITY_TONES = {
  success: 'bg-status-successBg text-status-success',
  progress: 'bg-status-progressBg text-status-progress',
};

// `type` and `roomId` come from the building map (buildingData.js), so a
// tenant can only be assigned to a room that really exists and is still vacant.
const todayISO = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD

const EMPTY_FORM = () => ({
  name: '',
  type: UNIT_TYPES[0],
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
  const header = ['ID', 'Name', 'Building', 'Unit', 'Unit Type', 'Email', 'Phone', 'Occupancy', 'Lease Start', 'Monthly Rent (PHP)', 'Payment', 'Due Date', 'Account'];
  const lines = rows.map((t) =>
    [t.id, t.name, 'Main Building', t.unit, t.type, t.email, t.phone, t.occupancy, t.leaseStart, t.rent, t.payment, t.dueDate, t.account]
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

  // Clicking a tenant opens their profile and a small billing workbench.
  const [billTarget, setBillTarget] = useState(null);

  // Payments made by tenants (from the database, same records as the tenant's Billing page).
  const [payments, setPayments] = useState([]);
  const [paymentsError, setPaymentsError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const loadPayments = useCallback(async () => {
    try {
      setPayments(await endpoints.getAdminRecentPayments(3));
      setPaymentsError('');
    } catch (err) {
      setPaymentsError(err.message || "Couldn't load payments.");
    }
  }, []);
  const refreshPayments = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPayments(), reload()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadPayments, reload]);
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

  // All vacant rooms in Main Building, grouped by floor for the dropdown.
  // The room itself determines its type and rent after it is selected.
  const vacantOptions = useMemo(() => {
    const rooms = vacantRooms({ occupiedIds });
    const groups = [];
    rooms.forEach((r) => {
      const label = levelByKey(r.levelKey).label;
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.rooms.push(r);
      else groups.push({ label, rooms: [r] });
    });
    // Lowest floor first reads more naturally in a dropdown than the map's top-down order.
    return { count: rooms.length, groups: groups.reverse() };
  }, [occupiedIds]);

  const openModal = (roomId = '') => {
    const room = roomById(roomId);
    setForm(room ? { ...EMPTY_FORM(), type: room.type, roomId: room.id } : EMPTY_FORM());
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
        leaseStart: form.leaseStart,
      });
    } catch (err) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
      setSubmitting(false);
      return;
    }
    // The account and room assignment are complete at this point. Email delivery
    // continues separately so a slow SMTP server cannot hold this modal open.
    setSubmitting(false);
    setModalOpen(false);

    // Pull the fresh list (with its real ID) so the tenant appears in the table
    // and building map immediately.
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
      detail: `${tenant.name} (Main Building, Unit ${tenant.unit}) successfully onboarded. Lease starts ${formatDate(tenant.leaseStart + 'T00:00:00')}.`,
    });
    setNotice({
      tone: created.emailSent ? 'success' : 'warning',
      text: `${tenant.name}'s account was created with ${tenant.email}. ${created.emailMessage}`,
    });
  };

  const markPaid = (t) => { setMenuId(null); setBillTarget(t); };

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
    pushActivity({ icon: 'trash', tone: 'progress', title: 'Tenant Removed', detail: `${t.name} left Main Building, Unit ${t.unit}. The unit is vacant again.` });
  };

  const openEdit = (t) => {
    setMenuId(null);
    setEditForm({ firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone });
    setEditError('');
    setEditTarget(t);
  };

  const openTenantProfile = (t) => { setMenuId(null); setBillTarget(t); };

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
                  <tr key={t.id} className="cursor-pointer hover:bg-sand-50/70" onClick={() => openTenantProfile(t)}>
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
                      <span className="block font-mono text-xs text-ink-900">Main Building · {t.unit}</span>
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
                        onClick={(e) => { e.stopPropagation(); setMenuId(menuId === t.id ? null : t.id); }}
                        aria-label={`Actions for ${t.name}`}
                        className="rounded-md p-1 text-ink-700/50 hover:bg-sand-100"
                      >
                        <Icon name="dots" size={16} />
                      </button>
                      {menuId === t.id && (
                        <>
                          <button aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuId(null)} />
                          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-black/10 bg-white text-left shadow-lg">
                            <button onClick={() => openTenantProfile(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                              <Icon name="users" size={14} /> View profile & bill
                            </button>
                            <button onClick={() => openEdit(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                              <Icon name="pencil" size={14} /> Edit Details
                            </button>
                            <button onClick={() => openPayments(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                              <Icon name="card" size={14} /> View Payments
                            </button>
                            {t.payment !== 'Paid' && (
                              <button onClick={() => markPaid(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-sand-100">
                                <Icon name="check" size={14} /> Record Payment
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="flex flex-col p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-ink-900">Recent Account Activity</h2>
              </div>
              <button onClick={() => setAuditOpen(true)} className="flex items-center gap-1 text-xs font-semibold uppercase text-forest-600 hover:underline">
                <Icon name="download" size={12} /> Full Audit Trail
              </button>
            </div>
            <div className="relative min-h-[240px] flex-1">
            <div className="absolute inset-0 overflow-y-auto thin-scrollbar">
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
            </div>
            </div>
          </Card>

          <Card className="p-5 lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-ink-900">Recent Payments</h2>
              </div>
              <button onClick={refreshPayments} disabled={refreshing} className="flex items-center gap-1 text-xs font-semibold uppercase text-forest-600 hover:underline disabled:opacity-60">
                <span className={refreshing ? 'inline-flex animate-spin' : 'inline-flex'}><Icon name="refresh" size={12} /></span> {refreshing ? 'Refreshing…' : 'Refresh'}
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
                          <button onClick={() => openPayments({ accountId: p.tenantId, name: p.tenantName })} className="block font-semibold text-forest-700 hover:underline">{p.tenantName}</button>
                          <span className="text-[11px] text-ink-700/50">{p.tenantCode} · Unit {p.unit}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-700/80">{p.paymentMode || '—'}<p className="text-xs">{p.paymentType || 'Legacy — allocation unknown'}{p.simulated ? ' · Simulated' : ''}</p><p className="text-xs">Rent: {p.rentAllocation == null ? 'Not recorded' : amountLabel(p.rentAllocation)} · Utilities: {p.utilityAllocation == null ? 'Not recorded' : amountLabel(p.utilityAllocation)}</p></td>
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
        </div>
      </div>

      <AuditExportModal open={auditOpen} onClose={() => setAuditOpen(false)} />

      <Modal open={!!billTarget} onClose={() => setBillTarget(null)} title="Tenant profile & billing" maxWidth="max-w-4xl"
        footer={<button onClick={() => setBillTarget(null)} className="rounded-md border px-4 py-2">Close</button>}>
        {billTarget && <AdminBillingPanel key={billTarget.accountId} tenant={billTarget} onChanged={() => { reload(); loadPayments(); }} />}
      </Modal>
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Payments: ${payTarget?.name || ''}`} maxWidth="max-w-4xl"
        footer={<button onClick={() => setPayTarget(null)} className="rounded-md border px-4 py-2">Close</button>}>
        {payDetailError && <p role="alert">{payDetailError}</p>}
        {!payDetail && !payDetailError && <p>Loading…</p>}
        {payDetail?.billing && <div className="pb-5"><BillingDetails billing={payDetail.billing} monthlyRent={payTarget?.rent} /></div>}
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
          {editTarget?.id} · Main Building, Unit {editTarget?.unit}. These are the same details the tenant
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
            <div className="grid grid-cols-1 gap-3">
              <Field
                label="Assigned Unit"
                error={errors.roomId}
                hint={`${vacantOptions.count} vacant ${vacantOptions.count === 1 ? 'unit' : 'units'}`}
              >
                <select
                  value={form.roomId}
                  onChange={(e) => {
                    const room = roomById(e.target.value);
                    setForm({ ...form, roomId: e.target.value, type: room?.type || form.type });
                  }}
                  disabled={vacantOptions.count === 0}
                  className={inputCls}
                >
                  <option value="">{vacantOptions.count === 0 ? 'No vacant units' : 'Select a unit…'}</option>
                  {vacantOptions.groups.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} · Vacant
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
                hint={form.roomId ? `Fixed rate for the selected ${form.type} unit.` : 'Select a vacant room to view its rate.'}
              >
                <input
                  value={form.roomId ? formatPhp(RENT_BY_TYPE[form.type]) : '—'}
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
