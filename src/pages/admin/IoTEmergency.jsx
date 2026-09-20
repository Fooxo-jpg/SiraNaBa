import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import BuildingMap from '../../components/admin/BuildingMap.jsx';
import { iotEmergency } from '../../data/adminMockDb.js';

const TABS = ['Feed', 'Map View', 'History'];

const OVERRIDES = [
  { id: 'evacuate', label: 'Evacuate', icon: 'bell' },
  { id: 'patch', label: '911 Patch', icon: 'phone' },
  { id: 'grid', label: 'Grid Kill', icon: 'bolt' },
  { id: 'clear', label: 'All Clear', icon: 'check' },
];

export default function IoTEmergency() {
  const { activeCriticalAlerts, bannerText, alerts, telemetry, emergencyPersonnel, incidentCommand } = iotEmergency;
  const [tab, setTab] = useState('Feed');
  const [dismissed, setDismissed] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(null);

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
              <BuildingMap />
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
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                  <Icon name="trend" size={16} className="text-forest-600" /> System Telemetry
                </p>
                <span className="rounded-full bg-status-successBg px-2 py-0.5 text-[10px] font-bold uppercase text-status-success">
                  Live
                </span>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-700/50">Sensor Network</span>
                  <span className="font-semibold text-ink-900">{telemetry.sensorNetwork}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-700/50">Pwr Stability</span>
                  <span className="font-semibold text-ink-900">{telemetry.powerStability == null ? '—' : `${Math.round(telemetry.powerStability * 100)}%`}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-black/5 pt-2.5">
                  <div>
                    <p className="text-xs text-ink-700/50">Active Nodes</p>
                    <p className="font-mono text-lg font-bold text-ink-900">{telemetry.activeNodes.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-700/50">Latency</p>
                    <p className="font-mono text-lg font-bold text-ink-900">{telemetry.latencyMs == null ? '—' : `${telemetry.latencyMs}ms`}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-3 font-semibold text-ink-900">Emergency Personnel</p>
              <p className="mb-3 -mt-2 text-xs text-ink-700/50">Live GPS dispatch status</p>
              <div className="space-y-3">
                {emergencyPersonnel.length === 0 && (
                  <p className="py-2 text-center text-xs text-ink-700/50">No personnel on duty.</p>
                )}
                {emergencyPersonnel.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-[9px] font-semibold text-ink-700/60">
                        {p.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                        <p className="text-xs text-ink-700/50">{p.role}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        p.status === 'Active'
                          ? 'bg-status-successBg text-status-success'
                          : 'bg-status-progressBg text-status-progress'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-3 flex w-full items-center justify-between text-xs font-medium text-forest-600 hover:underline">
                View Sector Assignments <Icon name="chevronRight" size={13} />
              </button>
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
