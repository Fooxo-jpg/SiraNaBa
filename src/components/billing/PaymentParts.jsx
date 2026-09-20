import React, { useEffect, useState } from 'react';
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

const CHANNELS = [
  { id: 'GCash', label: 'GCash', hint: 'Pay with your GCash wallet', type: 'EWALLET' },
  { id: 'Maya', label: 'Maya', hint: 'Pay with your Maya wallet', type: 'EWALLET' },
  { id: 'BANK', label: 'Online Banking', hint: 'BDO, BPI, RCBC and more', type: 'BANK' },
  { id: 'CARD', label: 'Credit / Debit Card', hint: 'Visa, Mastercard and more', type: 'CARD' },
];

function Radio({ on }) {
  return (
    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-forest-500' : 'border-black/20'}`}>
      {on && <span className="h-2 w-2 rounded-full bg-forest-500" />}
    </span>
  );
}

export function PayModal({ open, onClose, amount, methods, onPaid }) {
  const primary = methods.find((m) => m.isPrimary) || methods[0];
  const [choice, setChoice] = useState(null); // { kind: 'saved', id } | { kind: 'channel', id }
  const [bank, setBank] = useState(BANKS[0]);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  // Start from the primary saved method (or GCash) each time the checkout opens.
  useEffect(() => {
    if (!open) return;
    setChoice(primary ? { kind: 'saved', id: primary.id } : { kind: 'channel', id: 'GCash' });
    setBank(BANKS[0]);
    setError('');
    setPaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pay = async () => {
    setError('');
    setPaying(true);
    try {
      let payload;
      if (choice.kind === 'saved') {
        payload = { paymentMethodId: choice.id };
      } else {
        const ch = CHANNELS.find((c) => c.id === choice.id);
        payload = { type: ch.type, provider: ch.type === 'BANK' ? bank : ch.type === 'EWALLET' ? ch.id : undefined };
      }
      // Small pause so the demo feels like a real gateway round trip.
      const [receipt] = await Promise.all([endpoints.pay(payload), new Promise((r) => setTimeout(r, 900))]);
      onPaid(receipt);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setPaying(false);
    }
  };

  const option = (selected, onSelect, children, key) => (
    <button
      key={key}
      type="button"
      onClick={onSelect}
      disabled={paying}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected ? 'border-forest-500 bg-forest-50' : 'border-black/10 hover:bg-sand-100'
      }`}
    >
      <Radio on={selected} />
      {children}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={() => !paying && onClose()}
      title="Pay Total Now"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={paying}
            className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={pay}
            disabled={paying || !choice}
            className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
          >
            {paying ? 'Processing…' : `Pay ${formatPhp(amount)}`}
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-center justify-between rounded-lg bg-sand-100 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-700/50">Total amount due</span>
        <span className="text-xl font-bold text-ink-900">{formatPhp(amount)}</span>
      </div>

      <div className="max-h-[46vh] space-y-4 overflow-y-auto thin-scrollbar pr-1">
        {methods.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Saved methods</p>
            <div className="space-y-2">
              {methods.map((m) =>
                option(
                  choice?.kind === 'saved' && choice.id === m.id,
                  () => setChoice({ kind: 'saved', id: m.id }),
                  <>
                    <MethodLogo method={m} size="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">{methodTitle(m)}</span>
                      <span className="block truncate text-xs text-ink-700/50">{methodSubtitle(m)}</span>
                    </span>
                    {m.isPrimary && <StatusBadge label="Primary" tone="success" />}
                  </>,
                  m.id
                )
              )}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
            {methods.length > 0 ? 'Or pay with' : 'Select payment method'}
          </p>
          <div className="space-y-2">
            {CHANNELS.map((c) => {
              const on = choice?.kind === 'channel' && choice.id === c.id;
              return option(
                on,
                () => setChoice({ kind: 'channel', id: c.id }),
                <>
                  {c.id === 'BANK' ? (
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-ink-900 text-white">
                      <Icon name="dollar" size={15} />
                    </span>
                  ) : (
                    <MethodLogo method={{ type: c.type, provider: c.id }} size="h-8 w-8" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900">{c.label}</span>
                    {on && c.id === 'BANK' ? (
                      <select
                        value={bank}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setBank(e.target.value)}
                        aria-label="Choose bank"
                        className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm outline-none focus:border-forest-400"
                      >
                        {BANKS.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="block text-xs text-ink-700/50">{c.hint}</span>
                    )}
                  </span>
                </>,
                c.id
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-status-highBg px-3 py-2 text-xs text-status-high">
          {error}
        </p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-700/40">
        <Icon name="info" size={13} /> Demo checkout: no real money is moved.
      </p>
    </Modal>
  );
}

/* ---------- Receipt ---------- */

export function ReceiptModal({ receipt, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!receipt) return null;
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
    ['Status', receipt.status],
  ];

  return (
    <Modal open onClose={onClose} title="Payment Receipt" footer={
      <button onClick={onClose} className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600">
        Done
      </button>
    }>
      <div className="mb-5 flex flex-col items-center text-center">
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-status-successBg text-status-success">
          <Icon name="check" size={24} strokeWidth={2.4} />
        </span>
        <p className="text-base font-semibold text-ink-900">Payment Successful</p>
        <p className="text-2xl font-bold text-ink-900">{formatPhp(receipt.amount)}</p>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-dashed border-forest-400 bg-forest-50 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-700/70">Reference Code</p>
          <p className="font-mono text-base font-bold tracking-wide text-forest-800">{receipt.referenceCode}</p>
        </div>
        <button onClick={copy} className="rounded-md border border-forest-400/50 bg-white px-2.5 py-1 text-xs font-semibold text-forest-700 hover:bg-forest-50">
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
