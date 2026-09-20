import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
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

const PAYMENT_PLANS = [
  {
    id: 'full',
    title: 'Pay in Full',
    description: 'One payment for the full balance due on the due date.',
  },
  {
    id: 'split2',
    title: 'Split into 2 Payments',
    description: 'Half of the balance now, the remainder two weeks before the due date.',
  },
  {
    id: 'split3',
    title: 'Split into 3 Payments',
    description: 'Balance divided evenly across three payments over the billing cycle.',
  },
];

const PAYMENT_LIMITS = [
  { icon: 'clock', label: 'Daily Transaction Limit', value: '$5,000.00' },
  { icon: 'calendar', label: 'Monthly Transaction Limit', value: '$20,000.00' },
  { icon: 'card', label: 'Per-Transaction Limit', value: '$10,000.00' },
];

const BILLING_FAQS = [
  {
    q: 'When is my rent due each month?',
    a: 'Rent is due on the 1st of every month. A grace period applies through the 5th, after which a late fee may be added to your balance.',
  },
  {
    q: 'What happens if a payment fails?',
    a: "We'll retry the charge and notify you by email and in-app notification. Your transaction history will show the attempt with a Failed status so you can update your payment method if needed.",
  },
  {
    q: 'How does auto-pay work?',
    a: 'When auto-pay is active, your primary payment method is charged automatically on the due date for the current balance. You can turn it off anytime from your payment method settings.',
  },
  {
    q: 'Can I change my payment method at any time?',
    a: "Yes. Open Manage Payment Methods to add a new card or bank account, set a different primary method, or remove one you no longer use.",
  },
  {
    q: 'How are utility charges calculated?',
    a: 'Utility charges are estimated from the previous month\u2019s usage and reconciled against actual meter readings, with any adjustment applied to the following invoice.',
  },
];

function AccordionItem({ question, answer, open, onToggle }) {
  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-ink-900"
      >
        {question}
        <Icon
          name="chevronRight"
          size={15}
          className={`flex-shrink-0 text-ink-700/50 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && <p className="pb-3 text-sm leading-relaxed text-ink-700/60">{answer}</p>}
    </div>
  );
}

export default function Billing() {
  const [billing, setBilling] = useState(null);
  const [status, setStatus] = useState('loading');
  const [tab, setTab] = useState('All Transactions');
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const [selectedPlan, setSelectedPlan] = useState('full');
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

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
    <Layout crumb="Payments">
      {status === 'loading' && <LoadingState label="Loading billing information…" />}
      {status === 'error' && <ErrorState message="We couldn't load your billing details." onRetry={load} />}

      {status === 'ready' && billing && (
        <>
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
              <button
                onClick={() => setModal('tax')}
                className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
              >
                Tax Statements
              </button>
              <button
                onClick={() => setModal('addMethod')}
                className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
              >
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
                <span className={`flex items-center gap-1 ${billing.autoPayActive ? 'text-forest-600' : 'text-ink-700/50'}`}>
                  <Icon name="check" size={13} /> Auto-pay {billing.autoPayActive ? 'Active' : 'Off'}
                </span>
              </p>
              <div className="mt-4 flex gap-3">
                <button className="flex-1 rounded-md bg-forest-500 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-600">
                  Pay Total Now
                </button>
                <button
                  onClick={() => setModal('editPlan')}
                  className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm font-medium hover:bg-sand-100"
                >
                  Edit Payment Plan
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                Breakdown
              </p>
              {billing.breakdown.length === 0 && (
                <p className="text-sm text-ink-700/50">No charges on your account right now.</p>
              )}
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
              {billing.paymentMethod ? (
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
              ) : (
                <div className="rounded-lg border border-dashed border-black/10 bg-sand-50 p-4 text-center text-sm text-ink-700/50">
                  No payment method on file.
                </div>
              )}
              <div className="mt-3 divide-y divide-black/5 text-sm">
                <button
                  onClick={() => setModal('manageMethods')}
                  className="flex w-full items-center justify-between py-2.5 text-ink-900 hover:text-forest-600"
                >
                  Manage Payment Methods <Icon name="chevronRight" size={15} />
                </button>
                <button
                  onClick={() => setModal('limits')}
                  className="flex w-full items-center justify-between py-2.5 text-ink-900 hover:text-forest-600"
                >
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
            {billing.utilityBreakdowns.length === 0 && (
              <p className="text-sm text-ink-700/50">No utility usage recorded yet.</p>
            )}
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
                  <button
                    onClick={() => setModal('faq')}
                    className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium hover:bg-white/10"
                  >
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

        {/* Tax Statements */}
        <Modal open={modal === 'tax'} onClose={closeModal} title="Tax Statements">
          <p className="mb-4 text-sm text-ink-700/60">
            Download official statements of your rent and utility payments for tax purposes.
          </p>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-black/10 bg-sand-50 px-4 py-8 text-center">
            <Icon name="fileText" size={22} className="text-ink-700/40" />
            <p className="text-sm font-semibold text-ink-900">No tax statements available yet</p>
            <p className="text-xs text-ink-700/50">
              Statements are generated once your account has a full billing year on file. Check
              back after your next annual cycle.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-black/5 p-3 text-sm text-ink-700/60">
            <span className="flex items-center gap-2">
              <Icon name="info" size={15} /> Need an earlier statement?
            </span>
            <button className="font-medium text-forest-600 hover:underline">Request one</button>
          </div>
        </Modal>

        {/* Add Payment Method */}
        <Modal
          open={modal === 'addMethod'}
          onClose={closeModal}
          title="Add Payment Method"
          footer={
            <>
              <button
                onClick={closeModal}
                className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
              >
                Cancel
              </button>
              <button
                onClick={closeModal}
                className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
              >
                Save Payment Method
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-700/60">Card Number</span>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-700/60">Name on Card</span>
              <input
                type="text"
                placeholder="Juan Dela Cruz"
                className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-700/60">Expiry Date</span>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-700/60">CVV</span>
                <input
                  type="text"
                  placeholder="•••"
                  className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700/70">
              <input
                type="checkbox"
                checked={setAsPrimary}
                onChange={(e) => setSetAsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-black/20 text-forest-600 focus:ring-forest-400"
              />
              Set as primary payment method
            </label>
            <p className="flex items-center gap-1.5 text-xs text-ink-700/40">
              <Icon name="lock" size={13} /> Your payment details are encrypted and processed securely.
            </p>
          </div>
        </Modal>

        {/* Edit Payment Plan */}
        <Modal
          open={modal === 'editPlan'}
          onClose={closeModal}
          title="Edit Payment Plan"
          footer={
            <>
              <button
                onClick={closeModal}
                className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
              >
                Cancel
              </button>
              <button
                onClick={closeModal}
                className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
              >
                Save Changes
              </button>
            </>
          }
        >
          <p className="mb-4 text-sm text-ink-700/60">
            Choose how you'd like to pay your{' '}
            <span className="font-semibold text-ink-900">{formatCurrency(billing.currentBalanceDue)}</span> balance
            due {formatDate(billing.dueDate)}.
          </p>
          <div className="space-y-2.5">
            {PAYMENT_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selectedPlan === plan.id
                    ? 'border-forest-500 bg-forest-50'
                    : 'border-black/10 hover:bg-sand-100'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    selectedPlan === plan.id ? 'border-forest-500' : 'border-black/20'
                  }`}
                >
                  {selectedPlan === plan.id && <span className="h-2 w-2 rounded-full bg-forest-500" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{plan.title}</span>
                  <span className="block text-xs text-ink-700/50">{plan.description}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>

        {/* Manage Payment Methods */}
        <Modal
          open={modal === 'manageMethods'}
          onClose={closeModal}
          title="Manage Payment Methods"
          footer={
            <button
              onClick={closeModal}
              className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
            >
              Done
            </button>
          }
        >
          <div className="space-y-3">
            {!billing.paymentMethod && (
              <p className="rounded-lg border border-dashed border-black/10 bg-sand-50 p-4 text-center text-sm text-ink-700/50">
                No payment methods saved yet.
              </p>
            )}
            {billing.paymentMethod && (
            <div className="flex items-center gap-3 rounded-lg border border-black/5 p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-sand-100 text-ink-700/60">
                <Icon name="card" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {billing.paymentMethod.brand} ending in {billing.paymentMethod.last4}
                </p>
                <p className="text-xs text-ink-700/50">Expires {billing.paymentMethod.expiry}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {billing.paymentMethod.isPrimary ? (
                  <StatusBadge label="Primary" tone="success" />
                ) : (
                  <button
                    aria-label="Set as primary"
                    className="rounded-full p-1.5 text-ink-700/50 hover:bg-sand-100 hover:text-forest-600"
                  >
                    <Icon name="star" size={15} />
                  </button>
                )}
                <button
                  aria-label="Edit payment method"
                  className="rounded-full p-1.5 text-ink-700/50 hover:bg-sand-100 hover:text-forest-600"
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  aria-label="Remove payment method"
                  className="rounded-full p-1.5 text-ink-700/50 hover:bg-sand-100 hover:text-status-high"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
            )}
          </div>
          <button
            onClick={() => setModal('addMethod')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/15 py-2.5 text-sm font-medium text-forest-600 hover:bg-forest-50"
          >
            <Icon name="plus" size={14} /> Add New Payment Method
          </button>
        </Modal>

        {/* View Payment Limits */}
        <Modal open={modal === 'limits'} onClose={closeModal} title="View Payment Limits">
          <p className="mb-4 text-sm text-ink-700/60">
            These limits apply to payments made through your account for security purposes.
          </p>
          <div className="space-y-2.5">
            {PAYMENT_LIMITS.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-black/5 p-3"
              >
                <span className="flex items-center gap-2.5 text-sm text-ink-700/70">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sand-100 text-ink-700/60">
                    <Icon name={row.icon} size={15} />
                  </span>
                  {row.label}
                </span>
                <span className="text-sm font-semibold text-ink-900">{row.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-700/40">
            <Icon name="info" size={13} /> Need a higher limit? Contact billing support to request an increase.
          </p>
        </Modal>

        {/* Billing FAQ */}
        <Modal open={modal === 'faq'} onClose={closeModal} title="Billing FAQ">
          <div>
            {BILLING_FAQS.map((item, i) => (
              <AccordionItem
                key={item.q}
                question={item.q}
                answer={item.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-sand-100 p-3 text-xs text-ink-700/60">
            <Icon name="help" size={15} className="flex-shrink-0 text-ink-700/50" />
            Still have questions? Reach out through Contact Billing Support and our team will get
            back to you within 2 hours.
          </div>
        </Modal>
        </>
      )}
    </Layout>
  );
}
