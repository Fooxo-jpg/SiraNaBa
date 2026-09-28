import test from 'node:test';
import assert from 'node:assert/strict';
import { triageStats } from './triageStats.js';

test('counts open severe and critical tickets, unassigned tickets, and online staff', () => {
  const result = triageStats([
    { priority: 'Critical', stage: 'Submitted' },
    { priority: 'Severe', stage: 'Assigned', assignedStaffId: 's1' },
    { priority: 'High', stage: 'Assigned', specialist: { name: 'Sam' } },
    { priority: 'Critical', stage: 'Resolved' },
    { priority: 'Severe', stage: 'Submitted', dispatchStatus: 'Cancelled' },
  ], [{ availability: 'online' }, { availability: 'offline' }, { availability: 'away' }]);
  assert.deepEqual(result, { emergencies: 2, unassigned: 1, online: 1, completed: 0 });
});

test('completion uses Philippine day boundaries, ignores later edits and duplicate completion events', () => {
  const done = (timestamp, extra = {}) => ({ stage: 'Resolved', timeline: [{ title: 'Fixed Problem', timestamp }], ...extra });
  const result = triageStats([
    done('2026-09-26T16:00:00Z'),
    done('2026-09-26T15:59:59Z', { updatedAt: '2026-09-27T01:00:00Z' }),
    done('2026-09-27T16:00:00Z'),
    done('2026-09-27T01:00:00Z', { stage: 'Cancelled' }),
    done(null),
    done(null, { timeline: [{ title: 'Fixed Problem', timestamp: '2026-09-25T00:00:00Z' }, { title: 'Fixed Problem', timestamp: '2026-09-27T01:00:00Z' }] }),
  ], [], new Date('2026-09-27T04:00:00Z'));
  assert.equal(result.completed, 1);
});
