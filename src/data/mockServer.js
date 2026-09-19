import { db } from './mockDb.js';

const LATENCY_MS = 280;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function matchTicketDetail(path) {
  const match = path.match(/^\/api\/tickets\/([\w-]+)$/);
  return match ? match[1] : null;
}

/**
 * mockRequest stands in for a real backend. Every route mirrors a REST
 * endpoint a production API would expose - swap ./client.js's BASE_URL to
 * point at that API and this file becomes dead code.
 */
export async function mockRequest(path, options = {}) {
  await wait(LATENCY_MS);
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;

  if (path === '/api/tenant' && method === 'GET') {
    return clone(db.tenant);
  }

  if (path === '/api/dashboard/summary' && method === 'GET') {
    return clone({
      tenant: db.tenant,
      utilityUsage: db.utilityUsage,
      managementTools: db.managementTools,
      recentActivity: db.recentActivity,
      activeTicketCount: db.tickets.filter((t) => t.stage !== 'Resolved').length,
      nextScheduledMaintenance: { label: 'Quarterly HVAC Check', date: '2024-10-28' },
    });
  }

  if (path === '/api/tickets' && method === 'GET') {
    return clone({ tickets: db.tickets, serviceHealth: db.serviceHealth });
  }

  if (path === '/api/tickets' && method === 'POST') {
    const newTicket = {
      id: `TKT-${Math.floor(2000 + Math.random() * 900)}`,
      stage: 'Submitted',
      priority: null, // Severity is assessed by AI triage; null renders as "Loading" until then.
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      specialist: {
        name: 'Unassigned',
        title: '',
        rating: 0,
        reviewCount: 0,
        eta: null,
        status: 'Not started',
        phone: null,
      },
      attachments: [],
      timeline: [
        {
          id: 'tl_new',
          title: 'Ticket Received',
          detail: 'Your request was successfully logged into our system and prioritized.',
          timestamp: new Date().toISOString(),
        },
      ],
      ...body,
    };
    db.tickets.unshift(newTicket);
    return clone(newTicket);
  }

  const ticketId = matchTicketDetail(path);
  if (ticketId && method === 'GET') {
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    return clone(ticket);
  }

  if (ticketId && method === 'PATCH') {
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    Object.assign(ticket, body);
    ticket.updatedAt = new Date().toISOString();
    return clone(ticket);
  }

  if (path === '/api/billing' && method === 'GET') {
    return clone(db.billing);
  }

  if (path === '/api/notifications' && method === 'GET') {
    return clone(db.notifications);
  }

  if (path === '/api/notifications/mark-all-read' && method === 'POST') {
    db.notifications.forEach((n) => (n.read = true));
    return clone(db.notifications);
  }

  const notifId = path.match(/^\/api\/notifications\/([\w-]+)\/read$/);
  if (notifId && method === 'PATCH') {
    const notif = db.notifications.find((n) => n.id === notifId[1]);
    if (notif) notif.read = true;
    return clone(notif);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    if (!body?.email || !body?.password) {
      throw new Error('Email and password are required.');
    }
    return { token: 'mock-session-token', email: body.email };
  }

  throw new Error(`No mock handler for ${method} ${path}`);
}
