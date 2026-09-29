import React, { useCallback, useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import BillingDetails, { amountLabel } from './BillingDetails.jsx';
import { PayModal, ReceiptModal } from './PaymentParts.jsx';

const fieldClass = 'w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm';
const buttonClass = 'rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const emptyUtility = () => ({ billingPeriod: today().slice(0, 7), dueDate: today(), waterUsage: '', waterRate: '60', electricityUsage: '', parkingFee: false, reissue: false });
function Input({ label, value, onChange, type = 'number', step = '0.01', ...props }) {
  return <label className="block text-xs text-ink-700/70">{label}<input required className={fieldClass + ' mt-1'} type={type} min={type === 'number' ? '0' : undefined} step={step} value={value} onChange={e => onChange(e.target.value)} {...props} /></label>;
}

function Reconciliation({ detail, tenantId, run, busy }) {
  const [rents, setRents] = useState([]), [utilities, setUtilities] = useState([]);
  const [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false);
  const b = detail.billing;
  const update = (setter, index, key, value) => setter(rows => rows.map((r, i) => i === index ? { ...r, [key]: value } : r));
  const renderRows = (rows, setter, fields) => rows.map((row, index) => <div key={index} className="rounded-md border p-3">
    <div className="grid gap-2 sm:grid-cols-2">{fields.map(([key, label, type]) => <Input key={key} label={label} type={type || 'number'} value={row[key]} onChange={v => update(setter, index, key, v)} />)}</div>
    <button type="button" className="mt-2 text-xs text-red-700" onClick={() => setter(rows.filter((_, i) => i !== index))}>Remove opening period</button>
  </div>);
  return <form className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-4" onSubmit={e => {
    e.preventDefault();
    run(() => endpoints.reconcileTenantBilling(tenantId, { expectedVersion: b.version, rents, utilities, reason }), 'Opening balances verified. Historical records retained.');
  }}>
    <h3 className="font-semibold">Review legacy billing</h3>
    <p className="text-sm">The old balance may mix rent and utilities. Verify against your source records before entering each period below. Empty lists mean no outstanding or paid opening obligations. Do not guess.</p>
    <p className="text-sm">Legacy amount (unclassified): <strong>{b.legacyOutstandingAmount == null ? 'Not recorded' : amountLabel(b.legacyOutstandingAmount)}</strong></p>
    {!!detail.breakdown?.length && <details className="text-xs"><summary className="cursor-pointer">Preserved old utility breakdown ({detail.utilityStatementPeriod || 'period not recorded'})</summary>
      {detail.breakdown.map((line, i) => <p key={i}>{line.label}: {amountLabel(line.amount)}</p>)}</details>}
    <fieldset disabled={busy} className="space-y-3">
      <h4 className="font-medium">Verified rent periods</h4>
      {renderRows(rents, setRents, [['billingPeriod', 'Period', 'month'], ['dueDate', 'Due date', 'date'], ['amount', 'Original rent charge'], ['paid', 'Previously paid rent']])}
      <button type="button" className="text-sm font-semibold text-forest-700" onClick={() => setRents([...rents, { billingPeriod: today().slice(0, 7), dueDate: today(), amount: '', paid: '' }])}>+ Add rent period</button>
      <h4 className="font-medium">Verified utility periods</h4>
      {renderRows(utilities, setUtilities, [['billingPeriod', 'Period', 'month'], ['dueDate', 'Due date', 'date'], ['waterCharge', 'Water charge'], ['electricityCharge', 'Electricity charge'], ['parkingCharge', 'Parking charge'], ['paid', 'Previously paid utilities']])}
      <button type="button" className="text-sm font-semibold text-forest-700" onClick={() => setUtilities([...utilities, { billingPeriod: today().slice(0, 7), dueDate: today(), waterCharge: '', electricityCharge: '', parkingCharge: '', paid: '' }])}>+ Add utility period</button>
      <label className="block text-xs">Audit note / source of verified figures<textarea required minLength={10} maxLength={2000} className={fieldClass + ' mt-1'} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <label className="flex gap-2 text-sm"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I have verified every opening period and confirm any empty list means no opening obligations.</label>
      <button className={buttonClass} disabled={!confirmed || busy}>Confirm Opening Balances</button>
    </fieldset>
  </form>;
}

export default function AdminBillingPanel({ tenant, onChanged }) {
  const [detail, setDetail] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [payOpen, setPayOpen] = useState(false), [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState(emptyUtility), [rent, setRent] = useState({ billingPeriod: today().slice(0, 7), dueDate: today() });
  const load = useCallback(async () => {
    try { setDetail(await endpoints.getAdminTenantPayments(tenant.accountId)); }
    catch (err) { setError('Could not refresh billing: ' + err.message); }
  }, [tenant.accountId]);
  useEffect(() => { load(); }, [load]);
  const run = async (action, message) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await action(); setNotice(message); await load(); onChanged?.();
    } catch (err) { setError(err.message || 'Could not save billing.'); }
    finally { setBusy(false); }
  };
  if (!detail) return <div className="pb-5">{error ? <p role="alert">{error} <button onClick={load}>Retry</button></p> : 'Loading billing…'}</div>;
  const b = detail.billing;
  const existing = b.utilityStatements.find(s => s.billingPeriod === form.billingPeriod);
  const changePeriod = billingPeriod => {
    const s = b.utilityStatements.find(item => item.billingPeriod === billingPeriod);
    setForm(s ? { billingPeriod, dueDate: s.dueDate, waterUsage: String(s.waterUsage), waterRate: String(s.waterRate),
      electricityUsage: String(s.electricityUsage), parkingFee: Number(s.parkingCharge) > 0, reissue: false }
      : { ...emptyUtility(), billingPeriod });
  };
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const estimate = Math.round(Number(form.waterUsage) * Number(form.waterRate) * 100) / 100
    + Math.round(Number(form.electricityUsage) * Number(detail.electricityRate) * 100) / 100 + (form.parkingFee ? 1000 : 0);
  return <div className="space-y-5 pb-5">
    <section className="rounded-lg bg-sand-50 p-4"><p className="font-semibold">{tenant.name}</p>
      <p className="text-xs">{tenant.id} · Main Building, Unit {tenant.unit} · {tenant.type}</p>
      <p className="mt-2 text-xs">{tenant.email || 'No email'} · {tenant.phone || 'No phone'}</p><p className="text-xs">Lease start: {tenant.leaseStart || 'Not recorded'}</p>
    </section>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-md bg-forest-50 p-3 text-forest-700">{notice}</p>}
    {b.reconciliationRequired && <Reconciliation detail={detail} tenantId={tenant.accountId} run={run} busy={busy} />}
    <BillingDetails billing={b} monthlyRent={tenant.rent} />
    {!b.reconciliationRequired && <>
      <button className={buttonClass} disabled={busy || Number(b.totalOutstanding) <= 0} onClick={() => setPayOpen(true)}>Record Received Payment</button>
      <details className="rounded-lg border border-black/10 p-4"><summary className="cursor-pointer font-semibold">Issue Rent for a Billing Period</summary>
        <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); run(() => endpoints.issueTenantRent(tenant.accountId, rent), 'Rent obligation issued; utility balances are unchanged.'); }}>
          <div className="grid gap-3 sm:grid-cols-2"><Input label="Rent billing period" type="month" value={rent.billingPeriod} onChange={v => setRent(r => ({ ...r, billingPeriod: v }))} />
            <Input label="Rent due date" type="date" value={rent.dueDate} onChange={v => setRent(r => ({ ...r, dueDate: v }))} /></div>
          <p className="text-xs">Monthly rent: {amountLabel(tenant.rent)}. The server uses the tenant's stored monthly rent. Duplicate periods are rejected.</p>
          <button disabled={busy} className={buttonClass}>Issue Rent</button>
        </form>
      </details>
      <form className="space-y-3 rounded-lg border border-black/10 p-4" onSubmit={e => {
        e.preventDefault(); run(() => endpoints.presentTenantBill(tenant.accountId, { ...form, expectedRevision: existing?.revision ?? null }), 'Utility statement saved. Rent is unchanged.');
      }}>
        <h3 className="font-semibold">Present Utility Bill</h3>
        <fieldset disabled={busy} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Utility billing period" type="month" value={form.billingPeriod} onChange={changePeriod} />
            <Input label="Utility due date" type="date" value={form.dueDate} onChange={v => set('dueDate', v)} />
            <Input label="Water usage (m³)" step="0.000001" value={form.waterUsage} onChange={v => set('waterUsage', v)} />
            <Input label="Water rate (PHP / m³)" step="0.000001" value={form.waterRate} onChange={v => set('waterRate', v)} />
            <Input label="Electricity usage (kWh)" step="0.000001" value={form.electricityUsage} onChange={v => set('electricityUsage', v)} />
            <div className="text-xs">Configured electricity rate<p className="mt-2 font-semibold">PHP {detail.electricityRate} / kWh</p><p>Server-controlled reference rate, not a live provider rate.</p></div>
          </div>
          <label className="flex gap-2"><input type="checkbox" checked={form.parkingFee} onChange={e => set('parkingFee', e.target.checked)} />Parking — PHP 1,000 / month</label>
          <p>Estimated utility total: <strong>{amountLabel(estimate)}</strong></p>
          {existing && <label className="flex gap-2 rounded-md bg-amber-50 p-3 text-xs"><input type="checkbox" checked={form.reissue} onChange={e => set('reissue', e.target.checked)} />
            This period already exists (revision {existing.revision}). Check to intentionally reissue changed charges; previous revisions and payments are preserved.</label>}
          <button disabled={busy} className={buttonClass}>{busy ? 'Saving…' : 'Present Bill'}</button>
        </fieldset>
      </form>
    </>}
    <PayModal open={payOpen} onClose={() => setPayOpen(false)} billing={b} recorded submitPayment={payload => endpoints.markTenantPaid(tenant.accountId, payload)}
      onPaid={r => { setPayOpen(false); setReceipt(r); load(); onChanged?.(); }} />
    <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
  </div>;
}
