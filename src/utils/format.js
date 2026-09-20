export function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// Philippine peso, no decimals for whole amounts (e.g. "₱15,000").
export function formatPhp(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDate(isoString, options) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString(
    'en-US',
    options || { month: 'short', day: 'numeric', year: 'numeric' }
  );
}

export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// 20480 -> "20 KB", 1536000 -> "1.5 MB". Null (not reported) -> "—".
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = -1;
  do {
    value /= 1024;
    i += 1;
  } while (value >= 1024 && i < units.length - 1);
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

// 93784 -> "1d 2h", 5400 -> "1h 30m", 90 -> "1m". Null (not reported) -> "—".
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

// Payment timestamps are shown in Philippine time no matter where the admin/tenant's device is.
// Returns { date: "September 20, 2026", time: "12:15:30 PM" }.
export function formatPaidAt(isoString, fallbackDate) {
  if (!isoString) {
    return { date: fallbackDate ? formatDate(fallbackDate + 'T00:00:00') : '—', time: '—' };
  }
  const d = new Date(isoString);
  return {
    date: d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' }),
    time: d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Manila' }),
  };
}
