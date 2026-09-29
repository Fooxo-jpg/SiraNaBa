import React, { useEffect, useState } from 'react';
import Icon from '../Icon.jsx';
import Modal from '../Modal.jsx';
import { endpoints } from '../../api/endpoints.js';

const FORMATS = [
  { id: 'xlsx', label: 'Excel', ext: '.xlsx', hint: 'Summary, full log and daily activity sheets' },
  { id: 'csv', label: 'CSV', ext: '.csv', hint: 'Plain rows that open in any tool' },
  { id: 'pdf', label: 'PDF', ext: '.pdf', hint: 'Printable report' },
];

const iso = (d) => d.toLocaleDateString('en-CA'); // local YYYY-MM-DD
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

const PRESETS = [
  { id: 'all', label: 'All time', range: () => ['', ''] },
  { id: 'today', label: 'Today', range: () => [iso(new Date()), iso(new Date())] },
  { id: '7', label: 'Last 7 days', range: () => [daysAgo(6), iso(new Date())] },
  { id: '30', label: 'Last 30 days', range: () => [daysAgo(29), iso(new Date())] },
  { id: 'month', label: 'This month', range: () => { const n = new Date(); return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(n)]; } },
];

const fmtDay = (isoStr) =>
  isoStr ? new Date(isoStr).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fieldCls = 'w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-ink-900 focus:border-forest-500 focus:outline-none';

export default function AuditExportModal({ open, onClose }) {
  const [format, setFormat] = useState('xlsx'); // Excel by default
  const [preset, setPreset] = useState('all'); // every log since the start by default
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [level, setLevel] = useState('');
  const [action, setAction] = useState('');
  const [tag, setTag] = useState('');
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const badRange = !!from && !!to && from > to;
  const params = { from, to, level, action, tag };

  // Start fresh each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setFormat('xlsx'); setPreset('all'); setFrom(''); setTo('');
    setLevel(''); setAction(''); setTag(''); setError(''); setSummary(null);
  }, [open]);

  // Live "N records match" count as the filters change.
  useEffect(() => {
    if (!open || badRange) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const s = await endpoints.getAuditLogSummary({ from, to, level, action, tag });
        if (!cancelled) { setSummary(s); setSummaryError(''); }
      } catch (err) {
        if (!cancelled) setSummaryError(err.message || "Couldn't load the log count.");
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, from, to, level, action, tag, badRange]);

  const pickPreset = (p) => {
    const [f, t] = p.range();
    setPreset(p.id); setFrom(f); setTo(t);
  };

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const { blob, filename } = await endpoints.downloadAuditLog(format, params);
      const stamp = new Date().toLocaleString('sv-SE').replace(/[: ]/g, '-').slice(0, 16);
      const name = filename || `siranaba-audit-log_${from || to ? `${from || 'start'}_to_${to || 'latest'}` : 'all'}_${stamp}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't build the file. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const nothing = summary && summary.matching === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Full Audit Trail"
      maxWidth="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-sand-100">Cancel</button>
          <button
            onClick={download}
            disabled={busy || badRange || nothing}
            className="flex items-center gap-2 rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
          >
            <Icon name="download" size={14} /> {busy ? 'Preparing file…' : `Download ${FORMATS.find((f) => f.id === format).ext}`}
          </button>
        </>
      }
    >
      <div className="space-y-5 pb-2">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Format</p>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                aria-pressed={format === f.id}
                className={`rounded-md border px-3 py-2 text-left ${format === f.id ? 'border-forest-500 bg-forest-50 ring-1 ring-forest-500' : 'border-black/10 hover:bg-sand-100'}`}
              >
                <span className="block text-sm font-semibold text-ink-900">{f.label} <span className="font-normal text-ink-700/50">{f.ext}</span></span>
                <span className="block text-[11px] leading-tight text-ink-700/60">{f.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Date range</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPreset(p)}
                aria-pressed={preset === p.id}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${preset === p.id ? 'border-forest-500 bg-forest-500 text-white' : 'border-black/10 text-ink-700 hover:bg-sand-100'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink-700/70">From
              <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }} className={`${fieldCls} mt-1`} />
            </label>
            <label className="block text-xs font-medium text-ink-700/70">To
              <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPreset('custom'); }} className={`${fieldCls} mt-1`} />
            </label>
          </div>
          {badRange
            ? <p role="alert" className="mt-2 text-xs text-status-high">The start date must be on or before the end date.</p>
            : <p className="mt-2 text-xs text-ink-700/50">Leave both empty to include every log since the beginning. Dates are in Philippine Time.</p>}
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Filters (optional)</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-ink-700/70">Level
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={`${fieldCls} mt-1`}>
                <option value="">All levels</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warning</option>
                <option value="ERROR">Error</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-700/70">Action
              <select value={action} onChange={(e) => setAction(e.target.value)} className={`${fieldCls} mt-1`}>
                <option value="">All actions</option>
                <option value="Insert">Insert</option>
                <option value="Update">Update</option>
                <option value="Delete">Delete</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-700/70">Module
              <select value={tag} onChange={(e) => setTag(e.target.value)} className={`${fieldCls} mt-1`}>
                <option value="">All modules</option>
                {(summary?.tags || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
        </section>

        <div className="rounded-md bg-sand-100 px-3 py-2 text-xs text-ink-700/80" aria-live="polite">
          {summaryError && <span className="text-status-high">{summaryError}</span>}
          {!summaryError && !summary && !badRange && 'Counting logs…'}
          {!summaryError && summary && (
            <>
              <strong className="text-ink-900">{summary.matching.toLocaleString()}</strong> of {summary.total.toLocaleString()} logs will be exported
              {summary.first && <> · recorded {fmtDay(summary.first)} – {fmtDay(summary.last)}</>}
              {nothing && <span className="block text-status-high">Nothing matches these filters.</span>}
            </>
          )}
        </div>

        {error && <p role="alert" className="rounded-md bg-status-highBg px-3 py-2 text-xs text-status-high">{error}</p>}
      </div>
    </Modal>
  );
}
