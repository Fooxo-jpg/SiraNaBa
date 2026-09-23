import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Card from '../../components/Card.jsx';
import Icon from '../../components/Icon.jsx';
import { configuration } from '../../data/adminMockDb.js';
import { endpoints } from '../../api/endpoints.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';
import { formatBytes, formatDuration, formatRelativeTime } from '../../utils/format.js';

const TABS = [
  { id: 'logs', label: 'System Logs', icon: 'grid' },
  { id: 'rules', label: 'Dispatch Rules', icon: 'bell' },
  { id: 'database', label: 'Database', icon: 'database' },
  { id: 'advanced', label: 'Advanced', icon: 'settings' },
];

const STATUS_STYLES = {
  Healthy: 'text-status-success',
  Connected: 'text-status-success',
  Degraded: 'text-status-high',
  Offline: 'text-status-high',
};

const LEVEL_STYLES = {
  INFO: 'bg-white/10 text-white/70',
  WARN: 'bg-status-progress/20 text-status-progress',
  ERROR: 'bg-status-high/20 text-status-high',
  DEBUG: 'bg-white/10 text-white/50',
};

function DetailRow({ label, value, mono = true }) {
  return (
    <div>
      <p className="text-xs text-ink-700/50">{label}</p>
      <p className={`break-all text-sm font-semibold text-ink-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

// "Database" tab: everything the server can tell us about the live MongoDB.
function DatabasePanel({ db, error, refreshing, onRefresh }) {
  const failed = !!error || (db && !db.connected);
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink-900">MongoDB Connection</h2>
          <p className="text-xs text-ink-700/50">
            Live from the database this server is connected to.
            {db?.checkedAt && ` Checked ${formatRelativeTime(db.checkedAt)}.`}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-sand-100 disabled:opacity-60"
        >
          <Icon name="refresh" size={14} /> {refreshing ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {failed && (
        <p role="alert" className="mb-4 rounded-md bg-status-highBg px-3 py-2 text-xs text-status-high">
          {error || db.error}
        </p>
      )}

      {!db && !error && <p className="py-6 text-center text-sm text-ink-700/50">Checking the database…</p>}

      {db && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <DetailRow label="Status" value={error ? 'Offline' : db.status} mono={false} />
            <DetailRow label="Database" value={db.database || '—'} />
            <DetailRow label="Host" value={db.hosts?.length ? db.hosts.join(', ') : '—'} />
            <DetailRow label="Connection type" value={db.srv ? 'mongodb+srv (Atlas / DNS seedlist)' : 'mongodb (direct)'} mono={false} />
            <DetailRow label="Server version" value={db.version || '—'} />
            <DetailRow label="Ping latency" value={db.latencyMs == null ? '—' : `${db.latencyMs} ms`} />
            <DetailRow label="Server uptime" value={formatDuration(db.uptimeSeconds)} />
            <DetailRow label="Data size" value={formatBytes(db.dataSizeBytes)} />
            <DetailRow label="Storage used" value={formatBytes(db.storageSizeBytes)} />
            <DetailRow label="Index size" value={formatBytes(db.indexSizeBytes)} />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-700/40">
              Collections ({db.collections.length})
            </h3>
            {db.collections.length === 0 ? (
              <p className="text-sm text-ink-700/50">No collections found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                    <th className="pb-2">Collection</th>
                    <th className="pb-2 text-right">Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {db.collections.map((c) => (
                    <tr key={c.name}>
                      <td className="py-2 font-mono text-xs text-ink-900">{c.name}</td>
                      <td className="py-2 text-right font-mono text-xs font-semibold text-ink-900">{c.documents.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Configuration() {
  const { systemStatus, version, sessionRemaining } = configuration;
  const [tab, setTab] = useState('logs');
  const [query, setQuery] = useState('');

  // Live MongoDB status (GET /api/admin/system/database). Re-checked every 30s.
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState('');
  const [refreshing, setRefreshing] = useState(true);

  const [logs, setLogs] = useState([]);
  const checkLogs = useCallback(async () => {
    try {
      const raw = await endpoints.getSystemLogs();
      setLogs(raw.map((l) => ({
        time: new Date(l.timestamp).toLocaleString(),
        level: l.level,
        tag: l.tag,
        text: `${l.text}`,
      })));
    } catch {
      // leave the previous logs showing rather than clearing them on a blip
    }
  }, []);

  useEffect(() => { checkLogs(); }, [checkLogs]);
  useAutoRefresh(checkLogs, { intervalMs: 10000 });

  const checkDb = useCallback(async () => {
    setRefreshing(true);
    try {
      setDb(await endpoints.getDatabaseStatus());
      setDbError('');
    } catch (err) {
      setDbError(err.message || "Couldn't reach the server to check the database.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkDb();
  }, [checkDb]);
  useAutoRefresh(checkDb, { intervalMs: 30000 });

  // The "MongoDB Store" card is live; the other cards are still placeholders.
  const dbUp = !dbError && db?.connected;
  const cards = systemStatus.map((s) =>
    s.id !== 'db'
      ? s
      : {
          ...s,
          status: dbError ? 'Offline' : db ? db.status : 'Checking…',
          metrics: [
            { label: 'Storage Used:', value: dbUp ? formatBytes(db.storageSizeBytes) : '—' },
            { label: 'Uptime:', value: dbUp ? formatDuration(db.uptimeSeconds) : '—' },
          ],
        }
  );

  const filteredLogs = useMemo(
    () => (!query ? logs : logs.filter((l) => l.text.toLowerCase().includes(query.toLowerCase()) || l.tag.toLowerCase().includes(query.toLowerCase()))),
    [logs, query]
  );

  return (
    <AdminLayout crumb="Configuration">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">System Configuration</h1>
          <p className="text-sm text-ink-700/60">
            Manage administrative overrides, audit system logs, and notification dispatching logic.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-ink-900">
                  <Icon name={s.icon} size={16} className="text-forest-600" /> {s.label}
                </span>
                <span className={`flex items-center gap-1 text-xs font-semibold uppercase ${STATUS_STYLES[s.status] || 'text-ink-700/50'}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" /> {s.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {s.metrics.map((m) => (
                  <div key={m.label}>
                    <p className="text-ink-700/50">{m.label}</p>
                    <p className="font-mono font-semibold text-ink-900">{m.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-forest-500 bg-forest-50 text-forest-700'
                    : 'border-black/10 text-ink-700/60 hover:bg-sand-100'
                }`}
              >
                <Icon name={t.icon} size={14} /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-sand-100">
              <Icon name="refresh" size={14} /> Sync Config
            </button>
            <button className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-forest-600">
              <Icon name="upload" size={14} /> Save Changes
            </button>
          </div>
        </div>

        {tab === 'logs' ? (
          <Card className="bg-ink-900 p-5 text-white">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">MongoDB Event Store Logs</h2>
                <p className="text-xs text-white/50">Real-time telemetry from the primary database cluster.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative">
                  <span className="sr-only">Filter log patterns</span>
                  <Icon
                    name="search"
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter log patterns..."
                    className="w-48 rounded-md border border-white/15 bg-white/5 py-1.5 pl-7 pr-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-forest-400"
                  />
                </label>
                <button className="flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10">
                  <Icon name="filter" size={13} /> Levels
                </button>
                <button className="flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10">
                  <Icon name="download" size={13} /> Export
                </button>
              </div>
            </div>
            <div className="max-h-80 space-y-2.5 overflow-y-auto thin-scrollbar font-mono text-xs">
              {filteredLogs.map((l, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2">
                  <span className="w-40 flex-shrink-0 text-white/40">{l.time}</span>
                  <span className={`flex-shrink-0 rounded px-1.5 py-0.5 font-semibold ${LEVEL_STYLES[l.level]}`}>
                    {l.level}
                  </span>
                  <span className="flex-shrink-0 text-white/40">[{l.tag}]</span>
                  <span className="min-w-0 flex-1 text-white/80">{l.text}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <p className="text-white/40">{logs.length === 0 ? 'No log entries yet.' : 'No log lines match that filter.'}</p>
              )}
              <p className="text-white/30">&gt; Waiting for incoming log stream...</p>
            </div>
          </Card>
        ) : tab === 'database' ? (
          <DatabasePanel db={db} error={dbError} refreshing={refreshing} onRefresh={checkDb} />
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-ink-700/50">
            <Icon name="info" size={18} className="text-ink-700/30" />
            {TABS.find((t) => t.id === tab)?.label} isn't populated in this demo yet.
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-4 text-xs text-ink-700/50">
          <div className="flex gap-4">
            <button className="hover:text-ink-900">Audit Trail</button>
            <button className="hover:text-ink-900">Security Policy</button>
            <button className="hover:text-ink-900">Cluster Docs</button>
          </div>
          <span>
            {version} • {sessionRemaining}
          </span>
        </div>
      </div>
    </AdminLayout>
  );
}
