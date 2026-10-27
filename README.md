# Role-Based Forms & Metrics Dashboard

A web app where **agents** fill in customer sample forms and an **admin** reviews them. Each form moves through a set of statuses, and a live dashboard shows the numbers for whoever is signed in: an agent sees only their own work, and an admin can see one agent, a few agents, or all agents together.

**Live demo:** https://rolebasedform-dashboard.onrender.com (free hosting, so the first visit can take up to a minute to load)

---

## Features

- Login for two roles: **Admin** and **Agent**
- Agents submit forms; the amount due is calculated automatically
- Five statuses, with clear rules for who can move a form from one status to another
- Admins can complete, send back or reject a form; agents fix and resubmit forms that were sent back
- Payments, with refunds shown for rejected forms
- Admins add, edit, deactivate and reset passwords for their agents
- Dashboard with summary cards and 8 charts, filters (date range, status, agents), auto-refresh every 30 seconds and a Refresh button
- Light, dark and other themes, saved per user
- Works on desktop and mobile

---

## Tech stack

| Part | Technology |
| --- | --- |
| Language | TypeScript |
| Backend | Node.js, Express, Prisma (database access and migrations), Zod (input validation) |
| Database | PostgreSQL |
| Login | bcrypt (password hashing), JWT |
| Frontend | React 19, Vite, React Router, TanStack Query, React Hook Form |
| Styling | Tailwind CSS, daisyUI |
| Charts | Recharts |
| Tests | Vitest, Supertest |

The repo has three folders: `backend`, `frontend`, and `shared` (validation rules and constants used by both).

---

## Prerequisites

- **Node.js 22** (includes npm 10)
- **PostgreSQL 15 or newer**, running on port 5432
- **Git**

---

## Environment variables

Copy `backend/.env.example` to `backend/.env`. Only the first two variables must be set; the others have working defaults. The real `.env` is never committed.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | - | Secret for signing login tokens (32+ characters) |
| `NODE_ENV` | No | `development` | `development`, `test` or `production` |
| `PORT` | No | `4000` | Port the API listens on |
| `LOG_LEVEL` | No | `info` | How much the server logs |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend address allowed to call the API (CORS) |
| `ACCESS_TOKEN_TTL_MINUTES` | No | `15` | How long a login token lasts |
| `REFRESH_TOKEN_TTL_DAYS` | No | `7` | How long a session lasts before signing in again |
| `BCRYPT_SALT_ROUNDS` | No | `12` | Password hashing strength |
| `COOKIE_SECURE` | No | `false` | `true` sends cookies over HTTPS only (use in production) |
| `KEEP_ALIVE_URL` | No | `RENDER_EXTERNAL_URL` (set by Render) | Address the keep-alive job pings (see Assumptions & notes); off locally |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_AGENT_PASSWORD` | No | see Test login details | Logins created by `npm run db:seed` |

The frontend has one variable, `VITE_API_BASE_URL` (default `/api/v1`), in `frontend/.env.example`. You don't need to change it. Anything starting with `VITE_` is visible in the browser, so it never holds secrets.

---

## Local setup

Run these from the project folder.

1. Clone and install:

   ```bash
   git clone https://github.com/Bindubhargavi37/Role_Based_Access_Control.git
   cd Role_Based_Access_Control
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env`. In it, replace `change-me` in `DATABASE_URL` with a password of your choice, and set `JWT_ACCESS_SECRET` to any random text of 32+ characters.

3. Create the database (Windows; asks for your `postgres` password):

   ```bash
   npm run db:create
   ```

   On macOS or Linux, run this instead, using the password from step 2:

   ```bash
   psql -U postgres -h localhost -v app_user=forms_app -v app_password=YOUR_PASSWORD -v app_db=forms_db -f scripts/db/create-database.sql
   ```

4. Create the tables and load the demo data:

   ```bash
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

   Open **http://localhost:5173**

---

## Test login details

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin@12345` |
| Agent | `agent1@example.com` | `Agent@12345` |

`agent2@example.com` to `agent5@example.com` use the same agent password. `agent6@example.com` is a deactivated agent, so its login is refused.

These are demo values only, created by `npm run db:seed`; never use them for real accounts. They can be changed with the `SEED_*` variables. The seed refuses to run when `NODE_ENV=production`.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the backend and the frontend |
| `npm run build` | Builds the app for production |
| `npm start` | Runs the built app |
| `npm test` | Runs the backend tests on a separate `_test` database: login and sessions, role checks, status changes, payments and dashboard numbers |
| `npm run lint` | Checks the code for problems |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run format:check` | Checks the formatting (`npm run format` fixes it) |
| `npm run db:seed` | Resets the demo data |
| `npm run db:reset` | Drops the database, runs every migration and seeds it again |

---

## Statuses, roles & permissions

Every form has exactly one status. Users don't pick a status: they take an action, and the server sets the new status.

| Action | Agent | Admin | Status change |
| --- | --- | --- | --- |
| Submit a form | Yes | No | New → Payment Not Done, or Payment Done if fully paid |
| Record a payment | Own forms | Their agents' forms | Payment Not Done → Payment Done once fully paid |
| Complete | No | Yes | Payment Done → Completed |
| Send back (with a note) | No | Yes | Payment Not Done / Done → Not Filled Completely |
| Fix and resubmit | Own forms | No | Not Filled Completely → Payment Not Done / Done |
| Reject (with a reason) | No | Yes | Payment Not Done / Done / Not Filled Completely → Rejected |
| See submissions and dashboard | Own only | Their agents' (one, several or all) | - |
| Manage agents | No | Yes | - |

Completed and Rejected are final. Every rule is checked on the server, not just hidden in the UI: even if someone edits the page's JavaScript to show a hidden button, the server still refuses the request. A form outside your access returns 404, so ids reveal nothing.

---

## Git workflow

- `main` is the release branch and is protected: changes only through a pull request, the CI check must pass, and force pushes and deletion are blocked.
- `dev` is the integration branch. Each change is made on a short-lived `feature/*` (or `docs/*`, `chore/*`) branch and merged into `dev` through a pull request; `dev` is then released to `main` through a pull request.
- Commits follow Conventional Commits (`feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`).
- GitHub Actions runs lint, format check, typecheck, tests and build on every pull request.

---

## Assumptions & notes

- **"Not Filled Completely" means sent back.** Forms are always saved complete. This status means the admin sent the form back for missing or wrong information, and the agent fixes and resubmits it.
- **Only agents submit forms.** The brief made this optional for admins; admins review forms and manage agents.
- **Forms can't be deleted**, and Completed and Rejected are final.
- **There is no sign-up.** Admins create agents; the admin account comes from the demo data.
- **Every agent belongs to exactly one admin**, and an admin only ever sees their own agents. The design already supports several admins.
- **Deactivating an agent keeps their forms.** Nothing is hard-deleted; a deactivated agent is blocked from their very next request.
- **Money** is in Indian rupees (₹) with two decimals, stored as exact decimals (never floating point). Amount due = total amount − amount paid, calculated by the database. Money paid on a rejected form is shown as refunded, not collected.
- **Dates** use Indian Standard Time and are shown as dd/mm/yyyy.
- **Hosting:** the live demo runs on Render with a Neon PostgreSQL database.
- **Background job:** one job, keep-alive (`backend/src/jobs/keepAlive.ts`). Every 14 minutes it calls the app's own `/api/v1/health`, so Render's free plan doesn't put the service to sleep. It runs only when there is a public URL: `KEEP_ALIVE_URL`, or else `RENDER_EXTERNAL_URL`, which Render sets automatically. Locally and in tests neither is set, so it is off.
- **Dependencies:** run `npm audit` to check them. At the time of writing it reports issues only in tools (the Prisma command-line tool and the esbuild copy used to build the backend), which don't run while the app serves requests.
