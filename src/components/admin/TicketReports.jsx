import React, { useCallback, useEffect, useState } from 'react';
import Card from '../Card.jsx';
import Icon from '../Icon.jsx';
import { locationPatterns, ticketFindings } from '../../utils/ticketReports.js';

import { endpoints } from '../../api/endpoints.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';


export function useTicketReports() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setTickets(await endpoints.getAdminTickets());
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load ticket reports.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);
  const replaceTicket = (updated) => setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
  return { tickets, loading, error, load, replaceTicket };
}

export { default as TicketReportSummary } from './TicketReportSummary.jsx';

export function AIReportAnalysis({ tickets, loading, error }) {
  const patterns = locationPatterns(tickets);
  const hasPatterns = patterns.units.length > 0 || patterns.floors.length > 0;
  const findings = ticketFindings(tickets);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-lg bg-forest-100 p-2 text-forest-600"><Icon name="fileText" size={18} /></span>
        <h2 className="font-semibold text-ink-900">AI Report Analysis</h2>
      </div>
      {error ? <p role="alert" className="py-6 text-sm text-ink-700/60">Analysis unavailable. Ticket reports could not be loaded.</p>
        : loading ? <p role="status" className="py-6 text-sm text-ink-700/60">Loading ticket data…</p>
        : tickets.length === 0 ? <p className="py-6 text-sm text-ink-700/60">No ticket data available yet.</p>
        : <div className="mt-4 max-h-[36rem] space-y-5 overflow-auto overscroll-contain thin-scrollbar">
          <section aria-label="Ticket data findings">
            <ul className="mt-2 list-disc space-y-3 pl-4 text-sm leading-relaxed text-ink-700">
              {findings.map((finding) => <li key={finding} className="break-words">{finding}</li>)}
            </ul>
          </section>
          {!hasPatterns && <p className="text-sm leading-relaxed text-ink-700/60">No repeated issue labels were found within the same unit or across multiple units on the same floor among reports with complete location details.</p>}
          {patterns.units.length > 0 && <section aria-label="Repeated problems in the same unit">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-forest-700">Repeated reports in a unit</h3>
            <ul className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">
              {patterns.units.map((pattern) => <li key={pattern.key} className="break-words">
                Tower {pattern.tower} · Unit {pattern.units[0]} has made {pattern.count} reports about <span className="font-semibold text-ink-900">{pattern.issue}</span>.
              </li>)}
            </ul>
          </section>}
          {patterns.floors.length > 0 && <section aria-label="Shared problems on the same floor">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-forest-700">Shared problems on a floor</h3>
            <ul className="mt-2 space-y-4 text-sm leading-relaxed text-ink-700">
              {patterns.floors.map((pattern) => <li key={pattern.key} className="break-words">
                <p>Tower {pattern.tower} · Floor {pattern.floor}: {pattern.units.length} units ({pattern.units.join(', ')}) have reported the same problem: <span className="font-semibold text-ink-900">{pattern.issue}</span> ({pattern.category}), across {pattern.count} reports.</p>
                {pattern.description && <p className="mt-1 text-xs text-ink-700/60">Reported details: {pattern.description}</p>}
              </li>)}
            </ul>
          </section>}
        </div>}
    </Card>
  );
}
