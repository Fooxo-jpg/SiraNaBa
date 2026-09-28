export const EMPTY_REPORT_FILTERS = {
  category: '', severity: '', from: '', to: '',
  minFrequency: '', maxFrequency: '',
  issue: '', tower: '', floor: '', unit: '',
};

export const reportStatus = (ticket) => ticket.stage === 'Resolved' ? 'resolved' : ticket.stage === 'Cancelled' ? 'cancelled' : 'active';
export const reportSeverity = (ticket) => !ticket.priority || ticket.priority === 'Loading...' ? 'Pending' : ticket.priority;
export const reportCategory = (ticket) => ticket.category?.trim() || 'Uncategorized';
export const reportIssue = (ticket) => ticket.issueType?.trim() || ticket.title?.trim() || 'Unspecified issue';
const normalize = (value) => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function repeatedTopics(tickets) {
  const topics = new Map();
  for (const ticket of tickets) {
    if (!ticket.issueType?.trim() && !ticket.title?.trim()) continue;
    const key = JSON.stringify([normalize(reportCategory(ticket)), normalize(reportIssue(ticket))]);
    if (!topics.has(key)) topics.set(key, { key, issue: reportIssue(ticket), category: reportCategory(ticket), tickets: [] });
    topics.get(key).tickets.push(ticket);
  }
  return [...topics.values()].filter((topic) => topic.tickets.length > 1)
    .map((topic) => ({ ...topic, tickets: [...topic.tickets].sort((a, b) => (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0)) }))
    .sort((a, b) => b.tickets.length - a.tickets.length || a.issue.localeCompare(b.issue));
}
export const normalizeFloor = (value) => /^\d+$/.test(String(value ?? '').trim()) ? String(Number(value)) : String(value ?? '').trim().toUpperCase();

export function locationPatterns(tickets) {
  const units = [], floors = [];
  for (const topic of repeatedTopics(tickets.filter(hasExactLocation))) {
    const byUnit = new Map(), byFloor = new Map();
    for (const ticket of topic.tickets) {
      const unitKey = JSON.stringify([Number(ticket.tower), normalize(ticket.unit)]);
      const floorKey = JSON.stringify([Number(ticket.tower), reportFloor(ticket)]);
      for (const [map, key] of [[byUnit, unitKey], [byFloor, floorKey]]) {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(ticket);
      }
    }
    const pattern = (key, reports) => ({
      key: `${topic.key}:${key}`, issue: topic.issue, category: topic.category,
      tower: Number(reports[0].tower), floor: reportFloor(reports[0]),
      units: [...new Set(reports.map((t) => normalize(t.unit).toUpperCase()))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      count: reports.length,
      description: reports.find((t) => t.description?.trim())?.description.trim() || '',
    });
    for (const [key, reports] of byUnit) if (reports.length > 1) units.push(pattern(key, reports));
    for (const [key, reports] of byFloor) {
      const group = pattern(key, reports);
      if (group.units.length > 1) floors.push(group);
    }
  }
  const sort = (a, b) => b.count - a.count || a.key.localeCompare(b.key);
  return { units: units.sort(sort), floors: floors.sort(sort) };
}

export function reportDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function ticketFindings(tickets, now = new Date()) {
  if (!tickets.length) return [];
  const findings = [];
  const categories = new Map();
  for (const ticket of tickets) {
    const category = reportCategory(ticket);
    categories.set(category, (categories.get(category) || 0) + 1);
  }
  const ranked = [...categories].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = ranked.filter(([, count]) => count === ranked[0][1]);
  findings.push(top.length === 1
    ? `${top[0][0]} is the most reported category: ${top[0][1]} of ${tickets.length} reports (${Math.round(top[0][1] / tickets.length * 100)}%).`
    : `${top.map(([name]) => name).join(', ')} are tied for the most reports, with ${top[0][1]} each.`);
  const today = reportDate(now);
  const day = 86400000;
  const start = Date.parse(`${today}T00:00:00Z`);
  const recentStart = new Date(start - 6 * day).toISOString().slice(0, 10);
  const previousStart = new Date(start - 13 * day).toISOString().slice(0, 10);
  const dated = tickets.map((ticket) => ({ ticket, date: reportDate(ticket.submittedAt) }))
    .filter(({ date }) => date && date <= today);
  if (dated.length) {
    const recent = dated.filter(({ date }) => date >= recentStart).length;
    const previous = dated.filter(({ date }) => date >= previousStart && date < recentStart).length;
    const comparison = previous ? (recent === previous ? ` Unchanged from the preceding 7 days (${previous}).` : ` ${Math.round(Math.abs(recent - previous) / previous * 100)}% ${recent > previous ? 'more' : 'fewer'} than the preceding 7 days (${previous}).`) : ' The preceding 7 days had no reports.';
    findings.push(`${recent} report${recent === 1 ? '' : 's'} submitted in the last 7 days, including today.${comparison}`);
  }
  const unresolved = dated.filter(({ ticket }) => reportStatus(ticket) === 'active' && !['Fixed Problem', 'Cancelled'].includes(ticket.dispatchStatus))
    .sort((a, b) => Date.parse(a.ticket.submittedAt) - Date.parse(b.ticket.submittedAt));
  if (unresolved.length) {
    const { ticket, date } = unresolved[0];
    const age = Math.floor((start - Date.parse(`${date}T00:00:00Z`)) / day);
    findings.push(`Oldest unresolved report: ${reportIssue(ticket)} (${ticket.id}), submitted ${date}${age > 0 ? ` — ${age} day${age === 1 ? '' : 's'} ago` : ' — today'}.`);
  }
  const missingLocation = tickets.filter((ticket) => !hasExactLocation(ticket)).length;
  if (missingLocation) findings.push(`${missingLocation} report${missingLocation === 1 ? ' has' : 's have'} incomplete location details and cannot be included in unit or floor comparisons.`);
  const missingDate = tickets.length - dated.length;
  if (missingDate) findings.push(`${missingDate} report${missingDate === 1 ? ' is' : 's are'} excluded from time-based findings because the submission date is missing, invalid, or in the future.`);
  return findings;
}

export function reportFloor(ticket) {
  const unit = String(ticket.unit ?? '').trim().toUpperCase();
  const floor = /^\d{3,}$/.test(unit) ? unit.slice(0, -2) : unit.match(/^PH(\d+)(?:-\d+)?$/)?.[1];
  return floor ? floor.replace(/^0+/, '') : '';
}
export function hasExactLocation(ticket) {
  return Number.isInteger(Number(ticket.tower)) && Number(ticket.tower) > 0 && Boolean(reportFloor(ticket)) && Boolean(normalize(ticket.unit));
}

export function issueKey(ticket) {
  // Incomplete locations never merge: sharing an unknown floor is not evidence of a repeat issue.
  if (!hasExactLocation(ticket)) return JSON.stringify(['unconfirmed', ticket.id]);
  return JSON.stringify([normalize(reportCategory(ticket)), normalize(reportIssue(ticket)), Number(ticket.tower), reportFloor(ticket), normalize(ticket.unit)]);
}

export function reportFilterError(filters) {
  if (filters.from && filters.to && filters.from > filters.to) return 'The end date must be on or after the start date.';
  for (const key of ['minFrequency', 'maxFrequency']) {
    if (filters[key] !== '' && (!Number.isInteger(Number(filters[key])) || Number(filters[key]) < 1)) return 'Frequency must be a whole number of at least 1.';
  }
  if (filters.minFrequency !== '' && filters.maxFrequency !== '' && Number(filters.minFrequency) > Number(filters.maxFrequency)) return 'Frequency maximum must be at least the minimum.';
  return '';
}

export function summarizeReports(tickets, filters = EMPTY_REPORT_FILTERS) {
  const error = reportFilterError(filters);
  const candidates = error ? [] : tickets.filter((ticket) => {
    const date = reportDate(ticket.submittedAt);
    return (!filters.category || reportCategory(ticket) === filters.category)
      && (!filters.severity || reportSeverity(ticket) === filters.severity)
      && (!filters.from || (date && date >= filters.from))
      && (!filters.to || (date && date <= filters.to))
      && (!filters.issue || normalize(reportIssue(ticket)).includes(normalize(filters.issue)))
      && (!filters.tower || String(ticket.tower) === filters.tower)
      && (!filters.floor || reportFloor(ticket) === normalizeFloor(filters.floor))
      && (!filters.unit || normalize(ticket.unit) === normalize(filters.unit));
  });
  const grouped = new Map();
  for (const ticket of candidates) {
    const key = issueKey(ticket);
    if (!grouped.has(key)) grouped.set(key, { key, issue: reportIssue(ticket), category: reportCategory(ticket), tower: ticket.tower, floor: reportFloor(ticket), unit: ticket.unit, exact: hasExactLocation(ticket), tickets: [], active: 0, resolved: 0, cancelled: 0 });
    const group = grouped.get(key);
    group.tickets.push(ticket);
    group[reportStatus(ticket)]++;
  }
  const groups = [...grouped.values()].filter((group) => {
    const count = group.tickets.length;
    return (filters.minFrequency === '' || (group.exact && count >= Number(filters.minFrequency)))
      && (filters.maxFrequency === '' || (group.exact && count <= Number(filters.maxFrequency)));
  }).sort((a, b) => b.tickets.length - a.tickets.length || a.issue.localeCompare(b.issue));
  const filtered = groups.flatMap((group) => group.tickets).sort((a, b) => (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0));
  const counts = { active: 0, resolved: 0, cancelled: 0 };
  const categories = new Map();
  for (const ticket of filtered) {
    const category = reportCategory(ticket);
    if (!categories.has(category)) categories.set(category, { category, active: 0, resolved: 0, cancelled: 0, total: 0 });
    counts[reportStatus(ticket)]++;
    categories.get(category)[reportStatus(ticket)]++;
    categories.get(category).total++;
  }
  return { error, tickets: filtered, groups, counts, chart: [...categories.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category)) };
}
