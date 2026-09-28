import React, { useMemo, useState } from 'react';
import Modal from '../Modal.jsx';
import Card from '../Card.jsx';
import StatusBadge from '../StatusBadge.jsx';
import { LoadingState, ErrorState } from '../Common.jsx';
import { EMPTY_REPORT_FILTERS, summarizeReports, reportCategory, reportSeverity, reportFloor, reportDate, issueKey } from '../../utils/ticketReports.js';

const COLORS = { active: 'bg-ink-900', resolved: 'bg-forest-600', cancelled: 'bg-slate-400' };
const controlClass = 'mt-1 block w-full min-w-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-ink-900 focus:border-forest-500';
const unique = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const PAGE_SIZE = 8;

function Pager({ page, pages, onChange, label }) {
  if (pages <= 1) return null;
  return <nav aria-label={`${label} pages`} className="mt-3 flex items-center justify-between gap-3 text-xs"><button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} className="rounded-lg border border-black/10 px-3 py-2 disabled:opacity-40">Previous</button><span>Page {page + 1} of {pages}</span><button type="button" disabled={page + 1 === pages} onClick={() => onChange(page + 1)} className="rounded-lg border border-black/10 px-3 py-2 disabled:opacity-40">Next</button></nav>;
}

function BreakdownChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return (
    <figure className="mt-6 rounded-xl border border-black/5 p-4">
      <figcaption className="text-sm font-semibold text-ink-900">Active and past reports by category</figcaption>
      <p className="mt-1 text-xs text-ink-700/60">Bar length shows report count. All categories use the same scale.</p>
      <div className="my-4 flex flex-wrap gap-4 text-xs text-ink-700/70">{Object.entries(COLORS).map(([status, color]) => <span key={status} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{status === 'active' ? 'Active / ongoing' : status === 'resolved' ? 'Resolved' : 'Cancelled'}</span>)}</div>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-ink-700/60">No matching reports to chart.</p> : (
        <div className="space-y-4">
          {rows.map((row) => {
            const description = `${row.category}: ${row.total} reports — ${row.active} active, ${row.resolved} resolved, ${row.cancelled} cancelled`;
            return <div key={row.category}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="font-medium text-ink-900">{row.category}</span><span>{row.total} reports</span></div><div role="img" aria-label={description} title={description} className="flex h-6 overflow-hidden rounded-md bg-sand-100">{Object.entries(COLORS).map(([status, color]) => row[status] > 0 && <div key={status} className={`h-full ${color}`} style={{ width: `${row[status] / max * 100}%` }} />)}</div><p aria-hidden="true" className="mt-1 text-[11px] text-ink-700/60">{row.active} active · {row.resolved} resolved · {row.cancelled} cancelled</p></div>;
          })}
          <div aria-hidden="true" className="flex justify-between border-t border-black/10 pt-1 text-[10px] text-ink-700/50"><span>0</span><span>{max} reports</span></div>
        </div>
      )}
    </figure>
  );
}

export default function TicketReportSummary({ tickets, loading, error, load }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ ...EMPTY_REPORT_FILTERS });
  const [page, setPage] = useState(0);
  const result = useMemo(() => summarizeReports(tickets, filters), [tickets, filters]);
  const categories = unique(tickets.map(reportCategory));
  const severities = unique(tickets.map(reportSeverity));
  const update = (key) => (event) => { setFilters((current) => ({ ...current, [key]: event.target.value })); setPage(0); };
  const reset = () => { setFilters({ ...EMPTY_REPORT_FILTERS }); setPage(0); };
  const pages = Math.max(1, Math.ceil(result.tickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const frequency = new Map(result.groups.map((group) => [group.key, group.exact ? group.tickets.length : null]));
  const stats = [['Matching reports', result.tickets.length], ['Active / ongoing', result.counts.active], ['Resolved', result.counts.resolved], ['Cancelled', result.counts.cancelled]];
  const select = (key, label, options, allLabel) => <label className="text-xs font-medium text-ink-700/70">{label}<select value={filters[key]} onChange={update(key)} className={controlClass}><option value="">{allLabel}</option>{options.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>;
  const input = (key, label, type = 'text', props = {}) => <label className="text-xs font-medium text-ink-700/70">{label}<input type={type} value={filters[key]} onChange={update(key)} className={controlClass} {...props} /></label>;
  return (
    <Card className="min-w-0 p-4 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-forest-600">Maintenance overview</p><h2 className="text-lg font-bold text-ink-900">Ticket Report Summary</h2><p className="mt-1 text-sm text-ink-700/60">Active issues and report history in one view.</p></div><button type="button" onClick={() => setSummaryOpen(true)} className="text-sm font-semibold text-forest-600 hover:underline">Open ticket summary &rarr;</button></div>
      <div className="mt-5 rounded-xl bg-sand-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-expanded={filtersOpen} aria-controls="ticket-report-filters" onClick={() => setFiltersOpen((open) => !open)} className="flex flex-1 items-center justify-between gap-3 text-left text-sm font-semibold text-ink-900">
            <span>Filter reports{Object.values(filters).filter(Boolean).length > 0 && ` (${Object.values(filters).filter(Boolean).length} active)`}</span>
            <span className="text-xs text-forest-700">{filtersOpen ? 'Hide filters −' : 'Show filters +'}</span>
          </button>
          {!filtersOpen && Object.values(filters).some(Boolean) && <button type="button" onClick={reset} className="text-xs font-semibold text-forest-700 hover:underline">Reset</button>}
        </div>
        <fieldset id="ticket-report-filters" hidden={!filtersOpen} className="mt-4">
        <legend className="sr-only">Filter reports</legend>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {select('category', 'Category', categories, 'All categories')}
          {select('severity', 'Severity', severities, 'All severities')}
          {input('issue', 'Specific issue', 'search', { placeholder: 'Search issue labels' })}
          {input('from', 'Reported from', 'date', { max: filters.to || undefined })}
          {input('to', 'Reported through', 'date', { min: filters.from || undefined })}
          {input('minFrequency', 'Minimum times reported', 'number', { min: 1, step: 1, placeholder: 'Any frequency' })}
          {input('maxFrequency', 'Maximum times reported', 'number', { min: 1, step: 1, placeholder: 'Any frequency' })}
          {select('tower', 'Tower', unique(tickets.filter((t) => t.tower > 0).map((t) => String(t.tower))), 'All towers')}
          {input('floor', 'Floor number', 'text', { placeholder: 'Any floor' })}
          {input('unit', 'Exact unit', 'text', { placeholder: 'Any unit' })}
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3"><p className="max-w-md text-xs leading-relaxed text-ink-700/60">Dates use Philippine time and the submission date. Frequency counts matching reports of the same issue, category, tower, floor, and unit.</p><button type="button" onClick={reset} className="text-xs font-semibold text-forest-700 hover:underline">Reset filters</button></div>
        {result.error && <p role="alert" className="mt-3 text-sm text-status-high">{result.error}</p>}
        </fieldset>
        {!filtersOpen && result.error && <p role="alert" className="mt-3 text-sm text-status-high">{result.error}</p>}
      </div>
      {loading ? <LoadingState label="Loading ticket reports…" /> : error ? <ErrorState message={error} onRetry={load} /> : result.error ? null : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-live="polite">{stats.map(([label, value]) => <div key={label} className="rounded-xl bg-sand-100 p-3"><p className="text-xs text-ink-700/60">{label}</p><p className="mt-1 text-2xl font-bold text-ink-900">{value}</p></div>)}</div>
          <BreakdownChart rows={result.chart} />

        </>
      )}
      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)} title="Ticket Summary" maxWidth="max-w-4xl" footer={<button type="button" onClick={() => setSummaryOpen(false)} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium">Close</button>}>
        {loading ? <LoadingState label="Loading ticket reports…" /> : error ? <ErrorState message={error} onRetry={load} /> : result.error ? <p role="alert" className="text-sm text-status-high">{result.error}</p> : (
          <section className="pb-2">
            <p className="mt-1 text-xs text-ink-700/60">Newest first · Active, resolved, and cancelled reports</p>
            {result.tickets.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-black/10 p-8 text-center text-sm text-ink-700/60">{tickets.length ? 'No reports match these filters. Adjust the filters to broaden the view.' : 'No reports have been submitted yet.'}</p> : <div role="region" aria-label="Report history table" tabIndex={0} className="mt-3 max-h-[min(24rem,50dvh)] overflow-auto overscroll-contain thin-scrollbar"><table className="w-full min-w-[520px] table-fixed text-left text-xs"><caption className="sr-only">Matching ticket history, location, severity, status and repeat count</caption><colgroup><col className="w-1/3" /><col className="w-1/3" /><col className="w-1/3" /></colgroup><thead className="sticky top-0 z-10 border-b border-black/10 bg-white text-ink-700/60"><tr>{['Report / exact location', 'Severity / status', 'Frequency'].map((label) => <th scope="col" key={label} className="px-2 py-2 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-black/5">{result.tickets.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((ticket) => <tr key={ticket.id}><td className="break-words px-2 py-3"><p className="text-ink-700/50">{ticket.id} · {reportDate(ticket.submittedAt) || 'Date unknown'}</p><p className="mt-1 font-semibold text-ink-900">{ticket.title}</p><p className="mt-1">Tower {ticket.tower || '?'} · Floor {reportFloor(ticket) || '?'} · Unit {ticket.unit || '?'}</p><p className="mt-1 text-ink-700/50">{ticket.location}</p></td><td className="px-2 py-3"><div className="flex flex-wrap items-center gap-2 [&>span]:shrink-0 [&>span]:whitespace-nowrap"><StatusBadge label={reportSeverity(ticket)} /><StatusBadge label={ticket.stage} /></div></td><td className="break-words px-2 py-3">{frequency.get(issueKey(ticket)) ?? 'Needs location'}</td></tr>)}</tbody></table></div>}
            <Pager page={currentPage} pages={pages} onChange={setPage} label="Report history" />
          </section>
        )}
      </Modal>
    </Card>
  );
}
