import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import Modal from '../Modal.jsx';
import StatusBadge from '../StatusBadge.jsx';
import { endpoints } from '../../api/endpoints.js';
import { formatPhp } from '../../utils/format.js';

// Keep in sync with PaymentProviders.java (the server is what validates these).
export const EWALLETS = ['GCash', 'Maya'];
export const BANKS = [
  'BDO', 'BPI', 'RCBC', 'Metrobank', 'UnionBank', 'Landbank',
  'PNB', 'Security Bank', 'China Bank', 'EastWest Bank',
];

const DOTS = '\u2022\u2022\u2022\u2022';

const inputCls =
  'w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400';

/* ---------- display helpers ---------- */

const LOGO_STYLE = {
  GCash: 'bg-[#007DFE] text-white',
  Maya: 'bg-[#00B67A] text-white',
};

export function MethodLogo({ method, size = 'h-9 w-9' }) {
  if (method.type === 'CARD') {
    return (
      <span className={`flex ${size} flex-shrink-0 items-center justify-center rounded-md bg-sand-100 text-ink-700/60`}>
        <Icon name="card" size={16} />
      </span>
    );
  }
  const initials = method.provider.replace(/[^A-Za-z]/g, '').slice(0, method.type === 'BANK' ? 3 : 1).toUpperCase();
  return (
    <span
      className={`flex ${size} flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
        LOGO_STYLE[method.provider] || 'bg-ink-900 text-white'
      }`}
    >
      {initials}
    </span>
  );
}

export function methodTitle(m) {
  if (m.type === 'CARD') return `${m.provider} ending in ${m.last4}`;
  if (m.type === 'BANK') return `${m.provider} Online Banking`;
  return `${m.provider} wallet`;
}

export function methodSubtitle(m) {
  if (m.type === 'CARD') return `Expires ${m.expiry}${m.accountName ? ` · ${m.accountName}` : ''}`;
  if (m.type === 'BANK') return `Account ${DOTS} ${m.last4}${m.accountName ? ` · ${m.accountName}` : ''}`;
  return `Mobile ${DOTS} ${m.last4}`;
}

/* ---------- Add payment method ---------- */

const TABS = [
  { id: 'CARD', label: 'Card' },
  { id: 'GCash', label: 'GCash' },
  { id: 'Maya', label: 'Maya' },
  { id: 'BANK', label: 'Online Banking' },
];

const EMPTY = {
  tab: 'CARD',
  cardNumber: '',
  holderName: '',
  expiry: '',
  cvv: '',
  mobile: '',
  bank: BANKS[0],
  accountNumber: '',
  accountName: '',
  setPrimary: false,
};

const groupCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-700/60">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-status-high">{error}</span>}
    </label>
  );
}

export function AddMethodModal({ open, onClose, onSaved, defaultName = '' }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Reset every time the modal is opened.
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setErrors({});
    setServerError('');
  }, [open]);

  const fillDemoCard = () =>
    set({ cardNumber: '4242 4242 4242 4242', holderName: defaultName || 'Juan Dela Cruz', expiry: '12/30', cvv: '123' });

  const validate = () => {
    const e = {};
    if (form.tab === 'CARD') {
      const n = form.cardNumber.replace(/\D/g, '');
      if (n.length < 13 || n.length > 19) e.cardNumber = 'Enter a valid card number.';
      if (!form.holderName.trim()) e.holderName = 'Enter the name on the card.';
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) e.expiry = 'Use MM/YY.';
      if (!/^\d{3,4}$/.test(form.cvv)) e.cvv = '3 or 4 digits.';
    } else if (form.tab === 'BANK') {
      const n = form.accountNumber.replace(/\D/g, '');
      if (n.length < 8 || n.length > 16) e.accountNumber = 'Enter 8 to 16 digits.';
      if (!form.accountName.trim()) e.accountName = "Enter the account holder's name.";
    } else {
      const n = form.mobile.replace(/\D/g, '');
      if (!(/^09\d{9}$/.test(n) || /^9\d{9}$/.test(n) || /^639\d{9}$/.test(n))) {
        e.mobile = 'Enter a valid mobile number, e.g. 0917 123 4567.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    setServerError('');
    if (!validate()) return;

    // The CVV is checked here for realism but is never sent to or stored by the server.
    const payload =
      form.tab === 'CARD'
        ? { type: 'CARD', cardNumber: form.cardNumber, accountName: form.holderName, expiry: form.expiry }
        : form.tab === 'BANK'
        ? { type: 'BANK', provider: form.bank, accountNumber: form.accountNumber, accountName: form.accountName }
        : { type: 'EWALLET', provider: form.tab, mobileNumber: form.mobile };

    setSaving(true);
    try {
      const updated = await endpoints.addPaymentMethod({ ...payload, setAsPrimary: form.setPrimary });
      onSaved(updated);
      onClose();
    } catch (err) {
      setServerError(err.message || 'Could not save this payment method.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Payment Method"
      footer={
        <>
          <button onClick={onClose} className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Payment Method'}
          </button>
        </>
      }
    >
      <p className="mb-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">Demo methods only. Do not enter real card, bank, or wallet credentials.</p>
      <div role="tablist" className="mb-4 grid grid-cols-4 gap-1 rounded-lg bg-sand-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={form.tab === t.id}
            onClick={() => {
              set({ tab: t.id });
              setErrors({});
              setServerError('');
            }}
            className={`rounded-md px-1 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs ${
              form.tab === t.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-700/60 hover:text-ink-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {form.tab === 'CARD' && (
          <>
            <div className="flex items-center justify-between rounded-lg bg-forest-50 px-3 py-2 text-xs text-forest-800">
              <span>Demo only, no real charge is made.</span>
              <button type="button" onClick={fillDemoCard} className="font-semibold underline">
                Use demo card
              </button>
            </div>
            <Field label="Card Number" error={errors.cardNumber}>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={form.cardNumber}
                onChange={(e) => set({ cardNumber: groupCard(e.target.value) })}
                placeholder="1234 5678 9012 3456"
                className={inputCls}
              />
            </Field>
            <Field label="Name on Card" error={errors.holderName}>
              <input
                value={form.holderName}
                onChange={(e) => set({ holderName: e.target.value })}
                placeholder="Juan Dela Cruz"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Expiry Date" error={errors.expiry}>
                <input
                  inputMode="numeric"
                  value={form.expiry}
                  onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
                  placeholder="MM/YY"
                  className={inputCls}
                />
              </Field>
              <Field label="CVV" error={errors.cvv}>
                <input
                  inputMode="numeric"
                  type="password"
                  autoComplete="off"
                  maxLength={4}
                  value={form.cvv}
                  onChange={(e) => set({ cvv: e.target.value.replace(/\D/g, '') })}
                  placeholder={DOTS.slice(0, 3)}
                  className={inputCls}
                />
              </Field>
            </div>
          </>
        )}

        {(form.tab === 'GCash' || form.tab === 'Maya') && (
          <Field label={`${form.tab} Mobile Number`} error={errors.mobile}>
            <input
              inputMode="tel"
              value={form.mobile}
              onChange={(e) => set({ mobile: e.target.value })}
              placeholder="0917 123 4567"
              className={inputCls}
            />
          </Field>
        )}

        {form.tab === 'BANK' && (
          <>
            <Field label="Bank">
              <select value={form.bank} onChange={(e) => set({ bank: e.target.value })} className={inputCls}>
                {BANKS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Account Number" error={errors.accountNumber}>
              <input
                inputMode="numeric"
                value={form.accountNumber}
                onChange={(e) => set({ accountNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                placeholder="0012 3456 7890"
                className={inputCls}
              />
            </Field>
            <Field label="Account Holder Name" error={errors.accountName}>
              <input
                value={form.accountName}
                onChange={(e) => set({ accountName: e.target.value })}
                placeholder="Juan Dela Cruz"
                className={inputCls}
              />
            </Field>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-ink-700/70">
          <input
            type="checkbox"
            checked={form.setPrimary}
            onChange={(e) => set({ setPrimary: e.target.checked })}
            className="h-4 w-4 rounded border-black/20 text-forest-600 focus:ring-forest-400"
          />
          Set as primary payment method
        </label>

        {serverError && (
          <p role="alert" className="rounded-md bg-status-highBg px-3 py-2 text-xs text-status-high">
            {serverError}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-ink-700/40">
          <Icon name="lock" size={13} /> Only the last 4 digits are saved. Full card numbers and CVV are never stored.
        </p>
      </div>
    </Modal>
  );
}

/* ---------- Manage saved methods ---------- */

export function ManageMethodsModal({ open, onClose, methods, onChanged, onAdd }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const run = async (id, fn) => {
    setBusy(id);
    setError('');
    try {
      onChanged(await fn());
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Payment Methods"
      footer={
        <button onClick={onClose} className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600">
          Done
        </button>
      }
    >
      <div className="space-y-3">
        {methods.length === 0 && (
          <p className="rounded-lg border border-dashed border-black/10 bg-sand-50 p-4 text-center text-sm text-ink-700/50">
            No payment methods saved yet.
          </p>
        )}
        {methods.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-black/5 p-3">
            <MethodLogo method={m} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{methodTitle(m)}</p>
              <p className="truncate text-xs text-ink-700/50">{methodSubtitle(m)}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {m.isPrimary ? (
                <StatusBadge label="Primary" tone="success" />
              ) : (
                <button
                  aria-label="Set as primary"
                  title="Set as primary"
                  disabled={busy === m.id}
                  onClick={() => run(m.id, () => endpoints.setPrimaryPaymentMethod(m.id))}
                  className="rounded-full p-1.5 text-ink-700/50 hover:bg-sand-100 hover:text-forest-600 disabled:opacity-50"
                >
                  <Icon name="star" size={15} />
                </button>
              )}
              <button
                aria-label="Remove payment method"
                title="Remove"
                disabled={busy === m.id}
                onClick={() => {
                  if (window.confirm(`Remove ${methodTitle(m)}?`)) run(m.id, () => endpoints.removePaymentMethod(m.id));
                }}
                className="rounded-full p-1.5 text-ink-700/50 hover:bg-sand-100 hover:text-status-high disabled:opacity-50"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        ))}
        {error && <p role="alert" className="text-xs text-status-high">{error}</p>}
      </div>
      <button
        onClick={onAdd}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/15 py-2.5 text-sm font-medium text-forest-600 hover:bg-forest-50"
      >
        <Icon name="plus" size={14} /> Add New Payment Method
      </button>
    </Modal>
  );
}

/* ---------- Pay total (demo checkout) ---------- */

// A pending request survives modal close/reload so a lost response can be retried with the same key.
export function PayModal({ open, onClose, billing, methods = [], onPaid, submitPayment = endpoints.pay, recorded = false }) {
  const [paymentType, setPaymentType] = useState('COMBINED');
  const [statementId, setStatementId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('GCash');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const inFlight = useRef(false);
  const storageKey = `siranaba.payment.${recorded ? 'admin' : 'tenant'}.${billing?.tenantId}`;
  const unpaid = (billing?.utilityStatements || []).filter(s => Number(s.balance) > 0);
  const utilityBalance = statementId ? Number(unpaid.find(s => s.id === statementId)?.balance || 0) : Number(billing?.utilityBalance || 0);
  const applicable = paymentType === 'RENT' ? Number(billing?.rentBalance || 0) : paymentType === 'UTILITY' ? utilityBalance : Number(billing?.totalOutstanding || 0);
  useEffect(() => {
    if (!open || !billing) return;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* storage may be unavailable */ }
    setPending(saved || null); setError('');
    setPaymentType(saved?.paymentType || 'COMBINED'); setStatementId(saved?.relatedUtilityStatementId || '');
    setAmount(saved?.amount || String(billing.totalOutstanding ?? ''));
    setMethod(recorded ? saved?.provider || 'Cash' : methods.find(m => m.isPrimary)?.id || 'GCash');
    // Balances may refresh while typing; initialize only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storageKey]);
  const chooseType = value => {
    setPaymentType(value); setStatementId('');
    setAmount(String(value === 'RENT' ? billing.rentBalance : value === 'UTILITY' ? billing.utilityBalance : billing.totalOutstanding));
  };
  const pay = async () => {
    if (inFlight.current) return;
    setError('');
    if (!pending && (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > applicable)) {
      setError('Enter an amount greater than zero and no higher than the selected outstanding balance.'); return;
    }
    let payload = pending;
    if (!payload) {
      const saved = methods.find(m => m.id === method);
      const channel = recorded ? { type: 'MANUAL', provider: method } : saved ? { paymentMethodId: saved.id } : BANKS.includes(method)
        ? { type: 'BANK', provider: method } : method === 'CARD' ? { type: 'CARD' } : { type: 'EWALLET', provider: method };
      payload = { ...channel, paymentType, amount, idempotencyKey: crypto.randomUUID(),
        relatedUtilityStatementId: paymentType === 'UTILITY' && statementId ? statementId : null };
      try { sessionStorage.setItem(storageKey, JSON.stringify(payload)); }
      catch { setError('Browser storage is unavailable. Enable session storage before making a payment so retries remain safe.'); return; }
      setPending(payload);
    }
    inFlight.current = true; setPaying(true);
    try {
      const receipt = await submitPayment(payload);
      sessionStorage.removeItem(storageKey); setPending(null);
      onPaid(receipt);
    } catch (err) {
      if (err.status === 400 || err.status === 422) {
        sessionStorage.removeItem(storageKey); setPending(null);
        setError(err.message);
      } else {
        setError((err.message || 'The response was interrupted.') + ' Retry the same request below; its key prevents a second deduction.');
      }
    } finally { inFlight.current = false; setPaying(false); }
  };
  return <Modal open={open} onClose={() => !paying && onClose()} title={recorded ? 'Record Received Payment' : 'Simulated Payment'} maxWidth="max-w-lg"
    footer={<><button disabled={paying} onClick={onClose} className="rounded-md border px-3 py-2">Close</button>
      <button disabled={paying || !billing || billing.reconciliationRequired || (!pending && applicable <= 0)} onClick={pay}
        className="rounded-md bg-forest-500 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {paying ? 'Recording…' : pending ? 'Retry Same Payment' : recorded ? 'Record Payment' : 'Simulate Payment'}
      </button></>}>
    <div className="space-y-4">
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{recorded
        ? 'Only record funds actually received by management. This action records a receipt; it does not collect money.'
        : 'Demo / Simulated Payment. No real funds are transferred. Provider names identify the simulated method only.'}</p>
      {pending && <p className="text-xs">Pending request: <span className="break-all font-mono">{pending.idempotencyKey}</span>. Details are locked until its outcome is confirmed.</p>}
      <fieldset disabled={paying || !!pending} className="space-y-4 disabled:opacity-70">
        <Field label="Payment For"><select className={inputCls} value={paymentType} onChange={e => chooseType(e.target.value)}>
          <option value="RENT">Rent</option><option value="UTILITY">Utilities</option><option value="COMBINED">Both</option>
        </select></Field>
        {paymentType === 'UTILITY' && <Field label="Utility statement"><select className={inputCls} value={statementId} onChange={e => {
          setStatementId(e.target.value); setAmount(String(e.target.value ? unpaid.find(s => s.id === e.target.value)?.balance : billing.utilityBalance));
        }}><option value="">All unpaid statements (oldest due first)</option>{unpaid.map(s => <option key={s.id} value={s.id}>{s.billingPeriod} — {formatPhp(Number(s.balance))}</option>)}</select></Field>}
        <p className="text-sm">Selected outstanding: <strong>{formatPhp(applicable)}</strong></p>
        <Field label="Payment amount (PHP)"><input className={inputCls} type="number" min="0.01" step="0.01" max={applicable} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        {recorded && <Field label="Actual received payment method"><select className={inputCls} value={method} onChange={e => setMethod(e.target.value)}>
          {['Cash', 'GCash', 'Maya', 'Bank Transfer', 'Card', 'Other'].map(name => <option key={name}>{name}</option>)}
        </select></Field>}
        {!recorded && <Field label="Simulated payment method"><select className={inputCls} value={method} onChange={e => setMethod(e.target.value)}>
          {methods.map(m => <option key={m.id} value={m.id}>{methodTitle(m)}</option>)}
          {EWALLETS.map(name => <option key={name}>{name}</option>)}
          {BANKS.map(name => <option key={name} value={name}>{name} Online Banking</option>)}
          <option value="CARD">Credit / Debit Card</option>
        </select></Field>}
      </fieldset>
      <p className="text-xs text-ink-700/60">Both: overdue rent first, then current rent, then unpaid utilities in due-date order. The server validates and records every allocation.</p>
      {error && <p role="alert" className="rounded-md bg-status-highBg p-3 text-sm text-status-high">{error}</p>}
    </div>
  </Modal>;
}

/* ---------- Receipt ---------- */

export function ReceiptModal({ receipt, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!receipt) return null;
  const failed = receipt.status === 'Failed';
  const paid = new Date(receipt.paidAt);
  const date = paid.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
  const time = paid.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Manila' });

  const copy = () => {
    navigator.clipboard?.writeText(receipt.referenceCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const rows = [
    ['Payment Date', date],
    ['Payment Time', `${time} (PHT)`],
    ['Payment Mode', receipt.paymentMode],
    ['Payment Type', receipt.paymentType || 'Legacy'],
    ['Rent Allocation', formatPhp(Number(receipt.rentAllocation || 0))],
    ['Utility Allocation', formatPhp(Number(receipt.utilityAllocation || 0))],
    ['Status', receipt.status],
  ];

  return (
    <Modal open onClose={onClose} title={receipt.simulated ? 'Simulated Payment Receipt' : 'Payment Receipt'} footer={
      <button onClick={onClose} className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600">
        Done
      </button>
    }>
      <div className="mb-5 flex flex-col items-center text-center">
        <span className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${failed ? 'bg-status-highBg text-status-high' : 'bg-status-successBg text-status-success'}`}>
          <Icon name={failed ? 'alert' : 'check'} size={24} strokeWidth={2.4} />
        </span>
        <p className="text-base font-semibold text-ink-900">{failed ? 'Payment Failed' : receipt.simulated ? 'Simulated Payment Recorded' : 'Payment Recorded'}</p>
        <p className="text-2xl font-bold text-ink-900">{formatPhp(receipt.amount)}</p>
        {receipt.simulated && <p className="mt-2 text-sm text-amber-700">No real funds were transferred.</p>}
        {failed && <p className="mt-1 text-xs text-ink-700/60">No funds were collected. This attempt is recorded in the transaction log.</p>}
      </div>

      <div className={`mb-3 flex items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 ${failed ? 'border-status-high/40 bg-status-highBg' : 'border-forest-400 bg-forest-50'}`}>
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${failed ? 'text-status-high/70' : 'text-forest-700/70'}`}>Reference Code</p>
          <p className={`font-mono text-base font-bold tracking-wide ${failed ? 'text-status-high' : 'text-forest-800'}`}>{receipt.referenceCode}</p>
        </div>
        <button onClick={copy} className={`rounded-md border bg-white px-2.5 py-1 text-xs font-semibold ${failed ? 'border-status-high/40 text-status-high hover:bg-status-highBg' : 'border-forest-400/50 text-forest-700 hover:bg-forest-50'}`}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <dl className="divide-y divide-black/5 rounded-lg border border-black/5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ink-700/60">{k}</dt>
            <dd className="text-right font-semibold text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
