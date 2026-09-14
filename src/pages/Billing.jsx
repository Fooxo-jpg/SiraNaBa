import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import DataTable from '../components/DataTable.jsx';
import { ProgressBar, LoadingState, ErrorState } from '../components/Common.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatCurrency, formatDate } from '../utils/format.js';

const UTILITY_ICON = { electricity: 'bolt', water: 'droplet', internet: 'wifi', facility: 'shield' };
const UTILITY_TONE = {
  electricity: 'text-amber-500 bg-amber-50',
  water: 'text-sky-500 bg-sky-50',
  internet: 'text-violet-500 bg-violet-50',
  facility: 'text-forest-600 bg-forest-50',
};

const TABS = ['All Transactions', 'Rent Only', 'Utilities', 'Failed'];

export default function Billing() {
  const [billing, setBilling] = useState(null);
  const [status, setStatus] = useState('loading');
  const [tab, setTab] = useState('All Transactions');

  const load = () => {
    setStatus('loading');
    endpoints
      .getBilling()
      .then((data) => {
        setBilling(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(load, []);

  const filteredTransactions = billing
    ? billing.transactions.filter((t) => {
        if (tab === 'All Transactions') return true;
        if (tab === 'Rent Only') return t.title.toLowerCase().includes('rent');
        if (tab === 'Utilities') return t.title.toLowerCase().includes('utilit');
        if (tab === 'Failed') return t.status === 'Failed';
        return true;
      })
    : [];

  return (
    <Layout crumb="Home">
      {status === 'loading' && <LoadingState label="Loading billing information…" />}
      {status === 'error' && <ErrorState message="We couldn't load your billing details." onRetry={load} />}

      {status === 'ready' && billing && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">Billing &amp; Payments</h1>
              <p className="text-sm text-ink-700/60">
                Manage your rental payments, view utility breakdowns, and track your transaction
                history.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">
                Tax Statements
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600">
                <Icon name="plus" size={15} /> Add Payment Method
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <StatusBadge label="Upcoming Payment" tone="progress" />
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-700/50">
                Current Balance Due
              </p>
              <p className="text-3xl font-bold text-ink-900">
                {formatCurrency(billing.currentBalanceDue)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700/50">
                <span className="flex items-center gap-1">
                  <Icon name="calendar" size={13} /> Due {formatDate(billing.dueDate)}
                </span>
                <span className="flex items-center gap-1 text-forest-600">
                  <Icon name="check" size={13} /> Auto-pay {billing.autoPayActive ? 'Active' : 'Off'}
                </span>
              </p>
              <div className="mt-4 flex gap-3">
                <button className="flex-1 rounded-md bg-forest-500 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-600">
                  Pay Total Now
                </button>
                <button className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm font-medium hover:bg-sand-100">
                  Edit Payment Plan
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                Breakdown
              </p>
              <ul className="space-y-2.5 text-sm">
                {billing.breakdown.map((line) => (
                  <li key={line.label} className="flex items-center justify-between">
                    <span className="text-ink-700/70">{line.label}</span>
                    <span className="font-semibold text-ink-900">{formatCurrency(line.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-ink-700/40">
                * Utilities are estimated based on previous month usage. Final adjustment applied to
                invoice.
              </p>
            </Card>

            <Card className="p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                Active Method
              </p>
              <p className="mb-3 text-xs text-ink-700/50">Primary account for automated billing</p>
              <div className="flex items-center gap-3 rounded-lg border border-black/5 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sand-100 text-ink-700/60">
                  <Icon name="card" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {billing.paymentMethod.brand} ending in {billing.paymentMethod.last4}
                  </p>
                  <p className="text-xs text-ink-700/50">Expires {billing.paymentMethod.expiry}</p>
                </div>
                {billing.paymentMethod.isPrimary && <StatusBadge label="Primary" tone="success" />}
              </div>
              <div className="mt-3 divide-y divide-black/5 text-sm">
                <button className="flex w-full items-center justify-between py-2.5 text-ink-900 hover:text-forest-600">
                  Management Methods <Icon name="chevronRight" size={15} />
                </button>
                <button className="flex w-full items-center justify-between py-2.5 text-ink-900 hover:text-forest-600">
                  View Payment Limits <Icon name="chevronRight" size={15} />
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-700/40">
                <Icon name="shield" size={13} /> Secure payments powered by SagePay
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Utility Breakdowns</h2>
                <p className="text-xs text-ink-700/50">Usage tracking for the current billing cycle</p>
              </div>
              <button className="text-sm font-medium text-forest-600 hover:underline">
                Detailed Consumption Report
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {billing.utilityBreakdowns.map((u) => (
                <div key={u.id} className="rounded-lg border border-black/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${UTILITY_TONE[u.id]}`}
                    >
                      <Icon name={UTILITY_ICON[u.id]} size={15} />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        u.trend === 'up' ? 'text-status-high' : u.trend === 'down' ? 'text-forest-600' : 'text-ink-700/50'
                      }`}
                    >
                      {u.trend === 'up' ? '↗' : u.trend === 'down' ? '↘' : '→'} {u.deltaLabel}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-ink-700/50">{u.label}</p>
                  <p className="mb-2 text-xl font-bold text-ink-900">
                    {u.value !== null ? `${u.value.toLocaleString()} ${u.unit}` : u.unit}
                  </p>
                  <ProgressBar value={u.usageVsLimit * 100} max={100} />
                  <p className="mt-1 text-[11px] text-ink-700/40">
                    Usage vs limit {Math.round(u.usageVsLimit * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Transaction History</h2>
                <p className="text-xs text-ink-700/50">
                  Historical records of your rental and utility payments
                </p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      tab === t ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-700/60 hover:text-ink-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <DataTable
              columns={[
                { key: 'id', header: 'Ref ID' },
                {
                  key: 'title',
                  header: 'Transaction Details',
                  render: (row) => (
                    <div>
                      <p className="font-medium text-ink-900">{row.title}</p>
                      <p className="text-xs text-ink-700/50">{formatDate(row.date)}</p>
                    </div>
                  ),
                },
                { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount) },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge label={row.status} /> },
              ]}
              rows={filteredTransactions}
              emptyLabel="No transactions in this view."
            />

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-ink-700/50">
                Showing last {filteredTransactions.length} of {billing.totalTransactionCount} transactions
              </span>
              <div className="flex gap-2">
                <button className="rounded-md border border-black/10 px-3 py-1.5 font-medium hover:bg-sand-100">
                  Previous
                </button>
                <button className="rounded-md border border-black/10 px-3 py-1.5 font-medium hover:bg-sand-100">
                  Next
                </button>
              </div>
            </div>
          </Card>

          <Card className="bg-forest-700 p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-md">
                <h3 className="text-lg font-bold">Facing Billing Discrepancies?</h3>
                <p className="mt-1.5 text-sm text-white/70">
                  Our billing team is here to help. If you notice any unusual activity or have
                  questions about your utility meter readings, please start a support ticket
                  specifically for billing assistance.
                </p>
                <div className="mt-4 flex gap-3">
                  <button className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-forest-700 hover:bg-white/90">
                    Contact Billing Support
                  </button>
                  <button className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium hover:bg-white/10">
                    Billing FAQ
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">Response Time</p>
                <p className="text-xl font-bold">Under 2 Hours</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
}
