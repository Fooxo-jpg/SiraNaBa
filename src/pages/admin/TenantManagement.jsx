import React, { useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { tenantManagement } from '../../data/adminMockDb.js';

const ACTIVITY_TONES = {
  success: 'bg-status-successBg text-status-success',
  progress: 'bg-status-progressBg text-status-progress',
};

const EMPTY_FORM = { name: '', unit: '', type: 'Residential', rent: '', email: '', phone: '' };

const inputCls =
  'w-full rounded-md border border-black/10 bg-sand-50 px-3 py-2 text-sm outline-none focus:border-forest-400';

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
}

function nextMonthFirst() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
}

function exportCsv(rows) {
  const header = ['ID', 'Name', 'Unit', 'Type', 'Email', 'Phone', 'Occupancy', 'Rent', 'Payment', 'Due Date', 'Account'];
  const lines = rows.map((t) =>
    [t.id, t.name, t.unit, t.type, t.email, t.phone, t.occupancy, t.rent, t.payment, t.dueDate, t.account]
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

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-900">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-status-high">{error}</span>}
    </label>
  );
}

export default function TenantManagement() {
  const [tenants, setTenants] = useState(tenantManagement.tenants);
  const [activity, setActivity] = useState(tenantManagement.recentActivity);
  const [tasks, setTasks] = useState({ invoices: false, ledger: false });

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [paymentFilter, setPaymentFilter] = useState('All Payments');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const nextId = `T-${String(tenants.reduce((m, t) => Math.max(m, parseInt(t.id.slice(2), 10)), 0) + 1).padStart(4, '0')}`;

  const stats = useMemo(() => {
    const active = tenants.filter((t) => t.occupancy === 'Active').length;
    const overdue = tenants.filter((t) => t.payment === 'Overdue').length;
    return [
      { id: 'total', label: 'Total Tenants', value: String(tenants.length), delta: tenants.length ? 'Registry count' : '—', icon: 'users' },
      {
        id: 'occ',
        label: 'Occupancy',
        value: tenants.length ? `${Math.round((active / tenants.length) * 100)}%` : '0%',
        delta: tenants.length ? `${active} / ${tenants.length} active leases` : '—',
        tone: active ? 'success' : 'neutral',
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
        value: formatCurrency(tenants.reduce((s, t) => s + t.rent, 0)).replace('.00', ''),
        delta: tenants.length ? 'Current cycle' : '—',
        icon: 'dollar',
      },
    ];
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter(
      (t) =>
        (!q || [t.name, t.unit, t.id, t.email].some((v) => v.toLowerCase().includes(q))) &&
        (typeFilter === 'All Types' || t.type === typeFilter) &&
        (paymentFilter === 'All Payments' || t.payment === paymentFilter)
    );
  }, [tenants, query, typeFilter, paymentFilter]);

  const pushActivity = (entry) => setActivity((a) => [{ ...entry, time: 'Just now' }, ...a].slice(0, 5));

  const openModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Full legal name is required';
    if (!form.unit.trim()) next.unit = 'Enter a unit';
    else if (tenants.some((t) => t.unit.toLowerCase() === form.unit.trim().toLowerCase()))
      next.unit = 'This unit is already assigned';
    if (!form.rent || Number(form.rent) <= 0) next.rent = 'Enter a rent amount';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    setErrors(next);
    if (Object.keys(next).length) return;

    const tenant = {
      id: nextId,
      name: form.name.trim(),
      unit: form.unit.trim().toUpperCase(),
      type: form.type,
      email: form.email.trim(),
      phone: form.phone.trim() || '—',
      occupancy: 'Active',
      rent: Number(form.rent),
      payment: 'Pending',
      dueDate: nextMonthFirst(),
      account: 'Good Standing',
    };
    setTenants((t) => [...t, tenant]);
    pushActivity({
      icon: 'plus',
      tone: 'success',
      title: 'New Lease Registered',
      detail: `${tenant.name} (Unit ${tenant.unit}) successfully onboarded.`,
    });
    setModalOpen(false);
  };

  const markPaid = (t) => {
    setTenants((list) =>
      list.map((x) => (x.id === t.id ? { ...x, payment: 'Paid', account: 'Good Standing' } : x))
    );
    pushActivity({ icon: 'check', tone: 'success', title: 'Payment Received', detail: `${t.name} (Unit ${t.unit}) marked as paid.` });
    setMenuId(null);
  };

  const removeTenant = (t) => {
    setTenants((list) => list.filter((x) => x.id !== t.id));
    setMenuId(null);
  };

  return (
    <AdminLayout crumb="Tenant & Financial">
      <div className="space-y-6">
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
              onClick={openModal}
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
                <option>Residential</option>
                <option>Commercial</option>
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
                    <td className="py-3 pr-3 font-mono text-xs text-ink-700/70">{t.unit}</td>
                    <td className="py-3 pr-3 text-xs leading-relaxed text-ink-700/70">
                      <span className="flex items-center gap-1.5"><Icon name="mail" size={12} />{t.email}</span>
                      <span className="flex items-center gap-1.5"><Icon name="phone" size={12} />{t.phone}</span>
                    </td>
                    <td className="py-3 pr-3"><StatusBadge label={t.occupancy} /></td>
                    <td className="py-3 pr-3 font-semibold text-ink-900">{formatCurrency(t.rent)}</td>
                    <td className="py-3 pr-3"><StatusBadge label={t.payment} /></td>
                    <td className="whitespace-nowrap py-3 pr-3 text-xs text-ink-700/70">
                      <span className="flex items-center gap-1.5"><Icon name="calendar" size={12} />{formatDate(t.dueDate + 'T00:00:00', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
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
                          <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-lg border border-black/10 bg-white text-left shadow-lg">
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
                {tenants.length === 0 ? 'No tenants registered yet.' : 'No tenants match this filter.'}
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
                  <span className="flex-shrink-0 text-xs text-ink-700/40">{a.time}</span>
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Tenant"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-sand-100">
              Cancel
            </button>
            <button type="submit" form="register-tenant" className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600">
              Authorize Registration
            </button>
          </>
        }
      >
        <p className="-mt-2 mb-4 text-xs text-ink-700/60">
          Input mandatory lease information and contact records to authorize facility access.
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Assigned Unit" error={errors.unit}>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. 402-A" className={inputCls} />
              </Field>
              <Field label="Unit Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                  <option>Residential</option>
                  <option>Commercial</option>
                </select>
              </Field>
              <Field label="Monthly Rent (USD)" error={errors.rent}>
                <input type="number" min="0" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} placeholder="2450.00" className={inputCls} />
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
        </form>
      </Modal>
    </AdminLayout>
  );
}
