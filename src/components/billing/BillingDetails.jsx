import React from 'react';
import { formatPhp } from '../../utils/format.js';

export const amountLabel = value => value == null ? 'Review required' : formatPhp(Number(value));
export const statusLabel = value => (value || 'Unknown').replaceAll('_', ' ');
const dateLabel = tx => tx.paidAt ? new Date(tx.paidAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : tx.date || '—';

export function BalanceSummary({ billing }) {
  return <div className="grid gap-3 sm:grid-cols-3">
    {[['Outstanding Rent', billing.rentBalance], ['Outstanding Utilities', billing.utilityBalance], ['Total Outstanding', billing.totalOutstanding]].map(([label, value]) =>
      <div key={label} className="rounded-lg border border-black/10 bg-sand-50 p-4">
        <p className="text-xs text-ink-700/60">{label}</p><p className="mt-1 text-xl font-bold">{amountLabel(value)}</p>
      </div>)}
  </div>;
}
export function PaymentHistory({ transactions = [] }) {
  return <section className="space-y-3"><h2 className="font-semibold">Payment History</h2>
    {!transactions.length ? <p className="text-sm text-ink-700/60">No payments recorded.</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs">
        <thead><tr>{['Date (PHT)', 'Reference / Method', 'Payment Type', 'Amount', 'Rent Allocation', 'Utility Allocation', 'Status'].map(h => <th key={h} className="px-2 py-3">{h}</th>)}</tr></thead>
        <tbody>{transactions.map(tx => <tr key={tx.id || tx.referenceCode} className="border-t border-black/5">
          <td className="px-2 py-3">{dateLabel(tx)}</td>
          <td className="px-2 py-3"><span className="break-all font-mono">{tx.id || tx.referenceCode}</span><br />{tx.paymentMode || 'Not recorded'}{tx.simulated && <p className="font-semibold text-amber-700">Simulated · no funds transferred</p>}</td>
          <td className="px-2 py-3">{tx.paymentType || 'Legacy — allocation unknown'}<br />{tx.billingPeriod}</td>
          <td className="px-2 py-3">{amountLabel(tx.amount)}</td>
          <td className="px-2 py-3">{tx.rentAllocation == null ? 'Not recorded' : amountLabel(tx.rentAllocation)}</td>
          <td className="px-2 py-3">{tx.utilityAllocation == null ? 'Not recorded' : amountLabel(tx.utilityAllocation)}</td>
          <td className="px-2 py-3">{statusLabel(tx.status)}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
export default function BillingDetails({ billing, monthlyRent, history = true }) {
  const statements = [...(billing.utilityStatements || [])].sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod));
  return <div className="space-y-5">
    {billing.archived && <p className="rounded-md bg-sand-100 p-3 text-sm">Archived tenant account — financial history retained for audit.</p>}
    {billing.reconciliationRequired && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-900">Legacy billing needs administrator review. Rent and utility balances are not yet verified; new charges and payments are paused.</p>}
    <BalanceSummary billing={billing} />
    <section className="rounded-lg border border-black/10 p-4"><h2 className="font-semibold">Rent</h2>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        {monthlyRent != null && <p>Monthly Rent: <strong>{amountLabel(monthlyRent)}</strong></p>}
        <p>Rent Balance: <strong>{amountLabel(billing.rentBalance)}</strong></p>
        <p>Rent Paid (issued obligations): <strong>{billing.reconciliationRequired ? 'Review required' : amountLabel(billing.rentPaid)}</strong></p>
        <p>Status: <strong>{statusLabel(billing.rentStatus)}</strong></p><p>Next Outstanding Rent Due: <strong>{billing.rentDueDate || 'None'}</strong></p>
      </div>
      {!!billing.rentObligations?.length && <details className="mt-3"><summary className="cursor-pointer text-sm">Rent periods</summary>
        {billing.rentObligations.map(r => <p key={r.id} className="mt-2 text-xs">{r.billingPeriod} · Due {r.dueDate} · Charge {amountLabel(r.amount)} · Paid {amountLabel(r.paid)} · Remaining {amountLabel(r.balance)} · {statusLabel(r.status)}</p>)}
      </details>}
    </section>
    <section className="space-y-3"><h2 className="font-semibold">Utility Statements</h2>
      {!statements.length && <p className="text-sm text-ink-700/60">No verified utility statements.</p>}
      {statements.map((s, index) => <details key={s.id} open={index === 0} className="rounded-lg border border-black/10 p-4">
        <summary className="cursor-pointer font-medium">{s.billingPeriod} · {amountLabel(s.amount)} · {statusLabel(s.status)}{index === 0 ? ' · Latest statement' : ''}</summary>
        <p className="mt-2 text-xs text-ink-700/60">Statement {s.statementDate} · Due {s.dueDate} · Revision {s.revision}</p>
        {s.openingBalance && <p className="mt-2 text-xs text-amber-800">Reconciled opening statement; historical usage readings are unavailable.</p>}
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt>Water {!s.openingBalance && <>({s.waterUsage} m³ × PHP {s.waterRate})</>}</dt><dd className="font-semibold">{amountLabel(s.waterCharge)}</dd></div>
          <div><dt>Electricity {!s.openingBalance && <>({s.electricityUsage} kWh × PHP {s.electricityRate})</>}</dt><dd className="font-semibold">{amountLabel(s.electricityCharge)}</dd></div>
          <div><dt>Parking</dt><dd>{amountLabel(s.parkingCharge)}</dd></div><div><dt>Utility Total</dt><dd className="font-semibold">{amountLabel(s.amount)}</dd></div>
          <div><dt>Paid</dt><dd>{amountLabel(s.paid)}</dd></div><div><dt>Outstanding Utilities (this statement)</dt><dd className="font-semibold">{amountLabel(s.balance)}</dd></div>
        </dl>
        {!!s.revisions?.length && <details className="mt-3 text-xs"><summary className="cursor-pointer">Previous revisions</summary>
          {s.revisions.map(r => <p key={r.revision} className="mt-2">Revision {r.revision} · Water {amountLabel(r.waterCharge)} · Electricity {amountLabel(r.electricityCharge)} · Parking {amountLabel(r.parkingCharge)} · Total {amountLabel(r.amount)} · Due {r.dueDate}</p>)}
        </details>}
      </details>)}
    </section>
    <section className="rounded-lg bg-sand-50 p-4"><h2 className="font-semibold">Payments</h2><p className="mt-1 text-sm">Total recorded paid: <strong>{amountLabel(billing.totalPaid)}</strong></p>
      <p className="mt-1 text-xs text-ink-700/60">Includes successful historical and simulated transactions. Opening reconciled paid amounts are shown on obligations, not fabricated as new transactions.</p>
    </section>
    {history && <PaymentHistory transactions={billing.transactions} />}
  </div>;
}
