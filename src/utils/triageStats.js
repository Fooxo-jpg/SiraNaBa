import { reportDate } from './ticketReports.js';

export const isTicketAssigned = (ticket) => Boolean(ticket.assignedStaffId?.trim()
  || (ticket.specialist?.name?.trim() && ticket.specialist.name.trim().toLowerCase() !== 'unassigned'));
export const isTicketOpen = (ticket) => !['Resolved', 'Cancelled'].includes(ticket.stage)
  && !['Fixed Problem', 'Cancelled'].includes(ticket.dispatchStatus);

export function triageStats(tickets, staff, now = new Date()) {
  const today = reportDate(now);
  return {
    emergencies: tickets.filter((t) => isTicketOpen(t) && ['critical', 'severe'].includes(t.priority?.trim().toLowerCase())).length,
    unassigned: tickets.filter((t) => isTicketOpen(t) && !isTicketAssigned(t)).length,
    online: staff.filter((s) => s.availability === 'online').length,
    completed: tickets.filter((t) => {
      if (t.stage === 'Cancelled' || t.dispatchStatus === 'Cancelled') return false;
      if (t.stage !== 'Resolved' && t.dispatchStatus !== 'Fixed Problem') return false;
      // Use actual completion history, not updatedAt (which can change after completion).
      const completedAt = (t.timeline || [])
        .filter((e) => ['Fixed Problem', 'Resolved'].includes(e.title) && reportDate(e.timestamp))
        .map((e) => Date.parse(e.timestamp)).sort((a, b) => a - b)[0];
      return completedAt != null && reportDate(completedAt) === today;
    }).length,
  };
}
