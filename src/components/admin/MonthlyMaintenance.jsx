import React, { useCallback, useEffect, useState } from 'react';
import Card from '../Card.jsx';
import Icon from '../Icon.jsx';
import Modal from '../Modal.jsx';
import { endpoints } from '../../api/endpoints.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';
import { reportDate } from '../../utils/ticketReports.js';
import { formatDate } from '../../utils/format.js';

const ordinal = (day) => `${day}${day >= 11 && day <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th')}`;

export default function MonthlyMaintenance() {
  const [schedule, setSchedule] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [invoiceNoticeDays, setInvoiceNoticeDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try { setSchedule(await endpoints.getMonthlyMaintenance()); setLoadError(''); }
    catch (error) { setLoadError(error.message || 'Could not load the maintenance schedule.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, { enabled: !open });
  const close = () => { if (!saving) { setOpen(false); setSaveError(''); } };
  const save = async (event) => {
    event.preventDefault();
    if (saving || !date) return;
    setSaving(true); setSaveError(''); setNotice('');
    try {
      const result = await endpoints.updateMonthlyMaintenance(date, Number(invoiceNoticeDays));
      setSchedule(result.schedule);
      setNotice(result.changed ? `Schedule updated. ${result.notifiedTenants} tenant${result.notifiedTenants === 1 ? '' : 's'} notified.`
        : result.notifiedTenants > 0 ? `Pending notifications delivered to ${result.notifiedTenants} tenants.` : 'Date unchanged. No notifications sent.');
      setOpen(false);
    } catch (error) { setSaveError(error.message || 'Could not update the schedule.'); await load(); }
    finally { setSaving(false); }
  };
  return <>
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-700/60">Scheduled Monthly Maintenance</h2>
        <button type="button" aria-label="Change scheduled maintenance and invoice notice" title="Change schedule settings" disabled={!schedule || !!loadError} onClick={() => { setDate(schedule.nextDate); setInvoiceNoticeDays(schedule.invoiceNoticeDays ?? 7); setSaveError(''); setNotice(''); setOpen(true); }} className="rounded-md p-2 text-forest-600 hover:bg-forest-50 disabled:opacity-40"><Icon name="calendar" size={18} /></button>
      </div>
      {loadError ? <p role="alert" className="mt-2 text-xs text-status-high">{loadError} <button type="button" onClick={load} className="underline">Retry</button></p>
        : !schedule ? <p role="status" className="mt-2 text-sm text-ink-700/60">Loading schedule…</p>
        : <><p className="mt-2 text-lg font-semibold text-ink-900">Every {ordinal(schedule.dayOfMonth)} of the month</p>
          <p className="mt-1 text-sm text-ink-700/60">Next: {formatDate(`${schedule.nextDate}T00:00:00`)}</p>
          <p className="mt-1 text-sm text-ink-700/60">Rent invoices: {schedule.invoiceNoticeDays ?? 7} days before due</p>
          {schedule.dayOfMonth > 28 && <p className="mt-1 text-xs text-ink-700/50">Uses the last day in shorter months.</p>}
          {schedule.pendingNotifications > 0 && <p role="status" className="mt-2 text-xs text-status-high">{schedule.pendingNotifications} tenant notifications pending. Open the calendar and save again to retry.</p>}
        </>}
      {notice && <p role="status" className="mt-2 text-xs text-forest-700">{notice}</p>}
    </Card>
    <Modal open={open} onClose={close} title="Schedule settings" footer={<>
      <button type="button" onClick={close} disabled={saving} className="rounded-md border border-black/10 px-3 py-2 text-sm">Cancel</button>
      <button type="submit" form="monthly-maintenance" disabled={saving || !date} className="rounded-md bg-forest-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save schedule'}</button>
    </>}>
      <form id="monthly-maintenance" onSubmit={save} className="space-y-4">
        <label className="block text-sm font-medium">Next maintenance date<input type="date" required min={reportDate(new Date())} value={date} disabled={saving} onChange={(event) => setDate(event.target.value)} className="mt-2 block w-full rounded-md border border-black/15 px-3 py-2" /></label>
        <label className="block text-sm font-medium">Send rent invoice before due date<input type="number" required min="3" max="14" value={invoiceNoticeDays} disabled={saving} onChange={(event) => setInvoiceNoticeDays(event.target.value)} className="mt-2 block w-full rounded-md border border-black/15 px-3 py-2" /><span className="mt-1 block text-xs font-normal text-ink-700/60">Days before due (minimum 3, maximum 14). The invoice is sent by email and to the tenant's Notification Center.</span></label>
        <p className="text-sm text-ink-700/60">Maintenance repeats monthly on the selected day. Changing its date notifies every tenant.</p>
        {saveError && <p role="alert" className="text-sm text-status-high">{saveError}</p>}
      </form>
    </Modal>
  </>;
}
