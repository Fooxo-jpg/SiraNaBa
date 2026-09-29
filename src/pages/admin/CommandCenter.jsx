import React, { useEffect, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';
import { TicketReportSummary, AIReportAnalysis, useTicketReports } from '../../components/admin/TicketReports.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';


export default function CommandCenter() {
  const staffReadiness = { emergencyProtocol: '—', energyOptimization: '—' };
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [staff, setStaff] = useState(null);
  const [staffError, setStaffError] = useState('');
  const loadStaff = async () => {
    try {
      setStaff(await endpoints.getStaff());
      setStaffError('');
    } catch (error) {
      setStaff(null);
      setStaffError(error.message || 'Could not load staff readiness.');
    }
  };
  useEffect(() => { loadStaff(); }, []);
  useAutoRefresh(loadStaff);
  const onlineStaff = staff?.filter((member) => member.availability === 'online').length ?? 0;
  const totalStaff = staff?.length ?? 0;
  const loadMetrics = async () => {
    try {
      setMetrics(await endpoints.getCommandCenter());
      setMetricsError('');
    } catch (error) {
      setMetricsError(error.message || 'Could not load dashboard statistics.');
      setMetrics(null);
    }
  };
  useEffect(() => { loadMetrics(); }, []);
  useAutoRefresh(loadMetrics);
  const duration = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h`;
  };
  const previous = metrics?.yesterdayActiveIncidents;
  const change = previous > 0 ? (metrics.activeIncidents - previous) / previous * 100 : null;
  const incidentDelta = !metrics ? '' : previous == null ? 'Yesterday comparison unavailable'
    : previous === 0 ? metrics.activeIncidents === 0 ? '0% from yesterday' : 'From 0 yesterday · % unavailable'
    : `${change > 0 ? '+' : ''}${change.toFixed(1)}% from yesterday`;
  const value = (key) => metrics ? metrics[key].toLocaleString() : '—';
  const stats = [
    { id: 'incidents', label: 'Active Incidents', value: value('activeIncidents'), delta: incidentDelta, tone: change > 0 ? 'danger' : change < 0 ? 'success' : 'neutral', icon: 'alert', tag: 'As of today' },
    { id: 'uptime', label: 'System Uptime', value: metrics ? duration(metrics.uptimeSeconds) : '—', delta: 'Since last server start', icon: 'trend' },
    { id: 'dispatch', label: 'Pending Dispatch', value: value('pendingDispatch'), delta: !metrics ? '' : metrics.averageAutoAssignmentSeconds == null ? 'No automatic assignments yet' : `Avg. AI assignment: ${duration(metrics.averageAutoAssignmentSeconds)}`, icon: 'clock' },
    { id: 'tenants', label: 'Total Tenants', value: value('totalTenants'), delta: 'Registered tenant accounts', icon: 'users' },
  ];
  const reports = useTicketReports();

  return (
    <AdminLayout crumb="Command Center">
      <div className="space-y-6">
        {metricsError && <p role="alert" className="text-sm text-status-high">Statistics unavailable: {metricsError} <button type="button" onClick={loadMetrics} className="underline">Retry</button></p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.id} {...s} />
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <TicketReportSummary {...reports} />
          <div className="min-w-0 space-y-6">
            <AIReportAnalysis {...reports} />
            <Card className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Staff Readiness</p>
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-700/70">Online staff / Total staff</span>
                  <span className="font-semibold text-ink-900" aria-live="polite">
                    {staff ? `${onlineStaff} / ${totalStaff}` : '— / —'}
                  </span>
                </div>
                {staff && <div role="progressbar" aria-label="Online staff" aria-valuemin={0} aria-valuemax={100} aria-valuenow={totalStaff ? Math.round(onlineStaff / totalStaff * 100) : 0} aria-valuetext={`${onlineStaff} online out of ${totalStaff} staff`} className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100">
                  <div
                    className="h-full rounded-full bg-forest-500"
                    style={{
                      width: `${
                        totalStaff
                          ? (onlineStaff / totalStaff) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>}
                {staffError ? <p role="alert" className="mt-2 text-xs text-status-high">Staff readiness unavailable. <button type="button" onClick={loadStaff} className="underline">Retry</button></p> : !staff && <p role="status" className="mt-2 text-xs text-ink-700/50">Loading staff…</p>}
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

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
