import React from 'react';
import Card from '../Card.jsx';
import Icon from '../Icon.jsx';

const TONE_STYLES = {
  danger: 'bg-status-highBg text-status-high',
  success: 'bg-status-successBg text-status-success',
  neutral: 'bg-sand-100 text-ink-700/60',
};

const DELTA_STYLES = {
  danger: 'text-status-high',
  success: 'text-status-success',
  neutral: 'text-ink-700/50',
};

export default function StatCard({ label, value, delta, tone = 'neutral', icon }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        {icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-md ${TONE_STYLES[tone]}`}>
            <Icon name={icon} size={16} />
          </div>
        )}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
      {delta && <p className={`mt-0.5 text-xs font-medium ${DELTA_STYLES[tone]}`}>{delta}</p>}
    </Card>
  );
}
