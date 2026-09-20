# SiraNaBa Facility Portal

A responsive, production-ready front end for the SiraNaBa tenant portal, built with React,
React Router, and Tailwind CSS. It implements the six screens from the design:

- **Dashboard / Home** — balance, active tickets, utility usage, recent activity
- **Maintenance & Live Ticket Tracking** — ticket list, stage tracker, timeline
- **Submit Maintenance Request** — 4-step form (Details → Location → Severity → Review)
- **Billing & Payments Center** — balance, utility breakdowns, transaction history
- **Notification Center** — filterable, paginated alert feed
- **Administrative Sign-In** — standalone admin auth screen

## Getting started

```bash
npm install
npm run dev       # starts a local dev server on http://localhost:5173
npm run build     # production build to /dist
npm run preview   # serve the production build locally
```

## Project structure

```
src/
  api/
    client.js        # single fetch wrapper — swap BASE_URL to point at a real backend
    endpoints.js      # typed functions for every API call the UI makes
  context/
    SessionContext.jsx  # loads/exposes the signed-in tenant profile app-wide
  data/
    mockDb.js         # seed data shaped exactly like real API responses
    mockServer.js      # simulates REST endpoints over the seed data (dev-only)
  components/          # Sidebar, Topbar, Layout, Card, StatusBadge, DataTable, Modal, Icon…
  pages/                # one file per route/screen
  utils/format.js       # currency/date/time formatting helpers
```

## Backend

The mock data layer (`src/data/mockDb.js`, `src/data/mockServer.js`) has been removed.
Every screen calls `endpoints.*` in `src/api/endpoints.js`, which calls the generic
`api.get/post/patch/delete` helpers in `src/api/client.js`, which now talk to a real
Java (Spring Boot) API backed by MongoDB — see **`server/README.md`** for setup.

That backend also integrates **Google Gemini** to triage new maintenance tickets
(assessing severity, a safety note, and an estimated completion time) when a tenant
submits a request.

Quick start (one command for both):

```bash
npm install
cp server/.env.example server/.env   # fill in MONGODB_URI, GEMINI_API_KEY, JWT_SECRET
npm run dev:all                      # runs Vite + Spring Boot together
```

See `server/README.md` for MongoDB setup options (Docker, Atlas, or a local
install) and Gemini API key setup. Prefer to run them separately? `npm run dev`
(front end) and `npm run server` (backend) still work on their own.

Demo login seeded on first backend run: `alex.rivers@siranaba.com` / `Password123!`

**Tenant data is shared between the tenant portal and the admin portal.** Admin > Tenant
Management (and the Building Map) read the same MongoDB `tenants` records the tenant portal uses,
via `GET /api/admin/tenants`. Editing a tenant on either side (name, email, phone; and rent
payment status from the admin side) updates that one record, and the other side picks it up within
~15 seconds or as soon as its tab regains focus (see `src/utils/useAutoRefresh.js`). Staff Management
works the same way: it reads/writes the MongoDB `staff` collection via `GET/POST/PATCH/DELETE
/api/admin/staff` (see `StaffController`/`StaffService` on the backend), so adding, editing, or
removing a staff member persists for real instead of resetting on refresh. The remaining admin
screens (Command Center, Triage, Configuration, IoT) still run on `src/data/adminMockDb.js`.

## Responsive behavior

- Sidebar becomes a slide-in drawer (triggered by the hamburger icon in the top bar) below
  the `lg` breakpoint.
- Grids in Dashboard, Billing, and Notifications collapse from 3–4 columns down to 1–2 columns
  on narrow viewports.
- All interactive targets keep a minimum comfortable tap size and visible keyboard focus rings.

## Components

- `StatusBadge` — maps any status/priority string to a consistent color tone (success,
  progress, neutral, danger). Extend `TONE_MAP` in `StatusBadge.jsx` for new statuses.
- `DataTable` — generic column/row renderer used by the transaction history table.
- `Modal` — accessible dialog (focus trap, Escape to close) ready for confirmation flows.
- `Card` — the shared surface/elevation style used across every screen.
