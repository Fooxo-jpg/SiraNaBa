import React, { useState } from 'react';
import Modal from '../Modal.jsx';
import { endpoints } from '../../api/endpoints.js';
import { reportIssue, reportFloor } from '../../utils/ticketReports.js';

export default function TicketReportEditor({ ticket, issueOptions, onClose, onSaved }) {
  const [form, setForm] = useState({ issueType: reportIssue(ticket), tower: 1, unit: ticket.unit || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await endpoints.updateTicketReportDetails(ticket.id, {
        issueType: form.issueType.trim(), tower: Number(form.tower), unit: form.unit.trim(),
      });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save report details.');
    } finally {
      setSaving(false);
    }
  };
  const fieldClass = 'mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-forest-500';
  return (
    <Modal open onClose={() => !saving && onClose()} title={`Report details · ${ticket.id}`} maxWidth="max-w-lg" footer={<><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-black/10 px-4 py-2 text-sm disabled:opacity-50">Cancel</button><button type="submit" form="report-details" disabled={saving} className="rounded-lg bg-forest-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save details'}</button></>}>
      <form id="report-details" onSubmit={save} className="space-y-4">
        <p className="text-xs text-ink-700/60">Use the same issue label for reports of the same problem. Repeat counts also require the same category, floor, and unit.</p>
        <label className="block text-sm font-medium">Issue label<input required maxLength={160} list="report-issue-labels" value={form.issueType} onChange={update('issueType')} className={fieldClass} /></label>
        <datalist id="report-issue-labels">{issueOptions.map((issue) => <option key={issue} value={issue} />)}</datalist>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm font-medium">Building<input readOnly value="Main Building" className={`${fieldClass} bg-sand-100`} /></label>
<label className="text-sm font-medium">Floor number<input readOnly value={reportFloor(form)} placeholder="From unit" className={fieldClass} /></label>
          <label className="text-sm font-medium">Unit<input required maxLength={50} value={form.unit} onChange={update('unit')} className={fieldClass} /></label>
        </div>
        <p className="text-xs text-ink-700/60">The floor is calculated from the unit: 405 → Floor 4, 1203 → Floor 12.</p>
        {error && <p role="alert" className="text-sm text-status-high">{error}</p>}
      </form>
    </Modal>
  );
}
