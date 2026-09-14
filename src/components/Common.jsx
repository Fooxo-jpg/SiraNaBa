import React from 'react';
import Card from './Card.jsx';
import Icon from './Icon.jsx';

export function ProgressBar({ value, max, color = 'bg-forest-500' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sand-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatTile({ icon, iconTone = 'text-forest-600 bg-forest-50', label, value, hint }) {
  return (
    <Card className="p-5">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconTone}`}>
        <Icon name={icon} size={18} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-700/50">{hint}</p>}
    </Card>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-ink-700/50">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-forest-300 border-t-forest-600" />
      {label}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Icon name="alert" size={22} className="text-status-high" />
      <p className="text-sm text-ink-700/70">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-sand-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}
