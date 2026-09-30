import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import { useTenantRegistry } from '../../context/TenantRegistryContext.jsx';
import Icon from '../../components/Icon.jsx';
import { endpoints } from '../../api/endpoints.js';
import { useAutoRefresh } from '../../utils/useAutoRefresh.js';
import { formatBytes, formatDuration, formatRelativeTime } from '../../utils/format.js';
import { useToast } from '../../context/ToastContext.jsx';

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

const DEFAULT_TEST_FORM = {
  tenantCount: 5, staffCount: 3, createTickets: true, minTicketsPerTenant: 1,
  maxTicketsPerTenant: 4, severity: 'Mixed', randomTicketProgress: true,
  createNotifications: true, replaceGeneratedData: true,
  randomizeAccountStatus: true, randomizeRoomAllocation: true,
};

function TestingDataPanel({ disabled, onGenerated }) {
  const { notify } = useToast();
  const [form, setForm] = useState(DEFAULT_TEST_FORM);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(false);
  const [progress, setProgress] = useState(0);
  const number = (field) => (event) => { setPreview(false); setForm((current) => ({ ...current, [field]: Number(event.target.value) })); };
  const toggle = (field) => (event) => { setPreview(false); setForm((current) => ({ ...current, [field]: event.target.checked })); };

  const generate = async (event) => {
    event.preventDefault();
    if (!preview) { setPreview(true); setError(''); return; }
    setGenerating(true); setProgress(8); setError(''); setResult(null);
    const timer = window.setInterval(() => setProgress((value) => Math.min(value + Math.max(2, Math.round((90 - value) / 5)), 90)), 450);
    try {
      const created = await endpoints.generateTestData(form);
      setProgress(100);
      setResult(created);
      notify(`Generated ${created.tenantsCreated} tenants, ${created.staffCreated} staff, and ${created.ticketsCreated} tickets.`);
      await onGenerated();
    } catch (err) {
      setError(err.message || "Couldn't generate test data.");
      notify(err.message || "Couldn't generate test data.", { tone: 'error' });
    } finally { window.clearInterval(timer); setGenerating(false); }
  };

  return (
    <Card className="border border-status-progress/20 p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-ink-900">Testing data generator</h2>
        <p className="mt-1 text-sm text-ink-700/70">Create database-backed dummy tenants, working portal logins, staff, notifications, and maintenance tickets. Generated records are tagged so they can be replaced without touching real data.</p>
      </div>
      <form onSubmit={generate} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink-900">Tenants with fake accounts
            <input type="number" min="0" max="100" value={form.tenantCount} onChange={number('tenantCount')} className="mt-1 block w-full rounded-md border border-black/10 px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-ink-700/50">0–100, limited by vacant units</span>
          </label>
          <label className="text-sm font-medium text-ink-900">Maintenance staff
            <input type="number" min="0" max="50" value={form.staffCount} onChange={number('staffCount')} className="mt-1 block w-full rounded-md border border-black/10 px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-ink-700/50">0–50 randomized staff records</span>
          </label>
        </div>

        <label className="flex items-start gap-2 rounded-lg bg-sand-50 p-3 text-sm text-ink-900">
          <input type="checkbox" checked={form.createTickets} onChange={toggle('createTickets')} className="mt-0.5 accent-forest-500" />
          <span><strong>Create dummy tickets per tenant</strong><span className="block text-xs font-normal text-ink-700/50">Tickets use realistic categories, submission dates, locations, and optional status variation.</span></span>
        </label>
        {form.createTickets && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold text-ink-700/60">Minimum
              <input type="number" min="0" max="20" value={form.minTicketsPerTenant} onChange={number('minTicketsPerTenant')} className="mt-1 block w-full rounded-md border border-black/10 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-ink-700/60">Maximum
              <input type="number" min="0" max="20" value={form.maxTicketsPerTenant} onChange={number('maxTicketsPerTenant')} className="mt-1 block w-full rounded-md border border-black/10 px-3 py-2 text-sm" />
            </label>
            <label className="col-span-2 text-xs font-semibold text-ink-700/60">Severity
              <select value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))} className="mt-1 block w-full rounded-md border border-black/10 px-3 py-2 text-sm">
                {['Mixed', 'Low', 'Medium', 'High', 'Severe', 'Critical'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
        )}

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomTicketProgress} onChange={toggle('randomTicketProgress')} disabled={!form.createTickets} className="accent-forest-500" /> Random ticket progress</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.createNotifications} onChange={toggle('createNotifications')} className="accent-forest-500" /> Welcome notifications</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeAccountStatus} onChange={toggle('randomizeAccountStatus')} className="accent-forest-500" /> Random account statuses</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeRoomAllocation} onChange={toggle('randomizeRoomAllocation')} className="accent-forest-500" /> Random vacant-room allocation</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.replaceGeneratedData} onChange={toggle('replaceGeneratedData')} className="accent-forest-500" /> Replace old test data</label>
        </div>

        <p className="text-xs text-ink-700/50">Ticket minimum and maximum are applied separately to every generated tenant. Random ticket progress creates pending, coordinating, dispatched, and completed work orders using the generated staff. Random account statuses produce active, scheduled, pending, and overdue examples backed by real billing records.</p>

        <div className="rounded-md bg-status-progressBg p-3 text-xs text-status-progress">
          Dummy tenant emails use the reserved <strong>example.test</strong> domain. They work as portal usernames but do not send mail to real people. Every generated tenant uses the shared password shown after generation.
        </div>
        {preview && !generating && !result && <div className="rounded-lg border border-forest-200 bg-forest-50 p-4 text-sm"><p className="font-semibold text-forest-800">Generation preview</p><ul className="mt-2 space-y-1 text-ink-700/70"><li>{form.tenantCount} tenant account(s) in vacant units</li><li>{form.staffCount} maintenance staff record(s)</li><li>{form.createTickets ? `${form.minTicketsPerTenant}–${form.maxTicketsPerTenant} tickets per tenant (${form.tenantCount * form.minTicketsPerTenant}–${form.tenantCount * form.maxTicketsPerTenant} total)` : 'No tickets'}</li><li>{form.createNotifications ? `${form.tenantCount} welcome notification(s)` : 'No welcome notifications'}</li><li>{form.replaceGeneratedData ? 'Previously generated test records will be removed first' : 'Existing generated records will be kept'}</li></ul><p className="mt-3 text-xs font-semibold text-forest-700">Review these values, then confirm generation below.</p></div>}
        {generating && <div role="status" aria-live="polite"><div className="mb-1 flex justify-between text-xs font-semibold text-ink-700/60"><span>{progress < 25 ? 'Preparing records…' : progress < 60 ? 'Creating accounts and staff…' : progress < 95 ? 'Creating tickets and notifications…' : 'Finalizing…'}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-forest-500 transition-all" style={{ width: `${progress}%` }} /></div></div>}
        {error && <p role="alert" className="rounded-md bg-status-highBg p-3 text-sm text-status-high">{error}</p>}
        {result && (
          <div role="status" className="rounded-lg border border-status-success/20 bg-status-successBg p-4 text-sm text-ink-900">
            <p className="font-semibold text-status-success">Test data generated successfully</p>
            <p className="mt-1">{result.tenantsCreated} tenants · {result.staffCreated} staff · {result.ticketsCreated} tickets · {result.notificationsCreated} notifications</p>
            <p className="mt-2">Shared test password: <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">{result.sharedPassword}</code></p>
            {result.removedGeneratedRecords > 0 && <p className="mt-1 text-xs text-ink-700/60">Removed {result.removedGeneratedRecords} previously generated records first.</p>}
            {result.sampleAccounts.length > 0 && <div className="mt-3 max-h-36 overflow-y-auto rounded bg-white p-2 font-mono text-xs">{result.sampleAccounts.map((account) => <p key={account.email}>{account.email} · Unit {account.unit}</p>)}</div>}
          </div>
        )}
        <button type="submit" disabled={disabled || generating || (form.tenantCount === 0 && form.staffCount === 0)} className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-50">
          {generating ? 'Generating…' : preview ? 'Confirm and generate' : 'Preview generation'}
        </button>
      </form>
    </Card>
  );
}

export default function Configuration() {
  const P = '—';
  const systemStatus = [
    { id: 'broker', label: 'Event Broker', status: P, icon: 'bolt', metrics: [{ label: 'Queue Depth:', value: P }, { label: 'Throughput:', value: P }] },
    { id: 'db', label: 'MongoDB Store', status: P, icon: 'database', metrics: [{ label: 'Storage Used:', value: P }, { label: 'Uptime:', value: P }] },
    { id: 'dispatch', label: 'Dispatch Cluster', status: P, icon: 'trend', metrics: [{ label: 'Nodes Online:', value: P }, { label: 'Failover:', value: P }] },
  ];
  const version = P;
  const sessionRemaining = P;
  const [tab, setTab] = useState('logs');
  const [query, setQuery] = useState('');
  const { clearAfterDatabaseCleanup, reload: reloadTenants } = useTenantRegistry();
  const [cleanOpen, setCleanOpen] = useState(false);
  const [cleanPassword, setCleanPassword] = useState('');
  const [cleanConfirmation, setCleanConfirmation] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [cleanError, setCleanError] = useState('');
  const [cleanResult, setCleanResult] = useState(null);

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

  const closeClean = () => {
    if (cleaning) return;
    setCleanOpen(false);
    setCleanPassword('');
    setCleanConfirmation('');
    setCleanError('');
  };
  const cleanDatabase = async (event) => {
    event.preventDefault();
    if (cleaning || cleanConfirmation !== 'DELETE ALL DATA' || !cleanPassword || !db?.connected || dbError) return;
    setCleaning(true);
    setCleanError('');
    setCleanResult(null);
    try {
      const result = await endpoints.cleanDatabase({ password: cleanPassword, confirmation: cleanConfirmation, database: db.database });
      clearAfterDatabaseCleanup();
      setLogs([]);
      setCleanResult(result);
      setCleanOpen(false);
      setCleanConfirmation('');
      await checkDb();
    } catch (error) {
      setCleanError(error.status && error.status < 500 ? error.message : `${error.message || 'Cleanup could not be confirmed.'} If the connection was interrupted, check the Database tab before retrying; some data may already have been deleted.`);
    } finally {
      setCleanPassword('');
      setCleaning(false);
    }
  };

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
        ) : tab === 'advanced' ? (
          <div className="space-y-6">
          <Card className="border border-status-high/20 p-5">
            <h2 className="font-semibold text-ink-900">Clean database</h2>
            <p className="mt-2 text-sm text-ink-700/70">Permanently delete all application data from <strong>{db?.database || 'the connected database'}</strong>, including tenants and their logins, staff, tickets, attachments, billing, payments, notifications, and logs. All admin login accounts and passwords will be kept.</p>
            <p className="mt-2 text-sm text-status-high">This cannot be undone in the app. Restore from a database backup if recovery is needed.</p>
            {cleanResult && <p role="status" className="mt-3 text-sm text-status-success">Cleanup complete: {cleanResult.deletedDocuments} records deleted; {cleanResult.preservedAdmins} admin accounts preserved.</p>}
            <button type="button" disabled={!db?.connected || !!dbError || cleaning} onClick={() => { setCleanResult(null); setCleanOpen(true); }} className="mt-4 rounded-md bg-status-high px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Clean database…</button>
            {(!db?.connected || dbError) && <p className="mt-2 text-xs text-ink-700/60">A confirmed database connection is required. Refresh the Database tab to check it.</p>}
          </Card>
          <TestingDataPanel disabled={!db?.connected || !!dbError} onGenerated={async () => { await Promise.all([checkDb(), checkLogs(), reloadTenants()]); }} />
          </div>
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
      <Modal open={cleanOpen} onClose={closeClean} title="Permanently clean database?" footer={<>
        <button type="button" onClick={closeClean} disabled={cleaning} className="rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
        <button type="submit" form="database-cleanup" disabled={cleaning || cleanConfirmation !== 'DELETE ALL DATA' || !cleanPassword || !db?.connected || !!dbError} className="rounded-md bg-status-high px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{cleaning ? 'Cleaning…' : 'Delete all data except admins'}</button>
      </>}>
        <form id="database-cleanup" onSubmit={cleanDatabase} className="space-y-4">
          <p>Database: <strong>{db?.database}</strong>. Every application record except admin accounts will be permanently deleted. Demo data will not be recreated on restart.</p>
          <label className="block">Current admin password<input type="password" autoComplete="current-password" required disabled={cleaning} value={cleanPassword} onChange={(event) => setCleanPassword(event.target.value)} className="mt-1 block w-full rounded-md border border-black/20 px-3 py-2" /></label>
          <label className="block">Type <strong>DELETE ALL DATA</strong> to confirm<input autoComplete="off" required disabled={cleaning} value={cleanConfirmation} onChange={(event) => setCleanConfirmation(event.target.value)} className="mt-1 block w-full rounded-md border border-black/20 px-3 py-2" /></label>
          {cleaning && <p role="status">Waiting for active work to finish, then cleaning. Keep this page open.</p>}
          {cleanError && <p role="alert" className="text-status-high">{cleanError}</p>}
        </form>
      </Modal>
    </AdminLayout>
  );
}
