# SiraNaBa Backend (Java / Spring Boot)

A Spring Boot API that replaces `src/data/mockDb.js` and `src/data/mockServer.js`
(now deleted from the front end) with a real MongoDB-backed service, and uses
Google Gemini to triage new maintenance tickets (assessing severity, a safety
note, and an estimated completion time - the "AI triage" the old mock server
stubbed out with `priority: null`).

It implements every route the front end's `src/api/endpoints.js` calls:

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | Sets an httpOnly JWT cookie |
| POST | `/api/auth/logout` | Clears the session cookie |
| GET | `/api/tenant` | Requires a session |
| PATCH | `/api/tenant` | Account Settings > Profile (name, email, phone) |
| GET | `/api/dashboard/summary` | |
| GET | `/api/tickets` | |
| GET | `/api/tickets/categories` | Public - replaces the `db.ticketCategories` import `SubmitRequest.jsx` used to make |
| POST | `/api/tickets` | Runs Gemini triage synchronously before returning the ticket |
| GET | `/api/tickets/:id` | |
| PATCH | `/api/tickets/:id` | |
| GET | `/api/billing` | |
| GET | `/api/notifications` | |
| POST | `/api/notifications/mark-all-read` | |
| PATCH | `/api/notifications/:id/read` | |

## Prerequisites

- Java 17+
- Maven 3.9+ (or use your IDE's built-in Maven)
- A MongoDB instance - either local (`mongodb://localhost:27017`) or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
  (optional - see "Running without Gemini" below)

## Setup

1. Copy the env template and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   - `MONGODB_URI` - your connection string (see "MongoDB setup" below)
   - `GEMINI_API_KEY` - your Gemini key
   - `JWT_SECRET` - any long random string (`openssl rand -base64 48`)
   - `CORS_ALLOWED_ORIGINS` - the Vite dev server origin, default `http://localhost:5173`

2. Run it:

   ```bash
   mvn spring-boot:run
   ```

   The API starts on `http://localhost:8080`. **You do not need to `export` the
   `.env` file yourself** - this project includes [spring-dotenv](https://github.com/paulschwarz/spring-dotenv),
   which loads `.env` automatically on startup (works the same on macOS, Linux
   and Windows). If you'd rather set real environment variables instead of
   using `.env`, that works too - `spring-dotenv` just won't override ones
   that are already set.

On first run, `DataSeeder` populates one demo tenant (Alex Rivers, matching
the old mock data) plus a login user, billing record, and a couple of
notifications - so the app isn't empty. It only seeds when the `tenants`
collection is empty, so it's safe to leave `SEED_DEMO_DATA=true` permanently;
it won't touch real data on later runs.

**Demo login** (from `.env.example`): `alex.rivers@siranaba.com` / `Password123!`

## MongoDB setup

You need a MongoDB instance for `MONGODB_URI` to point at. Two options:

### Option A - Docker (simplest, works the same on every OS)

If you have [Docker](https://www.docker.com/) installed:

```bash
docker run -d --name siranaba-mongo -p 27017:27017 mongo:7
```

That's it - the default `.env.example` value
(`MONGODB_URI=mongodb://localhost:27017/siranaba`) already points at this.
To stop/start it later: `docker stop siranaba-mongo` / `docker start siranaba-mongo`.

### Option B - MongoDB Atlas (free hosted cluster, no local install)

1. Create a free account and cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. In **Database Access**, add a database user with a username/password.
3. In **Network Access**, add your current IP (or `0.0.0.0/0` for local dev
   only - not recommended for production).
4. Click **Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Add a database name to the path and put it in `.env`:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/siranaba?retryWrites=true&w=majority
   ```

### Option C - Local install (no Docker)

Install MongoDB Community Server for your OS from the
[official docs](https://www.mongodb.com/docs/manual/installation/), start
the `mongod` service, and leave `MONGODB_URI` at its default
(`mongodb://localhost:27017/siranaba`) - Spring Data creates the `siranaba`
database and its collections automatically the first time it writes to them.

## Running the front end and backend together with one command

From the **project root** (not `server/`):

```bash
npm install       # first time only - installs `concurrently` among other things
npm run dev:all
```

This starts Vite (`http://localhost:5173`) and the Spring Boot API
(`http://localhost:8080`) together in one terminal, labeled `WEB` and `API`.
Stopping it (Ctrl+C) stops both. Under the hood it's just:

```json
"server": "cd server && mvn spring-boot:run",
"dev:all": "concurrently -n WEB,API -c blue,green \"npm:dev\" \"npm:server\""
```

If you'd rather run them separately (e.g. in two terminal tabs), `npm run dev`
and `npm run server` still work individually.

## Running without Gemini

If `GEMINI_API_KEY` is left blank, ticket creation still works - `GeminiTriageService`
falls back to a small keyword-based heuristic (looks for words like "gas",
"leak", "no heat", etc.) so you can develop and demo without an API key, then
add one later with zero code changes.

## Authentication

Login and route protection are now fully wired end to end:

- `POST /api/auth/login` checks a bcrypt-hashed password and sets an httpOnly
  JWT cookie (`siranaba_token`).
- Every `/api/**` route except `/api/auth/**` and `GET /api/tickets/categories`
  requires a valid session (`SecurityConfig`); an unauthenticated request gets
  a `401` with a JSON `{ "message": "..." }` body.
- `src/App.jsx`'s `RequireAuth` wrapper checks the front end's session on
  every tenant-portal route (`/`, `/maintenance`, `/billing`, `/notifications`,
  `/settings`) and redirects to `/login` if `GET /api/tenant` comes back
  unauthenticated, then sends the user back to the page they wanted after a
  successful sign-in.
- The sidebar's "Sign Out" button calls `POST /api/auth/logout` (clears the
  cookie) and clears local session state.

This is still a **single-tenant demo** in one sense: there's one seeded
`Tenant`/`User` pair, and no self-service signup - to add more logins, insert
additional `User`/`Tenant` documents in MongoDB directly (each `User` has a
`tenantId` pointing at its `Tenant`).

Note: the admin portal's **Tenant Management** and **Building Map** screens use the API (see
"Registering tenants" and "Keeping the tenant and admin sides in sync" below). The other admin
screens still run on `adminMockDb.js`.

## Project layout

```
server/
  pom.xml
  .env.example
  src/main/java/com/siranaba/backend/
    config/       # CORS, Spring Security, typed app.* properties
    security/     # JWT issuing/parsing, auth cookie helper, auth filter
    model/        # MongoDB documents (Tenant, Ticket, Billing, NotificationDoc, User...)
    repository/   # Spring Data MongoDB repositories
    dto/          # Request/response shapes for the REST API
    service/      # Business logic, incl. GeminiTriageService
    controller/   # REST endpoints
    exception/    # ApiException + a @RestControllerAdvice returning {message}
    bootstrap/    # DataSeeder (demo data on first run)
```

## Registering tenants (admin)

`POST /api/admin/tenants` (ADMIN only) is what the admin portal's **Authorize
Registration** button calls. It:

1. creates the tenant record (unit, tower, unit type, lease start, rent),
2. creates a tenant login using the registered email,
3. emails the login details to that address.

The initial password is the initials of the first and last name + tower number +
unit, e.g. Dwane Valencia, Tower 1, Unit 402 -> `DV1402`. The monthly rent is
looked up server-side from the unit type (`UnitPricing.java`); the client can't set it.

`DELETE /api/admin/tenants/{tenantId}` removes the tenant and their login.

To actually send email, set the `MAIL_*` values in `.env` (see `.env.example`). With
`MAIL_HOST` empty the account is still created, and the admin portal shows a notice
that no email was sent.

## Keeping the tenant and admin sides in sync

There is one copy of each tenant: the document in the `tenants` collection (plus its `users` login).
Both portals read and write it, so there's nothing to reconcile.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/admin/tenants` | ADMIN | The Tenant Management table. `payment` (Paid/Pending/Overdue), `occupancy` and `account` are derived from balance, due date and lease start, never stored |
| PATCH | `/api/admin/tenants/{id}` | ADMIN | Edit a tenant's name / email / phone |
| POST | `/api/admin/tenants/{id}/mark-paid` | ADMIN | Clears the balance, adds a transaction to the tenant's billing history, sends them a notification |
| PATCH | `/api/tenant` | TENANT | The tenant editing the same fields from Account Settings |

## Admin Configuration page: live MongoDB info

`GET /api/admin/system/database` (ADMIN only) powers the **MongoDB Store** card and the **Database**
tab on Admin > Configuration. It pings the database and reports the database name, host name(s),
server version, ping latency, data / storage / index sizes, server uptime, and a document count per
collection. The page re-checks every 30 seconds and has a Refresh button.

- The connection string is never returned - only host names and the database name, so the password in
  `MONGODB_URI` can't leak through this endpoint.
- If MongoDB can't be reached, the endpoint still answers `200` with `status: "Offline"` and a short
  message, so the page can show the outage instead of an error.
- Sizes, version and uptime are best-effort: some managed MongoDB tiers (e.g. Atlas shared clusters)
  don't allow `serverStatus`, in which case Uptime shows "—" while everything else still works.

Both PATCH routes go through `TenantProfileService`, so validation is identical: emails are unique
across every login (the admin's included), and changing a tenant's email also changes the email they
sign in with. The tenant's balance, due date and auto-pay flag live on the tenant record;
`GET /api/billing` reads them from there, so the Billing page can't disagree with the dashboard or the
admin table.

Each tenant has a registry ID (`tenantCode`, e.g. `T-0007`) stored on the document. Tenants created
before that field existed are given one automatically the first time the admin list is loaded.

The front end refetches on a 15 second timer and whenever the tab regains focus. If an admin removes a
tenant, that tenant's next refetch fails with 401/404 and they're sent back to the sign-in page.
