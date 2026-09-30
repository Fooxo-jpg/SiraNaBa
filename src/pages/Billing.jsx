import React, { useCallback, useEffect, useState } from 'react';
import Layout, { NOTIFICATIONS_CHANGED } from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import { LoadingState, ErrorState } from '../components/Common.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { useAutoRefresh } from '../utils/useAutoRefresh.js';
import { endpoints } from '../api/endpoints.js';
import BillingDetails from '../components/billing/BillingDetails.jsx';
import { AddMethodModal, ManageMethodsModal, PayModal, ReceiptModal } from '../components/billing/PaymentParts.jsx';

export default function Billing() {
  const { tenant } = useSession();
  const [billing, setBilling] = useState(null), [error, setError] = useState('');
  const [modal, setModal] = useState(null), [receipt, setReceipt] = useState(null);
  const load = useCallback(async () => {
    try { setBilling(await endpoints.getBilling()); setError(''); }
    catch (err) { setError(err.message || 'Could not load billing.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);
  const close = () => setModal(null);
  return <Layout crumb="Payments"><div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Billing &amp; Payments</h1><p className="text-sm text-ink-700/60">Rent, itemized utilities, and allocated payment history.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => window.print()} disabled={!billing} className="print:hidden rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50">Print Statement</button>
        <button onClick={() => setModal('methods')} className="rounded-md border border-black/10 px-3 py-2 text-sm">Payment Methods</button>
        <button onClick={() => setModal('pay')} disabled={!billing || billing.reconciliationRequired || Number(billing.totalOutstanding) <= 0}
          className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Make a Payment</button>
      </div>
    </div>
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Simulated payments only. No money is transferred to GCash, Maya, banks, or card networks.</p>
    {error && <ErrorState message={error} onRetry={load} />}
    {!billing && !error && <LoadingState label="Loading billing…" />}
    {billing && <Card className="p-5"><BillingDetails billing={billing} monthlyRent={tenant?.monthlyRent} /></Card>}
    <AddMethodModal open={modal === 'add'} onClose={close} onSaved={setBilling} defaultName={tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() : ''} />
    <ManageMethodsModal open={modal === 'methods'} onClose={close} methods={billing?.paymentMethods || []} onChanged={setBilling} onAdd={() => setModal('add')} />
    <PayModal open={modal === 'pay'} onClose={close} billing={billing} methods={billing?.paymentMethods || []} onPaid={r => {
      close(); setReceipt(r); load(); window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    }} />
    <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
  </div></Layout>;
}
