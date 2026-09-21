import React from 'react';

// Maps any status/priority string we get from the API to a visual tone.
// Extend TONE_MAP as new statuses are introduced server-side.
const TONE_MAP = {
  // ticket stages / generic success states
  completed: 'success',
  successful: 'success',
  resolved: 'success',
  'fixed problem': 'success',
  cancelled: 'neutral',
  escalated: 'danger',
  applied: 'success',
  active: 'success',
  clear: 'success',
  healthy: 'success',
  connected: 'success',
  online: 'success',
  // in-flight states
  'in progress': 'progress',
  scheduled: 'progress',
  assigned: 'progress',
  loading: 'progress',
  'loading...': 'progress',
  degraded: 'progress',
  warning: 'progress',
  submitted: 'neutral',
  informational: 'neutral',
  // priority
  critical: 'danger',
  high: 'danger',
  severe: 'danger',
  medium: 'progress',
  low: 'neutral',
  // payment / account states
  failed: 'danger',
  delinquent: 'danger',
  eviction: 'danger',
  overdue: 'danger',
  paid: 'success',
  pending: 'progress',
  vacating: 'progress',
  'good standing': 'success',
  away: 'progress',
  offline: 'neutral',
};

const TONE_STYLES = {
  success: 'bg-status-successBg text-status-success',
  progress: 'bg-status-progressBg text-status-progress',
  neutral: 'bg-status-lowBg text-status-low',
  danger: 'bg-status-highBg text-status-high',
};

export default function StatusBadge({ label, tone }) {
  const resolvedTone = tone || TONE_MAP[label?.toLowerCase()] || 'neutral';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_STYLES[resolvedTone]}`}
    >
      {label}
    </span>
  );
}
