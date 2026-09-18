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

## Connecting a real backend

The UI never talks to mock data directly — every screen calls `endpoints.*` in
`src/api/endpoints.js`, which calls the generic `api.get/post/patch/delete` helpers in
`src/api/client.js`. To go live:

1. Set `VITE_API_BASE_URL` in a `.env` file (e.g. `VITE_API_BASE_URL=https://api.siranaba.com`).
2. Implement the REST routes listed in `mockServer.js` on your backend (same paths, same
   request/response shapes) — `/api/tenant`, `/api/dashboard/summary`, `/api/tickets`,
   `/api/tickets/:id`, `/api/billing`, `/api/notifications`, `/api/auth/login`.
3. Remove `src/data/mockDb.js` and `src/data/mockServer.js` once the real API is in place —
   `client.js` only imports them when `VITE_API_BASE_URL` is unset, so nothing else changes.

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
