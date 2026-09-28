import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_REPORT_FILTERS, summarizeReports, reportDate, reportFloor, issueKey, repeatedTopics, locationPatterns, ticketFindings } from './ticketReports.js';

const ticket = (id, overrides = {}) => ({ id, title: 'Kitchen leak', category: 'Plumbing', tower: 1, unit: '402', priority: 'High', stage: 'Submitted', submittedAt: '2026-09-26T16:00:00Z', ...overrides });
const filter = (tickets, filters = {}) => summarizeReports(tickets, { ...EMPTY_REPORT_FILTERS, ...filters });

test('findings compare Philippine calendar weeks and identify the oldest unresolved report', () => {
  const findings = ticketFindings([
    ticket('old', { submittedAt: '2026-09-20T15:59:59Z' }),
    ticket('a', { submittedAt: '2026-09-20T16:00:00Z' }),
    ticket('b', { submittedAt: '2026-09-27T01:00:00Z', stage: 'Resolved' }),
  ], new Date('2026-09-27T04:00:00Z'));
  assert.ok(findings.some((text) => text.includes('3 of 3 reports (100%)')));
  assert.ok(findings.some((text) => text.includes('2 reports submitted') && text.includes('100% more')));
  assert.ok(findings.some((text) => text.includes('(old)') && text.includes('7 days ago')));
});

test('findings handle ties and incomplete records without inventing trends or locations', () => {
  const findings = ticketFindings([ticket('a', { submittedAt: null, unit: null }), ticket('b', { category: 'Electrical', submittedAt: 'invalid', unit: null })]);
  assert.ok(findings.some((text) => text.includes('tied')));
  assert.ok(findings.some((text) => text.includes('2 reports have incomplete location')));
  assert.ok(findings.some((text) => text.includes('2 reports are excluded')));
  assert.ok(!findings.some((text) => text.includes('last 7 days')));
  assert.deepEqual(ticketFindings([]), []);
});

test('location analysis separates repeated units from distinct units sharing a floor', () => {
  const result = locationPatterns([ticket('a'), ticket('b'), ticket('c', { unit: '403', description: 'Water dripping from kitchen pipe.' }), ticket('d', { tower: 2 }), ticket('e', { unit: '502' }), ticket('f', { title: 'Broken light', unit: '404' })]);
  assert.equal(result.units.length, 1);
  assert.equal(result.units[0].count, 2);
  assert.deepEqual(result.units[0].units, ['402']);
  assert.equal(result.floors.length, 1);
  assert.deepEqual(result.floors[0].units, ['402', '403']);
  assert.equal(result.floors[0].count, 3);
  assert.equal(result.floors[0].description, 'Water dripping from kitchen pipe.');
});

test('analysis excludes incomplete locations and does not treat repeat reports in one unit as a floor pattern', () => {
  assert.deepEqual(locationPatterns([ticket('a', { unit: null }), ticket('b', { unit: null })]), { units: [], floors: [] });
  assert.equal(locationPatterns([ticket('a'), ticket('b')]).floors.length, 0);
  assert.deepEqual(locationPatterns([ticket('a')]), { units: [], floors: [] });
});

test('repeated topics include different locations and statuses, but exclude single topics and categories', () => {
  const data = [ticket('a'), ticket('b', { title: ' KITCHEN   LEAK ', tower: 2, unit: '1203', tenantId: 'resident-b', stage: 'Resolved', submittedAt: '2026-09-28T00:00:00Z' }), ticket('c', { title: 'Broken light' }), ticket('d', { category: 'General' }), ticket('e', { title: '', issueType: '' })];
  const topics = repeatedTopics(data);
  assert.equal(topics.length, 1);
  assert.deepEqual(topics[0].tickets.map((item) => item.id), ['b', 'a']);
  assert.equal(topics[0].tickets[0].tenantId, 'resident-b');
  assert.equal(topics[0].tickets[0].unit, '1203');
  assert.equal(repeatedTopics([]).length, 0);
});

test('shared issue labels group differently titled reports', () => {
  assert.equal(repeatedTopics([ticket('a', { issueType: 'Water leak' }), ticket('b', { title: 'Bathroom dripping', issueType: 'water leak' })])[0].tickets.length, 2);
});

test('all stages share the same chart and summary, including resolved history', () => {
  const data = [ticket('a'), ticket('b', { stage: 'Resolved' }), ticket('c', { stage: 'Cancelled' }), ticket('d', { category: 'Electrical', stage: 'In Progress' })];
  const result = filter(data);
  assert.deepEqual(result.counts, { active: 2, resolved: 1, cancelled: 1 });
  assert.equal(result.chart.reduce((sum, row) => sum + row.total, 0), result.tickets.length);
  assert.deepEqual(result.chart[0], { category: 'Plumbing', total: 3, active: 1, resolved: 1, cancelled: 1 });
});

test('frequency distinguishes every tower, floor, unit and specific issue', () => {
  const data = [ticket('a'), ticket('b', { title: ' KITCHEN   leak ', floorNumber: '04', stage: 'Resolved' }), ticket('c', { tower: 2 }), ticket('d', { unit: '502' }), ticket('e', { unit: '403' }), ticket('f', { title: 'Toilet leak' }), ticket('g', { category: 'General' })];
  const result = filter(data, { minFrequency: '2' });
  assert.deepEqual(result.tickets.map((t) => t.id), ['a', 'b']);
  assert.equal(result.groups[0].resolved, 1);
  assert.equal(result.groups[0].tickets.length, 2);
});

test('missing units never create fabricated repeat counts', () => {
  const data = [ticket('a', { unit: null }), ticket('b', { unit: null })];
  assert.notEqual(issueKey(data[0]), issueKey(data[1]));
  assert.equal(filter(data).groups.length, 2);
  assert.equal(filter(data, { minFrequency: '1' }).tickets.length, 0);
});

test('date ranges include the entire end date in Philippine time', () => {
  assert.equal(reportDate('2026-09-26T16:00:00Z'), '2026-09-27');
  const result = filter([ticket('a'), ticket('b', { submittedAt: '2026-09-27T15:59:59Z' }), ticket('c', { submittedAt: '2026-09-27T16:00:00Z' }), ticket('d', { submittedAt: null })], { from: '2026-09-27', to: '2026-09-27' });
  assert.deepEqual(result.tickets.map((t) => t.id), ['b', 'a']);
});

test('floors are derived from the unit even on older reports or after a unit change', () => {
  for (const [unit, expected] of [['405', '4'], ['1203', '12'], ['2410', '24'], [' 0405 ', '4'], ['PH25', '25'], ['PH26-1', '26'], ['unknown', ''], [null, '']]) {
    assert.equal(reportFloor({ unit, floorNumber: '99' }), expected);
  }
  const result = filter([ticket('a', { unit: '405', floorNumber: null }), ticket('b', { unit: '1203', floorNumber: '4' })], { floor: '12' });
  assert.deepEqual(result.tickets.map((t) => t.id), ['b']);
  assert.equal(result.groups[0].floor, '12');
});
test('combined filters count frequency only within the selected reports', () => {
  const data = [ticket('a'), ticket('b', { priority: 'Low' }), ticket('c', { category: 'Electrical' })];
  assert.equal(filter(data, { severity: 'High', minFrequency: '2' }).tickets.length, 0);
  const result = filter(data, { category: 'Plumbing', severity: 'High', from: '2026-09-27', to: '2026-09-27', minFrequency: '1', maxFrequency: '1', tower: '1', floor: '04', unit: '402', issue: 'kitchen' });
  assert.equal(result.tickets.length, 1);
  assert.equal(result.chart[0].total, 1);
});

test('invalid bounds produce a clear error; empty selections stay empty', () => {
  for (const filters of [{ from: '2026-10-01', to: '2026-09-01' }, { minFrequency: '3', maxFrequency: '2' }, { minFrequency: '1.5' }, { minFrequency: '0' }]) assert.ok(filter([ticket('a')], filters).error);
  const result = filter([], {});
  assert.deepEqual(result.chart, []);

});
