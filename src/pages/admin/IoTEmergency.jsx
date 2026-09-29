import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import BuildingMap from '../../components/admin/BuildingMap.jsx';
import { endpoints } from '../../api/endpoints.js';
import { ALL_ROOMS } from '../../data/buildingData.js';
import { useTenantRegistry } from '../../context/TenantRegistryContext.jsx';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';

const TABS = ['Feed', 'Map View', 'History'];

const OVERRIDES = [
  { id: 'evacuate', label: 'Evacuate', icon: 'bell' },
  { id: 'patch', label: '911 Patch', icon: 'phone' },
  { id: 'grid', label: 'Grid Kill', icon: 'bolt' },
  { id: 'clear', label: 'All Clear', icon: 'check' },
];

export default function IoTEmergency() {
  const activeCriticalAlerts = 0;
  const bannerText = '';
  const alerts = [];
  const incidentCommand = [
    { label: 'Fire Dispatch', number: '0000-0000' },
    { label: 'Emergency Medical', number: '0000-0000' },
    { label: 'Security HQ', number: '0000-0000' },
  ];
  const [tab, setTab] = useState('Feed');
  const [dismissed, setDismissed] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(null);
  const [selection, setSelection] = useState({ roomIds: [], floorIds: [] });
  const [schedules, setSchedules] = useState([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');
  const { tenantByRoomId } = useTenantRegistry();

  const loadSchedules = useCallback(() => {
    endpoints.getMaintenanceSchedules().then(setSchedules).catch(() => {});
  }, []);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);
  useAutoRefresh(loadSchedules);

  const affectedRoomIds = useMemo(() => {
    const selectedRooms = new Set(selection.roomIds);
    const selectedFloors = new Set(selection.floorIds);
    return ALL_ROOMS.filter((room) => selectedRooms.has(room.id) || selectedFloors.has(`T${room.tower}-${room.levelKey}`)).map((room) => room.id);
  }, [selection]);
  const maintenanceRoomIds = useMemo(() => new Set(schedules.flatMap((schedule) => schedule.affectedRoomIds)), [schedules]);
  const occupiedAffected = affectedRoomIds.filter((id) => tenantByRoomId.has(id)).length;

  const localInput = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };
  const minSchedule = localInput(new Date(Date.now() + 24 * 60 * 60 * 1000 + 60000));
  const maxSchedule = localInput(new Date(Date.now() + 72 * 60 * 60 * 1000));

  const openSchedule = () => {
    setScheduledAt(minSchedule);
    setReason('');
    setScheduleError('');
    setScheduleOpen(true);
  };

  const saveSchedule = async () => {
    setScheduleSaving(true);
    setScheduleError('');
    try {
      const created = await endpoints.createMaintenanceSchedule({
        roomIds: selection.roomIds,
        floorIds: selection.floorIds,
        scheduledAt,
        reason: reason.trim(),
      });
      setSchedules((current) => [...current.filter((item) => item.id !== created.id), created]);
      setScheduleMessage(`Maintenance scheduled for ${created.affectedRoomIds.length} room(s). ${created.notifiedTenants} tenant(s) notified; ${created.emailsSent} email(s) sent${created.emailsFailed ? ` and ${created.emailsFailed} failed` : ''}.`);
      setScheduleOpen(false);
      setSelection({ roomIds: [], floorIds: [] });
    } catch (error) {
      setScheduleError(error.message || "Couldn't set the maintenance schedule.");
    } finally {
      setScheduleSaving(false);
    }
  };

  return (
    <AdminLayout crumb="IoT & Emergency">
      <div className="space-y-6">
        {!dismissed && activeCriticalAlerts > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-status-highBg px-5 py-4">
            <div className="flex items-start gap-3">
              <Icon name="alert" size={20} className="mt-0.5 flex-shrink-0 text-status-high" />
              <div>
                <p className="font-bold text-status-high">{activeCriticalAlerts} Active Critical Alerts</p>
                <p className="text-sm text-status-high/80">{bannerText}</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 rounded-md bg-status-high px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Mark All Read
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      tab === t ? 'bg-forest-100 text-forest-700' : 'text-ink-700/60 hover:bg-sand-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tab === 'Feed' && (
                <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                  Live Feed
                </span>
              )}
            </div>

            {tab === 'Feed' ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">Priority Alerts</p>
                <div className="space-y-3">
                  {alerts.map((a) => (
                    <Card
                      key={a.id}
                      className={`border-l-4 p-4 ${
                        a.severity === 'Critical' ? 'border-l-status-high' : 'border-l-forest-500'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                              a.severity === 'Critical' ? 'bg-status-highBg text-status-high' : 'bg-forest-50 text-forest-600'
                            }`}
                          >
                            <Icon name={a.icon} size={17} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink-900">{a.type}</p>
                            <p className="text-xs text-ink-700/50">
                              {a.id} • {a.time}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            a.severity === 'Critical'
                              ? 'bg-status-highBg text-status-high'
                              : 'bg-status-progressBg text-status-progress'
                          }`}
                        >
                          {a.severity === 'Critical' ? 'CRITICAL' : 'WARNING'}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs text-ink-700/50">
                        <Icon name="grid" size={12} /> {a.location}
                      </p>
                      <p className="mt-1 text-sm text-ink-700/70">{a.detail}</p>
                      <div className="mt-3 flex gap-2">
                        <button className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-forest-600">
                          <Icon name="chat" size={13} /> Dispatch
                        </button>
                        <button className="flex items-center gap-1.5 rounded-md border border-black/10 px-3.5 py-2 text-xs font-medium hover:bg-sand-100">
                          <Icon name="history" size={13} /> View Logs
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                  <Icon name="chevronLeft" size={20} className="rotate-90 text-ink-700/30" />
                  <p className="font-semibold text-ink-900">{alerts.length === 0 ? 'No Active Alerts' : 'Active Monitoring'}</p>
                  <p className="max-w-xs text-xs text-ink-700/50">
                    {alerts.length === 0
                      ? 'Incoming IoT and security alerts will appear here.'
                      : 'All IoT protocols are executing automated safety sequences for current sector hazards.'}
                  </p>
                </Card>
              </>
            ) : tab === 'Map View' ? (
              <BuildingMap selection={selection} onSelectionChange={setSelection} maintenanceRoomIds={maintenanceRoomIds} />
            ) : (
              <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center text-sm text-ink-700/50">
                <Icon name="info" size={18} className="text-ink-700/30" />
                {tab} isn't populated in this demo yet.
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-ink-900 p-5 text-white">
              <p className="mb-3 flex items-center gap-1.5 font-semibold">
                <Icon name="shield" size={16} /> Tactical Override
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {OVERRIDES.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setConfirmOverride(o)}
                    className="flex flex-col items-center gap-1.5 rounded-lg bg-white/10 py-4 text-xs font-semibold hover:bg-white/20"
                  >
                    <Icon name={o.icon} size={18} /> {o.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-ink-900">
                <Icon name="calendar" size={16} className="text-forest-600" /> Maintenance Schedule
              </p>
              <p className="mb-3 text-xs leading-relaxed text-ink-700/60">
                Select rooms or residential floors in Map View. Hold Ctrl or Cmd while clicking to select more than one.
              </p>
              <div className="mb-3 rounded-lg bg-sand-50 p-3 text-xs text-ink-700/70">
                <p><strong>{selection.floorIds.length}</strong> floor(s), <strong>{selection.roomIds.length}</strong> individual room(s)</p>
                <p><strong>{affectedRoomIds.length}</strong> total affected · <strong>{occupiedAffected}</strong> occupied</p>
              </div>
              <button
                onClick={openSchedule}
                disabled={affectedRoomIds.length === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="calendar" size={14} /> Set Maintenance Schedule
              </button>
              {scheduleMessage && <p role="status" className="mt-3 rounded-md bg-status-successBg p-2 text-xs text-status-success">{scheduleMessage}</p>}
            </Card>

            <Card className="p-5">
              <p className="mb-3 flex items-center gap-1.5 font-semibold text-ink-900">
                <Icon name="phone" size={15} /> Incident Command
              </p>
              <div className="space-y-2 text-sm">
                {incidentCommand.map((c) => (
                  <div key={c.label} className="flex items-center justify-between">
                    <span className="text-ink-700/60">{c.label}</span>
                    <span className="font-mono font-semibold text-ink-900">{c.number}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={scheduleOpen}
        onClose={() => !scheduleSaving && setScheduleOpen(false)}
        title="Set Maintenance Schedule"
        footer={
          <>
            <button onClick={() => setScheduleOpen(false)} disabled={scheduleSaving} className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100">Cancel</button>
            <button onClick={saveSchedule} disabled={scheduleSaving || !scheduledAt || !reason.trim()} className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-40">
              {scheduleSaving ? 'Setting…' : 'Set Maintenance'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-sand-50 p-3 text-sm text-ink-700/70">
            <p className="font-semibold text-ink-900">{affectedRoomIds.length} affected room(s)</p>
            <p>{occupiedAffected} occupied unit(s) will receive a portal notification and email.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-700/50">Date and time</span>
            <input type="datetime-local" value={scheduledAt} min={minSchedule} max={maxSchedule} onChange={(event) => setScheduledAt(event.target.value)} className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400" />
            <span className="mt-1 block text-xs text-ink-700/50">Must be between 24 and 72 hours from now.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-700/50">Reason for maintenance</span>
            <textarea value={reason} maxLength={500} rows={4} onChange={(event) => setReason(event.target.value)} placeholder="Describe the maintenance work and any access requirements…" className="w-full resize-none rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-forest-400" />
          </label>
          {scheduleError && <p role="alert" className="rounded-md bg-status-highBg p-3 text-xs text-status-high">{scheduleError}</p>}
        </div>
      </Modal>

      <Modal
        open={!!confirmOverride}
        onClose={() => setConfirmOverride(null)}
        title={`Confirm: ${confirmOverride?.label || ''}`}
        footer={
          <>
            <button
              onClick={() => setConfirmOverride(null)}
              className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setConfirmOverride(null)}
              className="rounded-md bg-status-high px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Confirm Override
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-700/70">
          This is a facility-wide tactical override. It will notify on-site staff and emergency
          contacts immediately. Only confirm if this action is intended.
        </p>
      </Modal>
    </AdminLayout>
  );
}
