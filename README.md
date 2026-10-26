# Role-Based Forms & Metrics Dashboard

A full-stack web app where **agents** submit customer sample forms, each form moves through a defined **status lifecycle**, and a **live dashboard** shows metrics for whoever is signed in. An **admin** manages a variable number of agents, reviews their submissions, and can view any single agent, any group of agents, or all agents combined. Every permission and every metric is enforced and computed on the server.

**Features at a glance**

- Login for two roles (Admin, Agent) with secure, httpOnly cookie sessions
- Submission form with live "amount due", validated by the same rules in the browser and the API
- Five statuses with server-enforced transitions and a full status history per submission
- Payments, admin review actions (complete / send back / reject) and resubmission
- Agent management for admins (add, edit, deactivate, reset password)
- Dashboard: 8 KPI cards and 8 charts, filters (date range, status, agents), auto-refresh every 30 s plus a Refresh button
- 7 themes including light, dark and a custom pastel beige, saved per user
- Responsive layout, accessible forms, a table view behind every chart

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript 5.9 (strict) across the whole repo |
| Monorepo | npm workspaces: `backend`, `frontend`, `shared` |
| Backend | Node.js, Express 5, Prisma 6 (ORM + migrations), Zod 4 (validation) |
| Database | PostgreSQL (CHECK constraints and a generated column in the migrations) |
| Auth | bcrypt password hashing, JWT access token + rotating refresh token in httpOnly cookies |
| Security | helmet, CORS allow-list, express-rate-limit, CSRF header check |
| Logging | pino / pino-http (passwords, tokens and cookies redacted) |
| Frontend | React 19, Vite 6, React Router 7, TanStack Query 5, React Hook Form 7 |
| Styling | Tailwind CSS 4 + daisyUI 5 themes, lucide-react icons |
| Charts | Recharts 3 |
| Shared | `shared` package: Zod schemas, constants and types used by both apps |
| Tooling | ESLint 9, Prettier 3, nodemon + tsx (backend dev), tsup (backend build) |
| Tests / CI | Vitest + Supertest against a real PostgreSQL; GitHub Actions on every PR |

---

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | **22.x** (tested with 22.9; CI uses 22) | Includes npm |
| npm | 10.x | Comes with Node 22 |
| PostgreSQL | 15 or newer (tested with 17) | Running locally on port 5432; you need the superuser (`postgres`) password once |
| Git | any recent version | |

No Docker and no global packages are needed. The commands below work in PowerShell, Git Bash, macOS and Linux shells unless noted.

---

## Environment variables

Two example files are committed. Copy them and edit the copies; the real `.env` files are git-ignored and must never be committed.

### `backend/.env` (copy of `backend/.env.example`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection for the app's own role, e.g. `postgresql://forms_app:YOUR_PASSWORD@localhost:5432/forms_db?schema=public`. The setup step creates this role and database from this URL. |
| `JWT_ACCESS_SECRET` | **Yes** | - | Secret for signing access tokens, at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NODE_ENV` | No | `development` | `development`, `test` or `production` |
| `PORT` | No | `4000` | Port of the API server |
| `LOG_LEVEL` | No | `info` | pino log level (`fatal` … `trace`, or `silent`) |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend origin allowed by CORS. On Render it defaults to the service's own URL (`RENDER_EXTERNAL_URL`) |
| `KEEP_ALIVE_URL` | No | Render's `RENDER_EXTERNAL_URL` | Public URL the keep-alive job pings every 14 minutes (`/api/v1/health`) so Render's free plan doesn't sleep. Unset (off) locally |
| `ACCESS_TOKEN_TTL_MINUTES` | No | `15` | Lifetime of the access token |
| `REFRESH_TOKEN_TTL_DAYS` | No | `7` | Lifetime of a login session (refresh token) |
| `BCRYPT_SALT_ROUNDS` | No | `12` | Password hashing cost (4–15) |
| `COOKIE_SECURE` | No | `false` | `true` sends cookies over HTTPS only; set `true` in production |
| `SEED_ADMIN_EMAIL` | No | `admin@example.com` | Admin login created by the seed |
| `SEED_ADMIN_PASSWORD` | No | `Admin@12345` | Admin password set by the seed |
| `SEED_AGENT_PASSWORD` | No | `Agent@12345` | Password set for every seeded agent |

The server validates these at startup and stops with a clear message if one is missing or invalid.

### `frontend/.env` (optional, copy of `frontend/.env.example`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | No | `/api/v1` | Base URL of the API. In development, Vite forwards `/api` to `http://localhost:4000`, so the default works as is. Anything starting with `VITE_` is public; never put secrets here. |

---

## Local setup, step by step

Run every command from the **repository root** unless stated otherwise.

**1. Clone and install**

```bash
git clone https://github.com/Bindubhargavi37/Role_Based_Access_Control.git
cd Role_Based_Access_Control
npm install
```

**2. Create the env files**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

(PowerShell: `Copy-Item backend/.env.example backend/.env`, and the same for the frontend.)

Open `backend/.env` and set:

- `DATABASE_URL`: replace `change-me` with a password of your choice for the new `forms_app` role. Keep the rest.
- `JWT_ACCESS_SECRET`: paste a random string of 32+ characters (see the command in the table above).

**3. Create the database role and database** (once)

This creates the `forms_app` role (with permission to create databases, used by the tests) and the `forms_db` database, using the values from `DATABASE_URL`. It is safe to run more than once.

- **Windows** (asks for the `postgres` superuser password):

  ```bash
  npm run db:create
  ```

- **macOS / Linux**: run the same SQL with `psql`, passing the user, password and database from your `DATABASE_URL`:

  ```bash
  psql -U postgres -h localhost -v app_user=forms_app -v app_password=YOUR_PASSWORD -v app_db=forms_db -f scripts/db/create-database.sql
  ```

  (With a Homebrew install the superuser is usually your own macOS user: replace `-U postgres` with `-d postgres`.)

**4. Generate the Prisma client, apply the migrations, and load the demo data**

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

The seed creates 1 admin, 6 agents (one of them inactive) and 162 submissions spread over the last 90 days, with realistic status histories. It is deterministic and can be re-run at any time to reset the demo data (it refuses to run when `NODE_ENV=production`).

**5. Start the backend and the frontend together**

```bash
npm run dev
```

- App: **http://localhost:5173**
- API: http://localhost:4000/api/v1 (health check: http://localhost:4000/api/v1/health)

The backend restarts on changes (nodemon) and the frontend hot-reloads (Vite). To run one side only: `npm run dev -w backend` or `npm run dev -w frontend`.

**6. (Optional) Run the checks**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` uses a separate database named after yours with `_test` added (e.g. `forms_db_test`). It is created and seeded automatically, and your development data is never touched.

---

## Test credentials

Created by `npm run db:seed` (local development only):

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| **Admin** | `admin@example.com` | `Admin@12345` | Manages all six agents |
| **Agent** | `agent1@example.com` | `Agent@12345` | Ravi Kumar, 34 submissions |
| Agent | `agent2@example.com` … `agent5@example.com` | `Agent@12345` | Other active agents |
| Agent (inactive) | `agent6@example.com` | `Agent@12345` | Login is refused: shows that deactivated users are blocked |

---

## Scripts

From the repository root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the backend (port 4000) and frontend (port 5173) together |
| `npm run build` | Builds the backend (`backend/dist`) and the frontend (`frontend/dist`) |
| `npm start` | Runs the built backend (`node backend/dist/server.js`) |
| `npm run lint` / `npm run lint:fix` | ESLint (zero warnings allowed) / auto-fix |
| `npm run format` / `npm run format:check` | Prettier write / check |
| `npm run typecheck` | TypeScript in all three workspaces |
| `npm test` | Backend tests (Vitest + Supertest) on the `_test` database |
| `npm run db:create` | Windows only: creates the database role and database (step 3) |
| `npm run db:generate` | Generates the Prisma client |
| `npm run db:deploy` | Applies pending migrations (never prompts, never deletes data) |
| `npm run db:seed` | Loads or resets the demo data |
| `npm run db:migrate` | `prisma migrate dev`, for creating new migrations during development |
| `npm run db:studio` | Opens Prisma Studio to browse the data |
| `npm run db:reset` | **Destructive:** drops all data, re-applies migrations and re-seeds |

---

## Status lifecycle

Every submission has exactly one of five statuses. The client never sends a status: it sends an action, and the server decides the new status from the table below. Any other move is rejected with **409 Conflict**, and every change writes a row to `submission_status_history` in the same database transaction.

| From | To | Who | Rule |
| --- | --- | --- | --- |
| (new) | Billing – Payment Not Done | Agent | Form submitted complete with an amount still due |
| (new) | Billing – Payment Done | Agent | Form submitted complete and fully paid |
| Billing – Payment Not Done | Billing – Payment Done | Agent (own) or Admin | A payment brings the amount due to 0 (automatic) |
| Billing – Payment Not Done / Done | Not Filled Completely | Admin | "Send back" with a note (10–500 characters) |
| Not Filled Completely | Billing – Payment Not Done / Done | Agent (own) | Edits and resubmits; the amount due decides which |
| Billing – Payment Done | Completed | Admin | Verified and closed |
| Not Done / Done / Not Filled Completely | Rejected | Admin | With a reason (10–500 characters) |
| Completed, Rejected | - | - | Final |

The database backs these rules with CHECK constraints (for example, "Payment Done" requires an amount due of 0, and "Rejected" requires a reason).

---

## Roles & permissions

| Capability | Agent | Admin |
| --- | --- | --- |
| Submit a form | Yes | No (see assumptions) |
| View own submissions and dashboard | Yes | Yes |
| View another agent's data / dashboard | No | Yes: one agent, any group, or all combined |
| Create and manage agents | No | Yes (only their own agents) |
| Record a payment | Own submissions | Any of their agents' submissions |
| Complete, send back, reject | No | Yes |

How it is enforced: every protected route runs `authenticate` (verifies the access token **and reloads the user**, so a deactivated user is blocked on the next request) and, where needed, `authorize('ADMIN')`. Every database query is scoped to the caller: an agent can only reach their own rows, and an admin only their own agents' rows. A record outside your scope returns **404** (not 403), so ids reveal nothing. Request bodies are validated with strict Zod schemas, so fields such as `agentId`, `status`, `role` or `amountDue` are rejected if a client sends them.

---

## Dashboard

One endpoint, `GET /api/v1/dashboard/summary`, returns everything the page shows. It is computed with SQL `GROUP BY` queries for the caller's scope; the browser never receives raw rows to filter.

- **Cards:** total submissions, Completed, Payment Done, Payment Pending, Rejected, Needs info (sent back), Total billed (split into collected, due and rejected), Pending due (with how many submissions still owe money); the Rejected card also shows the amount billed on rejected samples and the amount refunded
- **Charts:** submissions by status, submissions over time, billed vs collected vs pending per month, test results, sample condition, condition vs result, top locations, and either order sizes (one agent) or agents by status (several or all agents). Each chart has a table view and can be enlarged.
- **Filters:** date range (presets or custom), status, and for admins any number of agents. Filters are kept in the URL.
- **Refresh:** automatically every 30 seconds while the tab is visible, plus a Refresh button and an "Updated" time.

---

## API overview

All endpoints are under `/api/v1` and return `{ success: true, data }` or `{ success: false, error: { code, message, details? } }`.

| Method & path | Who | Purpose |
| --- | --- | --- |
| `GET /health` | Public | Server and database status |
| `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | - | Session management |
| `PATCH /users/me/password`, `PATCH /users/me/preferences` | Signed in | Change own password / theme |
| `GET /submissions`, `GET /submissions/:id`, `GET /submissions/:id/history` | Both (scoped) | List with filters, detail, status history |
| `POST /submissions`, `PATCH /submissions/:id` | Agent | Create, resubmit after "send back" |
| `POST /submissions/:id/payments` | Both (scoped) | Record a payment |
| `PATCH /submissions/:id/status` | Admin | Complete, send back or reject |
| `GET /agents`, `GET /agents/options`, `POST /agents`, `GET /agents/:id`, `PATCH /agents/:id`, `PATCH /agents/:id/status`, `POST /agents/:id/reset-password` | Admin | Agent management |
| `GET /dashboard/summary` | Both (scoped) | All dashboard metrics |

---

## Project structure

```
backend/     Express API: routes → middlewares → controllers → services → repositories (only layer using Prisma)
  prisma/    schema.prisma, migrations (with hand-written CHECK constraints), seed.ts
  tests/     Vitest + Supertest tests against the _test database
frontend/    React app: pages, features/* (submissions, agents, dashboard), components, api client
shared/      Zod schemas, constants and types used by both apps
scripts/db/  Database creation script (PowerShell + SQL)
docs/        db-schema.png (ER diagram)
```

The database schema is shown in [docs/db-schema.png](docs/db-schema.png).

---

## Security notes

- Passwords hashed with bcrypt; a dummy comparison runs for unknown emails so login time doesn't reveal which emails exist.
- 5 failed logins lock an account for 15 minutes; login is rate-limited per IP and email, and the whole API per IP.
- Access token (15 min) and refresh token (7 days, stored only as a SHA-256 hash) live in httpOnly, SameSite=Lax cookies. Refresh tokens rotate on every use; reusing an old one signs that user out everywhere.
- Changing or resetting a password, or deactivating an agent, revokes the user's sessions.
- Requests that change data must send an `X-Requested-With` header (CSRF protection together with SameSite cookies and the CORS allow-list).
- helmet security headers, a 100 KB body limit, generic error messages in production, and secrets only in environment variables.

---

## Deployment

The app can be hosted for free as **one Render web service** (API + built React app) with a **Neon** PostgreSQL database. Configuration lives in [`render.yaml`](render.yaml).

- In production (`NODE_ENV=production`) Express also serves `frontend/dist`, and any non-API address returns `index.html`. The browser sees a single origin, so the httpOnly cookies work exactly as in development.
- Every deploy runs `npm ci --include=dev`, `db:generate`, `build` and `db:deploy` (migrations), then `npm start`, with `/api/v1/health` as the health check. If a step fails, the previous version stays online.
- Render deploys the branch named in `render.yaml` automatically on every merge.

To set it up yourself:

1. Create a Neon project and copy its connection string (connection pooling off). Replace `&channel_binding=require` at the end with `&connect_timeout=30`.
2. From your machine, point the commands at Neon and load the schema and demo data (PowerShell shown; in bash use `DATABASE_URL="…" npm run db:deploy`):

   ```bash
   $env:DATABASE_URL = "postgresql://…neon.tech/neondb?sslmode=require&connect_timeout=30"
   npm run db:deploy
   npm run db:seed
   Remove-Item Env:DATABASE_URL
   ```

3. In Render choose **New → Blueprint**, select this repository, and paste the connection string as `DATABASE_URL`. `JWT_ACCESS_SECRET` is generated by Render, and `CLIENT_URL` defaults to the service's own URL.

Render's free plan puts a service to sleep after 15 minutes without traffic. To avoid that, the server runs a small keep-alive job (`backend/src/jobs/keepAlive.ts`) that calls its own public `/api/v1/health` every 14 minutes; it turns on automatically on Render. After a new deploy or a restart, the first visit can still take up to a minute.

---

## Git workflow

- `main`: release branch. `dev`: integration branch. Work happens on short-lived `feature/*` branches merged into `dev` through pull requests (see PRs #1–#7), then `dev` is released to `main`.
- Commits follow Conventional Commits (`feat`, `fix`, `test`, `docs`, `chore`, `ci`, `refactor`, `style`).
- GitHub Actions runs lint, format check, typecheck, tests (on the runner's PostgreSQL) and build on every pull request and on pushes to `main` and `dev`.

---

## Assumptions & notes

- **No draft saving.** The brief describes "Not Filled Completely" as a draft or missing information. Here the app always saves complete forms, and "Not Filled Completely" means **the admin sent the submission back** for missing or wrong information (with a note). The agent fixes it and resubmits. This keeps every stored form valid and gives the status a clear owner.
- **Only agents submit forms.** The brief marks admin submissions as optional; admins review, take payments and manage agents instead.
- **Agents cannot delete submissions**, and Completed / Rejected are final, so the history stays complete.
- **Agents are created by admins** (there is no sign-up). The admin account itself is created only by the seed.
- **Form fields:** customer name, location, total amount, amount paid, sample condition and test result are required; customer phone, customer email, collected-on date and remarks are optional. The amount due is calculated by the database (`total − paid`) and never sent by the client.
- **Money** is in Indian rupees (₹) with two decimals. Total billed includes rejected samples, so it never drops when a sample is rejected; money paid on them is shown as refunded, not collected. Collected and Pending due count only non-rejected submissions, so Total billed = Collected + Pending due + Rejected billed, and the API's `collectionRate` is Collected ÷ (Collected + Pending due). In the submissions list a rejected row shows no amount due (with a Refund badge when money was paid).
- **Dates and times** are in Indian Standard Time (IST): date filters and charts use whole IST days, and dates are shown as dd/mm/yyyy.
- **Reference numbers** are shown as `SUB-000001` (stored as an auto-increment integer).
- **Deployment:** optional in the brief; see [Deployment](#deployment) for the free Render + Neon setup. The README remains the main way to run the app.
- **`npm audit`** reports advisories in development-only tools (the Prisma CLI's `deepmerge-ts`, and `esbuild` inside `tsup`). They don't ship in the app and are left as is to avoid major-version upgrades close to the deadline.
