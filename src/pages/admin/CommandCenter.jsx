import React from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { commandCenter } from '../../data/adminMockDb.js';

const LOG_STYLES = {
  log: 'text-white/50',
  ok: 'text-forest-300',
  err: 'text-status-high',
};

export default function CommandCenter() {
  const { stats, systemHealth, dispatchQueue, eventStream, staffReadiness, systemIntegrity } = commandCenter;

  return (
    <AdminLayout crumb="Command Center">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.id} {...s} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-forest-600">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-500" /> Live System Health
            </p>
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-ink-900">{systemHealth.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700/60">{systemHealth.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {systemHealth.metrics.map((m) => (
                    <div key={m.label}>
                      <p className="text-xs font-medium text-ink-700/50">{m.label}</p>
                      <p className="font-mono text-sm font-semibold text-ink-900">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex h-40 w-full flex-shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white/30 sm:w-48">
                <Icon name="wifi" size={28} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Dispatch Queue</h2>
              <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-700">
                {dispatchQueue.length} New
              </span>
            </div>
            <p className="mb-3 text-xs text-ink-700/50">High-priority unassigned work orders.</p>
            <div className="space-y-2.5">
              {dispatchQueue.map((wo) => (
                <div key={wo.id} className="rounded-lg border border-black/5 p-3">
                  <p className="mb-0.5 text-xs font-medium text-ink-700/50">
                    {wo.id} • {wo.age}
                  </p>
                  <p className="text-sm font-semibold text-ink-900">{wo.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/50">
                    <Icon name="chevronRight" size={11} /> {wo.location}
                  </p>
                </div>
              ))}
            </div>
            <Link
              to="/admin/triage"
              className="mt-4 block rounded-md bg-forest-500 py-2 text-center text-sm font-semibold text-white hover:bg-forest-600"
            >
              Go to Triage Queue
            </Link>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink-900">Incoming Event Stream</h2>
                <p className="text-xs text-ink-700/50">Real-time log of IoT and security triggers across all facilities.</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-sand-100">
                  <Icon name="filter" size={13} /> Filter
                </button>
                <button className="flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-sand-100">
                  <Icon name="download" size={13} /> Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto thin-scrollbar">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                    <th className="pb-2 pr-3 font-semibold">Timestamp</th>
                    <th className="pb-2 pr-3 font-semibold">Asset ID</th>
                    <th className="pb-2 pr-3 font-semibold">Event Type</th>
                    <th className="pb-2 pr-3 font-semibold">Priority</th>
                    <th className="pb-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {eventStream.map((e, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-3 font-mono text-xs text-ink-700/60">{e.time}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-ink-900">{e.assetId}</td>
                      <td className="py-2.5 pr-3 text-ink-900">{e.event}</td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge label={e.priority} />
                      </td>
                      <td className="py-2.5 text-right">
                        <button aria-label="Open event" className="text-ink-700/40 hover:text-forest-600">
                          <Icon name="external" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="mt-4 block w-full text-center text-sm font-medium text-forest-600 hover:underline">
              Load More Activity
            </button>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Staff Readiness</p>
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-700/70">On-site Technicians</span>
                  <span className="font-semibold text-ink-900">
                    {staffReadiness.onSiteTechnicians.current} / {staffReadiness.onSiteTechnicians.total}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
                  <div
                    className="h-full rounded-full bg-forest-500"
                    style={{
                      width: `${(staffReadiness.onSiteTechnicians.current / staffReadiness.onSiteTechnicians.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-700/70">Inventory Availability</span>
                  <span className="font-semibold text-ink-900">
                    {Math.round(staffReadiness.inventoryAvailability * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
                  <div
                    className="h-full rounded-full bg-forest-500"
                    style={{ width: `${staffReadiness.inventoryAvailability * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2.5 border-t border-black/5 pt-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <Icon name="shield" size={16} className="text-forest-600" />
                  <div>
                    <p className="font-medium text-ink-900">Emergency Protocol</p>
                    <p className="text-xs text-ink-700/50">{staffReadiness.emergencyProtocol}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <Icon name="bolt" size={16} className="text-forest-600" />
                  <div>
                    <p className="font-medium text-ink-900">Energy Optimization</p>
                    <p className="text-xs text-ink-700/50">{staffReadiness.energyOptimization}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-ink-900 p-5 text-white">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">System Integrity</p>
                <Icon name="dots" size={14} className="text-white/40" />
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                {systemIntegrity.map((line, i) => (
                  <p key={i} className={LOG_STYLES[line.level]}>
                    [{line.level.toUpperCase()}] {line.text}
                  </p>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
