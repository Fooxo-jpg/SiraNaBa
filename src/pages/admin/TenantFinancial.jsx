import React, { useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatCurrency } from '../../utils/format.js';
import { tenantFinancial } from '../../data/adminMockDb.js';

const TABS = ['Tenant Ledgers', 'Utility Billing', 'Transaction Log'];

export default function TenantFinancial() {
  const { stats, ledgers, recentActivity, upcomingCycle } = tenantFinancial;
  const [tab, setTab] = useState('Tenant Ledgers');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const filtered = useMemo(
    () =>
      ledgers.filter((l) => {
        const matchesQuery =
          !query ||
          l.tenant.toLowerCase().includes(query.toLowerCase()) ||
          l.unit.toLowerCase().includes(query.toLowerCase());
        const matchesStatus = statusFilter === 'All Statuses' || l.status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [ledgers, query, statusFilter]
  );

  return (
    <AdminLayout crumb="Tenant & Financial">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Financial Management</h1>
            <p className="text-sm text-ink-700/60">
              Oversee tenant ledgers, utility billing cycles, and operational transactions.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-1.5 rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">
              <Icon name="download" size={15} /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600">
              <Icon name="plus" size={15} /> New Transaction
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.id} {...s} />
          ))}
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-1 border-b border-black/5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 px-3 pb-2.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'border-forest-500 text-forest-600'
                    : 'border-transparent text-ink-700/50 hover:text-ink-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Tenant Ledgers' ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label className="relative flex-1 sm:max-w-xs">
                  <span className="sr-only">Search tenants</span>
                  <Icon
                    name="search"
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tenants..."
                    className="w-full rounded-lg border border-black/10 py-2 pl-8 pr-3 text-sm outline-none focus:border-forest-400"
                  />
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400"
                >
                  <option>All Statuses</option>
                  <option>Active</option>
                  <option>Delinquent</option>
                  <option>Eviction</option>
                </select>
                <button className="flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-2 text-sm font-medium hover:bg-sand-100">
                  <Icon name="filter" size={14} /> Filters
                </button>
              </div>

              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                      <th className="pb-2 pr-3">Tenant Details</th>
                      <th className="pb-2 pr-3">Unit</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Lease End</th>
                      <th className="pb-2 text-right">Ledger Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filtered.map((l) => (
                      <tr key={l.unit}>
                        <td className="py-3 pr-3">
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sand-100 text-[9px] font-semibold text-ink-700/60">
                              {l.tenant
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </span>
                            <span className="font-semibold text-ink-900">{l.tenant}</span>
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs text-ink-700/60">{l.unit}</td>
                        <td className="py-3 pr-3">
                          <StatusBadge label={l.status} />
                        </td>
                        <td className="py-3 pr-3 text-ink-700/60">{l.leaseEnd}</td>
                        <td
                          className={`py-3 text-right font-semibold ${
                            l.balance > 0 ? 'text-status-high' : l.balance < 0 ? 'text-status-success' : 'text-ink-700/50'
                          }`}
                        >
                          {l.balance === 0 ? 'Clear' : formatCurrency(l.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-ink-700/50">No tenants match this filter.</p>
                )}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-ink-700/50">
              {tab} isn't populated in this demo yet.
            </p>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-ink-900">Recent System Activity</h2>
                <p className="text-xs text-ink-700/50">Automated financial assessments and system updates</p>
              </div>
              <button className="text-xs font-semibold text-forest-600 hover:underline">View Full Logs</button>
            </div>
            <ul className="divide-y divide-black/5">
              {recentActivity.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                        a.tone === 'success'
                          ? 'bg-status-successBg text-status-success'
                          : a.tone === 'progress'
                          ? 'bg-status-progressBg text-status-progress'
                          : 'bg-sand-100 text-ink-700/50'
                      }`}
                    >
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Upcoming Cycle</h2>
            </div>
            <p className="mb-2 text-xs text-ink-700/50">Key dates for financial reconciliation</p>
            <div className="mb-4 rounded-lg border border-black/5 p-3">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-ink-700/70">Next Rent Due</span>
                <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                  {upcomingCycle.nextRentDue}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
                <div
                  className="h-full rounded-full bg-forest-500"
                  style={{
                    width: `${100 - (upcomingCycle.daysRemaining / upcomingCycle.totalCycleDays) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-700/50">{upcomingCycle.daysRemaining} days remaining in current cycle</p>
            </div>
            <div className="space-y-2.5">
              {upcomingCycle.events.map((ev) => (
                <div key={ev.label} className="flex items-center gap-2.5 text-sm">
                  <Icon name={ev.icon} size={15} className="text-ink-700/40" />
                  <div>
                    <p className="font-medium text-ink-900">{ev.label}</p>
                    <p className="text-xs text-ink-700/50">{ev.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-md border border-black/10 py-2 text-sm font-medium hover:bg-sand-100">
              Configure Reminders
            </button>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
