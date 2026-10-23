# Project Handover — Role-Based Forms & Metrics Dashboard

> **Written:** 23 October 2026, at the end of the first Claude Code session.
> **Purpose:** let a new Claude Code session continue the project without rebuilding or re-deciding anything.
> **Source of truth:** the code in this repository. This document was written after inspecting the files, git history and GitHub PRs. Where something is uncertain it is marked **(unverified)**.
> **No secrets are in this file.** Environment variable *names* only; real values live in `backend/.env` (git-ignored).

---

## 1. Project Overview

**What it is:** a full-stack take-home assignment ("Full-Stack Take-Home Assignment — Role-Based Forms & Metrics Dashboard · Node.js + React"). The brief is in `Full-Stack-Take-Home-Assignment.docx` in the project root (git-ignored, never committed).

**Deadline:** **28 October 2026, 11:59 PM**. The user has a budget of about **10 hours of total work**; roughly half has been used (see §7).

**Goal:** a working, secure, well-structured app that reviewers can run locally from the README. They score:

| Area | Weight |
| --- | --- |
| Functionality & completeness | 25% |
| Architecture & code quality | 20% |
| Security & access control (rules enforced server-side) | 20% |
| Git workflow & history (they read it) | 15% |
| UI/UX & theming (responsive, working dark/light) | 10% |
| Docs & setup (README) | 10% |

**Users / roles:**
- **Agent** — fills in and submits forms (submissions), sees only their own data and dashboard.
- **Admin** — manages a variable number (N) of agents, sees any single agent's dashboard or all agents combined, changes submission statuses.

**Main features required by the brief:**
1. Login for Admin and Agent (hashed passwords, JWT or sessions, role checks on every protected endpoint).
2. Agents submit a form that is saved in the database.
3. Every submission has exactly one of five statuses: Completed · Billing – Payment Done · Billing – Payment Not Done · Rejected · Not Filled Completely. Transitions must be documented in the README.
4. Dashboards: count per status, totals (billed vs paid vs pending), at least one chart, filters (date range / status; admin also by agent), **live auto-refresh** (polling/websockets) **and** a manual Refresh button. **Metrics must be computed server-side** for the correct scope.
5. Admin oversight: per-agent drill-down and all-agents aggregate; create/manage agents.
6. Light & dark mode, user-toggleable and persisted.
7. GitHub repo with real branching (protected `main`, `dev`, `feature/*` via PRs), Conventional Commits, and a README good enough to run the app locally (8 required sections, see §8).

**Design document (plan, not code):** a detailed requirements/design doc lives on claude.ai: https://claude.ai/artifact/VtrToEjw75zhZ6tYj2sC8J . It is the agreed plan but **the code wins where they differ** (see §6.6 for known differences).

---

## 2. Technology Stack (versions from package.json / installed)

**Runtime on the user's machine:** Node **v22.9.0**, npm **10.9.0**, Windows 11, PostgreSQL **17** installed locally (Windows service `postgresql-x64-17`). Project lives in **OneDrive** (`C:\Users\bindu\OneDrive\Desktop\Full-Stack-Take-Home-Assignment`) — see §6.5 for the problems this causes.

**Monorepo:** npm workspaces `shared`, `backend`, `frontend` (root `package.json`).

| Layer | Package | Version (range in package.json → installed) |
| --- | --- | --- |
| Language | TypeScript | `~5.9.3` → 5.9.3 (TS 7 is NOT supported by typescript-eslint yet) |
| Validation (shared) | zod | `^4.6.7` → 4.6.7 |
| Backend framework | express | `^5.3.0` → 5.3.0 (Express 5: async errors handled natively; `req.query` is read-only) |
| ORM | prisma / @prisma/client | `^6.19.0` → 6.19.3 (Prisma 7/8 not used: they need a different config) |
| DB | PostgreSQL | 17 (local), CI uses the runner's preinstalled PostgreSQL |
| Auth | jsonwebtoken | `^9.0.3`; bcrypt `^6.0.0` (native, works on Windows) |
| Security | helmet `^8.3.0`, cors `^2.8.6`, cookie-parser `^1.4.7`, express-rate-limit `^8.7.1` |
| Logging | pino `^10.4.0`, pino-http `^11.0.0`, pino-pretty `^13.2.0` (dev) |
| Config | dotenv `^18.0.9` |
| Dev server | nodemon `^3.1.14` + tsx `^4.23.15` (mentor's requirement: nodemon) |
| Backend build | tsup `^8.5.0` → 8.5.1 (tsup 9 needs Node ≥ 22.12) |
| Tests | vitest `^5.0.5`, supertest `^7.3.1` |
| Frontend | react / react-dom `^19.3.1` |
| Bundler | vite `^6.4.5` (mentor's requirement: Vite), @vitejs/plugin-react `^4.7.0` |
| Routing | react-router `^7.18.4` (v8 needs Node ≥ 22.22) |
| Server state | @tanstack/react-query `^5.104.5` |
| Forms | react-hook-form `^7.90.0`, @hookform/resolvers `^5.9.2` (v6 has a broken peer chain) |
| Styling | tailwindcss `^4.3.3`, @tailwindcss/vite `^4.3.3`, **daisyui `^5.7.50`** (mentor's requirement) |
| Icons | lucide-react `^1.61.0` |
| Lint/format | eslint `^9.39.5`, typescript-eslint `^8.72.0`, eslint-plugin-react-hooks `^7.1.1`, eslint-plugin-react-refresh `^0.5.7`, eslint-config-prettier, prettier `^3.9.10` |
| Scripts | concurrently `^10.0.6` (runs backend + frontend together) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

**Not installed yet but planned:** a chart library (plan: **Recharts**) for the dashboard; `node-cron` for the optional scheduler.

---

## 3. Project Structure

```
Full-Stack-Take-Home-Assignment/
├── .github/
│   ├── workflows/ci.yml          # On PRs and pushes to main/dev: starts PostgreSQL, npm ci, prisma generate,
│   │                             # lint, format:check, typecheck, test, build
│   └── pull_request_template.md
├── backend/                      # Express API + Prisma (workspace "backend")
│   ├── prisma/
│   │   ├── schema.prisma         # 4 models, 5 enums; snake_case DB names via @map/@@map
│   │   ├── migrations/
│   │   │   ├── 20261023000000_init/                    # tables, enums, FKs, indexes + HAND-WRITTEN CHECK constraints
│   │   │   │                                           #   and generated column amount_due
│   │   │   └── 20261023120000_add_indexes_and_themes/  # 3 indexes + 4 theme enum values
│   │   └── seed.ts               # deterministic seed (see §5.3)
│   ├── src/
│   │   ├── app.ts                # builds the Express app (no listen) — used by tests
│   │   ├── server.ts             # listen + graceful shutdown
│   │   ├── config/  env.ts (Zod-validated env), db.ts (single PrismaClient), logger.ts (pino, redaction)
│   │   ├── routes/  index.ts (/health, /auth, /users), auth.routes.ts, user.routes.ts
│   │   ├── controllers/  health, auth, user  — read req, call service, send res
│   │   ├── services/  auth.service.ts (login/refresh/logout/me), user.service.ts (password, theme)
│   │   ├── repositories/  user.repository.ts, refreshToken.repository.ts — ONLY layer that uses Prisma
│   │   ├── middlewares/  authenticate, authorize, validate, requireCsrfHeader, rateLimiter, errorHandler, notFound
│   │   ├── utils/  AppError, cookies, password (bcrypt + dummy hash), tokens (JWT + refresh token + sha256)
│   │   └── types/express.d.ts   # req.user typing
│   ├── tests/  app.test.ts, auth.test.ts, rbac.test.ts, helpers.ts, globalSetup.ts
│   ├── nodemon.json  tsup.config.ts  vitest.config.ts  tsconfig.json
│   ├── .env.example              # committed, placeholders only
│   └── .env                      # NOT committed (git-ignored) — real local values
├── frontend/                     # React + Vite + daisyUI (workspace "frontend")
│   ├── index.html                # inline script applies saved theme before React loads (no flash)
│   ├── vite.config.ts            # dev proxy /api → http://localhost:4000; cacheDir in OS temp (OneDrive fix)
│   ├── src/
│   │   ├── main.tsx → app/App.tsx (QueryClient, AuthProvider, ThemeProvider, RouterProvider) → app/router.tsx
│   │   ├── lib/  apiClient.ts (fetch wrapper), theme.ts, queryKeys.ts
│   │   ├── api/  auth.api.ts
│   │   ├── context/  authContext.ts + AuthProvider.tsx, themeContext.ts + ThemeProvider.tsx
│   │   ├── hooks/  useAuth.ts, useTheme.ts
│   │   ├── routes/  ProtectedRoute.tsx, GuestRoute.tsx
│   │   ├── pages/  LoginPage, DashboardPage (placeholder), ProfilePage, NotFoundPage
│   │   ├── features/profile/ChangePasswordDialog.tsx
│   │   ├── components/
│   │   │   ├── form/  TextField, PasswordField, PasswordChecklist, applyServerErrors
│   │   │   ├── layout/  AppLayout, Sidebar, ThemePicker, UserMenu, navigation.ts (NAV_ITEMS by role)
│   │   │   ├── ui/Modal.tsx  (native <dialog>, reusable)
│   │   │   └── feedback/FullPageSpinner.tsx
│   │   └── styles/globals.css    # Tailwind + daisyUI themes + custom "pastel beige" theme
│   └── .env.example              # VITE_API_BASE_URL
├── shared/                       # used by both apps (workspace "shared", ships TS source)
│   └── src/
│       ├── constants/  roles.ts, submission.ts (statuses, labels, daisyUI tones, conditions, results), themes.ts
│       ├── schemas/  common.schema.ts (uuid, email, pagination), auth.schema.ts (login, password rules, change
│       │             password, preferences, AuthUser)
│       └── index.ts              # also exports CSRF_HEADER / CSRF_HEADER_VALUE
├── scripts/db/  create-database.ps1 + create-database.sql  # creates app role + DB from backend/.env
├── docs/db-schema.png            # ER diagram image (4 tables)
├── eslint.config.mjs  .prettierrc  .prettierignore  .editorconfig  tsconfig.base.json
├── package.json                  # workspaces + root scripts
├── README.md                     # STILL A STUB ("Work in progress.") — must be written (see §8)
├── PROJECT_HANDOVER.md           # this file
├── Full-Stack-Take-Home-Assignment.docx   # the brief (git-ignored via *.docx)
└── .claude/launch.json           # local preview config (git-ignored)
```

**How the parts connect:**
- In development the browser only talks to **Vite (5173)**; Vite proxies `/api/*` to **Express (4000)**. Same origin ⇒ httpOnly cookies work without CORS trouble.
- Express mounts everything under **`/api/v1`**: `apiLimiter` → `requireCsrfHeader` → routers.
- Backend layers: **route → middleware (authenticate / authorize / validate) → controller → service → repository → Prisma → PostgreSQL**.
- `shared` is imported by both apps (`import { loginSchema } from 'shared'`), so validation rules, enums and labels are defined once. tsup bundles `shared` into the backend build (`noExternal: ['shared']`).

---

## 4. Completed Work

### 4.1 Completed and merged into `dev` (verified: GitHub PRs #1, #2, #3, #5 merged)

| PR | Content |
| --- | --- |
| #1 `feature/database-schema` | Prisma schema, init migration with CHECK constraints + generated `amount_due`, DB creation script, ER diagram image |
| #2 `feature/project-setup` | Workspaces, TypeScript/ESLint/Prettier, Express skeleton (health, error handling, helmet/CORS, pino, nodemon), Vite React app with Tailwind + daisyUI, CI |
| #3 `refactor/rename-folders` | `client/` → `frontend/`, `server/` → `backend/` (workspace names too) |
| #5 `feature/auth` | Indexes + theme values migration, seed data, full authentication (backend + frontend), app layout, profile page with change-password dialog, pastel beige theme, 24 tests, CI with PostgreSQL |
| #4 | **Closed without merging** — its 3 commits were folded into #5 at the user's request |

**Feature checklist:**

| Feature | Status |
| --- | --- |
| Database schema (4 tables), migrations, constraints | ✅ Done |
| Seed data (admin, 6 agents, 162 submissions + histories) | ✅ Done |
| Login / refresh / logout / me APIs, httpOnly cookies, rotation | ✅ Done |
| Lockout, rate limit, CSRF header, generic errors, deactivated-user check | ✅ Done |
| `authorize(role)` middleware | ✅ Done (tested via a test-only route; **no admin routes exist yet**) |
| Change password, save theme preference APIs | ✅ Done |
| Login page, protected/guest routes, session restore, silent refresh | ✅ Done |
| App layout (sidebar/drawer, top bar, theme picker, user menu) | ✅ Done |
| Profile page (details + Change password dialog) | ✅ Done |
| Themes: 7 options incl. custom pastel beige, persisted locally + on account | ✅ Done |
| Backend tests (24) + CI | ✅ Done |
| Dashboard page | ⚠️ **Placeholder only** ("Welcome back, <name>") — no metrics yet |
| Role-based sidebar + RoleRoute + 403 page + placeholder pages (New submission, My submissions / Submissions, Manage agents) | ✅ Done — committed on `feature/submissions` (`622cf1f`), not pushed |
| Corporate as default theme (shared constant, index.html, daisyUI `--default`, DB column default migration, seed) | ✅ Done — committed on `feature/submissions` (`a265abc`), not pushed |
| Submissions (form, list, detail, payments, status changes, history UI) | ❌ Not started (only DB tables + seed data exist) |
| Admin agent management (list/create/edit/deactivate/reset password) | ❌ Not started |
| Dashboard metrics API + 8 cards + 8 charts + filters + auto-refresh | ❌ Not started |
| Scheduler (cron) | ❌ Not started (optional; one job planned) |
| README (8 required sections + transitions) | ❌ Stub only |
| `dev` → `main` release PR, branch protection | ❌ Not done |

---

## 5. Current Implementation Details

### 5.1 Frontend

**Routes (`frontend/src/app/router.tsx`):**

| Path | Guard | Page |
| --- | --- | --- |
| `/login` | `GuestRoute` (signed-in users → `/dashboard`) | `LoginPage` |
| `/` | `ProtectedRoute` → `AppLayout` | redirect to `/dashboard` |
| `/dashboard` | `ProtectedRoute` → `AppLayout` | `DashboardPage` (placeholder) |
| `/profile` | `ProtectedRoute` → `AppLayout` | `ProfilePage` |
| `/submissions` | `ProtectedRoute` → `AppLayout` | `SubmissionListPage` (**placeholder**; title "My submissions" for agents, "Submissions" for admin) |
| `/submissions/new` | + `RoleRoute allow={['AGENT']}` | `SubmissionCreatePage` (**placeholder**) |
| `/agents` | + `RoleRoute allow={['ADMIN']}` | `AgentListPage` (**placeholder**) |
| `/403` | `ProtectedRoute` → `AppLayout` | `ForbiddenPage` |
| `*` | none | `NotFoundPage` |

`ProtectedRoute` shows a full-page spinner while `/auth/me` loads, redirects signed-out users to `/login` with `state.from` (they return there after login). `RoleRoute` (routes/RoleRoute.tsx) sends users without the allowed role to `/403`. Placeholder pages use `components/feedback/PagePlaceholder.tsx` ("Coming next" + planned items) — replace them with the real pages.

**Sidebar (user requirement):** `components/layout/navigation.ts` → `NAV_ITEMS` with `roles` per item. **Agent:** Dashboard · New submission (`/submissions/new`) · My submissions (`/submissions`) · Profile. **Admin:** Dashboard · Submissions (`/submissions`) · Manage agents (`/agents`) · Profile. `NavLink` uses `end` so `/submissions` isn't highlighted on `/submissions/new`.

**State management:**
- **TanStack Query** for server state. `queryKeys.currentUser = ['auth','me']` holds the signed-in user (`staleTime: Infinity`, `retry: false`).
- `AuthProvider` exposes `{ user, isLoading, login, logout, setUser }` via `useAuth()`. `logout` and session-expiry call `endSession()`: set user to `null`, then remove **other** cached queries (do **not** use `queryClient.clear()` — it caused a redirect bug, see §6.4).
- `ThemeProvider` exposes `{ theme, setTheme }` via `useTheme()`. Theme = `user.themePreference` when signed in, else localStorage. `setTheme` updates localStorage, the cached user, and best-effort `PATCH /users/me/preferences`. `SYSTEM` follows `prefers-color-scheme`.

**API integration (`lib/apiClient.ts`):** `api<T>(path, { method, body })` → returns `data` from `{ success, data }` or throws `ApiError(status, code, message, details[])`. Always `credentials: 'include'` and the CSRF header (`x-requested-with: XMLHttpRequest`). On **401** (except `/auth/login|refresh|logout`) it calls `POST /auth/refresh` once (single in-flight promise shared by parallel requests) and retries; if refresh fails it calls the session-expired handler (only signs out if a user was signed in). Base URL `VITE_API_BASE_URL` (default `/api/v1`).

**Forms:** React Hook Form + `zodResolver(sharedSchema)`; `mode: 'onSubmit'`, `reValidateMode: 'onChange'` (see §6.4 why not onBlur). Server field errors are mapped with `applyServerErrors(error, setError, fields)`. Use `useWatch` (not `watch`) — the React-compiler lint rule rejects `watch()`.

**Reusable components:** `TextField` (label + error with `aria-describedby`; wrapper is a `div`, not a `label`), `PasswordField` (show/hide), `PasswordChecklist` (live rules mirroring `passwordSchema`), `Modal` (native `<dialog>`; Esc/backdrop/✕ close), `FullPageSpinner`, `ThemePicker`, `UserMenu`.

**Login page:** email + password, generic server error banner, password cleared on failure, loading button, "Forgot your password? Ask your admin.", and **demo-fill buttons shown only when `import.meta.env.DEV`**.

**Profile page:** account details (name, email, role, phone, last sign-in) and a **Change password** button that opens `ChangePasswordDialog` (current / new + checklist / confirm; closes and shows a success alert on the page). The theme selector was intentionally **removed** from this page (user request) — the theme is chosen only from the top-bar picker.

### 5.2 Backend

**Endpoints that exist (all under `/api/v1`):**

| Method | Path | Middleware | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ status, database: up/down, uptimeSeconds }` (DB check with 2 s timeout) |
| POST | `/auth/login` | `loginLimiter`, `validate(loginSchema)` | sets cookies, returns `{ user }` |
| POST | `/auth/refresh` | — | rotates refresh token; clears cookies on failure |
| POST | `/auth/logout` | — | revokes refresh token, clears cookies, 204 |
| GET | `/auth/me` | `authenticate` | `{ user }` |
| PATCH | `/users/me/password` | `authenticate`, `validate(changePasswordSchema)` | change password, revoke all sessions, issue new cookies |
| PATCH | `/users/me/preferences` | `authenticate`, `validate(updatePreferencesSchema)` | save theme |

**Response shape:** success `{ success: true, data }`; error `{ success: false, error: { code, message, details? } }` (one `errorHandler`; `ZodError` → 400 `VALIDATION_ERROR` with `details: [{ field, message }]`; malformed JSON → 400 `BAD_JSON`; unknown → 500 with generic message in production).

**Error codes in use:** `INVALID_CREDENTIALS` (401), `ACCOUNT_LOCKED` (423), `ACCOUNT_INACTIVE` (403), `UNAUTHENTICATED` (401), `SESSION_EXPIRED` (401), `FORBIDDEN` (403), `CSRF_HEADER_MISSING` (403), `TOO_MANY_REQUESTS` (429), `WRONG_CURRENT_PASSWORD` (400), `VALIDATION_ERROR` (400), `NOT_FOUND` (404).

**Middleware:**
- `validate({ body, query, params })` — parses with Zod; replaces `req.body`; parsed query/params go to `res.locals.query` / `res.locals.params` (Express 5 `req.query` is read-only).
- `authenticate` — verifies `access_token` cookie (HS256) **and reloads the user** (`isActive` must be true) on every request; sets `req.user = { id, role, email, fullName, adminId }`.
- `authorize(...roles)` — 403 `FORBIDDEN` if role not allowed.
- `requireCsrfHeader` — non-GET/HEAD/OPTIONS must send `x-requested-with: XMLHttpRequest`.
- `loginLimiter` (10 / 15 min per IP+email), `apiLimiter` (1000 / 15 min per IP).
- `app.set('trust proxy', 1)`; helmet; CORS `origin: CLIENT_URL, credentials: true`; `express.json({ limit: '100kb' })`; pino-http with one-line serializers.

**Validation schemas (shared/src/schemas):** `emailSchema` (trim, ≤254, valid, lowercased), `uuidSchema`, `paginationSchema`, `passwordSchema` (8–72, upper, lower, digit, special), `loginSchema` (strict; password required, 8–72), `changePasswordSchema` (strict; confirm must match; new ≠ current), `updatePreferencesSchema` (strict, enum of THEMES), `authUserSchema`/`AuthUser`.

### 5.3 Database

**Tables (PostgreSQL, snake_case):** `users`, `submissions`, `submission_status_history`, `refresh_tokens` (+ Prisma's `_prisma_migrations`). `audit_logs` and `daily_metric_snapshots` were **deliberately removed** from the design.

**Enums:** `user_role` (ADMIN, AGENT) · `submission_status` (NOT_FILLED_COMPLETELY, BILLING_PAYMENT_NOT_DONE, BILLING_PAYMENT_DONE, COMPLETED, REJECTED) · `sample_condition` (GOOD, OPEN, DAMAGED) · `test_result` (PASS, FAIL, CANNOT_BE_DECIDED) · `theme_preference` (LIGHT, DARK, SYSTEM, CORPORATE, EMERALD, CUPCAKE, DRACULA); column default **CORPORATE** (migration `20261023180000_default_theme_corporate`, applied locally).

**Key columns / rules:**
- `users`: UUID PK, `email` unique + lowercase CHECK, `password_hash`, `role`, `admin_id` self-FK (RESTRICT) with CHECK *agent ⇒ admin_id set, admin ⇒ null*, `is_active`, `theme_preference` (default CORPORATE), `failed_login_attempts`, `locked_until`, `last_login_at`, timestamps.
- `submissions`: UUID PK, **`reference_no` INTEGER autoincrement unique** (shown in UI as `SUB-000001` — UI formatting not built yet), `agent_id` + `created_by` FKs to users (RESTRICT), `customer_name`, `location`, optional `customer_phone`/`customer_email`/`collected_on`/`remarks`, `total_amount` NUMERIC(12,2), `amount_paid` NUMERIC(12,2) default 0, **`amount_due` GENERATED ALWAYS AS (total_amount − amount_paid) STORED** (never write it; Prisma declares it `@default(dbgenerated(...))` so no drift), `sample_condition`, `result`, `status`, `rejection_reason`, `submitted_at`, `completed_at`, timestamps.
- `submission_status_history`: FK to submission (CASCADE) and `changed_by` user (RESTRICT), `from_status` (null for creation), `to_status`, `note`, `changed_at`. CHECK from ≠ to.
- `refresh_tokens`: FK user (CASCADE), `token_hash` CHAR(64) unique (SHA-256), `expires_at`, `revoked_at`, `user_agent`, `ip_address`.
- **19 CHECK constraints** in the init migration (users 5, submissions 12, history 1, refresh_tokens 1), e.g. paid ≤ total, total > 0, required fields present unless status is NOT_FILLED_COMPLETELY, BILLING_PAYMENT_DONE ⇒ due = 0, BILLING_PAYMENT_NOT_DONE ⇒ due > 0, COMPLETED ⇒ due = 0, REJECTED ⇒ rejection_reason not null, phone format, name length.
- **Indexes:** users(admin_id), users(role); submissions(agent_id,status), (agent_id,created_at), (created_by), (created_at), (status); history(submission_id,changed_at), (changed_by); refresh_tokens(user_id), (expires_at). Named `idx_*`, `uq_*`, `fk_*`, `chk_*`.

**Seed (`backend/prisma/seed.ts`, `npm run db:seed`):** 1 admin + 6 agents (agent 6 is inactive), 162 submissions over the last 90 days including today, every status, 1–4 history rows each following the real lifecycle, correlated condition→result, 12 cities, amounts ₹500–₹75,000. Fixed random seed (mulberry32, 42) ⇒ identical data every run. Idempotent: upserts users (resets password, lockout, active flag) and recreates their submissions. Refuses `NODE_ENV=production`. Login emails are `admin@example.com` and `agent1@example.com`…`agent6@example.com`; **passwords: see the defaults at the top of `seed.ts` (overridable with `SEED_ADMIN_PASSWORD` / `SEED_AGENT_PASSWORD`)**; the seed prints them when it runs.

**Local databases:** `forms_db` (development) and `forms_db_test` (created automatically by the tests), owned by role `forms_app` (has CREATEDB). Created by `npm run db:create` (needs the postgres superuser password typed by the user).

### 5.4 Authentication flow and permissions

```
Login → bcrypt compare (dummy compare if email unknown) → lockout check (5 fails ⇒ 15 min) → is_active check
      → access JWT (15 min, payload { sub, role }) + random refresh token (7 days, sha256 stored)
      → cookies: access_token (httpOnly, SameSite=Lax, path /) and refresh_token (httpOnly, SameSite=Lax,
        path /api/v1/auth); Secure when COOKIE_SECURE=true
Request → authenticate (verify JWT + reload active user) → authorize(role) → validate → controller
401 → frontend calls /auth/refresh once → rotation (old revoked; reuse of a token revoked >30 s ago revokes
      ALL the user's sessions = theft detection) → retry
Logout → revoke refresh token, clear cookies, frontend clears cache
Password change → revoke all refresh tokens, issue new cookies for this device
```

**Permission rules agreed (only auth parts are built so far):** agent sees only own data (single-record lookups must include the owner condition; another agent's record ⇒ **404**); admin sees agents where `admin_id = admin.id`; `agent_id`, `role`, `admin_id`, `status`, `amount_due` never come from the request body (strict Zod schemas).

### 5.5 Environment variable NAMES

`backend/.env` (see `backend/.env.example`): `NODE_ENV`, `PORT` (4000), `LOG_LEVEL`, `CLIENT_URL` (http://localhost:5173), `DATABASE_URL`, `JWT_ACCESS_SECRET` (≥ 32 chars), `ACCESS_TOKEN_TTL_MINUTES` (15), `REFRESH_TOKEN_TTL_DAYS` (7), `BCRYPT_SALT_ROUNDS` (12), `COOKIE_SECURE` (false locally). Optional seed overrides: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_AGENT_PASSWORD`.
`frontend/.env.example`: `VITE_API_BASE_URL` (/api/v1). CI sets `DATABASE_URL`, `JWT_ACCESS_SECRET`, `PRISMA_HIDE_UPDATE_MESSAGE`.
Tests (`backend/vitest.config.ts`) derive `DATABASE_URL` → `<db>_test`, force `BCRYPT_SALT_ROUNDS=4`, `NODE_ENV=test`.

---

## 6. Important Decisions

### 6.1 Requirements and preferences from the user and their mentor (MUST follow)
- **nodemon** for backend auto-restart; **Vite** for the frontend.
- **No Docker anywhere** (no docker-compose, no Dockerfile). CI uses the runner's built-in PostgreSQL.
- **No draft saving** in the submission form (no "Save draft"). The status **Not Filled Completely** means **the admin sent the submission back** (note required); the agent edits and **resubmits**. **Agents cannot delete submissions.**
- The form must show **Amount due** (auto-calculated total − paid, read-only). "Due" means amount due, **not** a due date.
- **daisyUI** themes, more than light/dark. **Default theme: Corporate** (user decision, 23 Oct, later than the beige request). A custom **pastel beige** theme overrides daisyUI `light` and is labelled "Pastel beige" in the picker (no longer the default; `SYSTEM` still maps to light/dark). Build UI with daisyUI semantic classes (`btn-primary`, `bg-base-200`, `badge-success`…) so it works in every theme; text/background contrast ≥ 4.5:1. The user has not decided whether to make a matching dark beige theme (asked, no answer).
- **Theme picker lives only in the top bar**; do not add a theme section to the profile page.
- **Change password is a button that opens a dialog**, not an always-visible form.
- **Folder names:** `frontend/` and `backend/` (not client/server).
- **Dashboard locked at 8 cards + 8 visuals** (mentor: "minimum 8"):
  - Cards: 1 Total submissions · 2 Completed · 3 Payment Done · 4 Payment Pending · 5 Rejected · 6 Needs info (Not Filled Completely / sent back) · 7 Total billed ₹ (sub-line: collected) · 8 Pending due ₹ (sub-line: collection rate %). Money totals **exclude rejected** submissions.
  - Visuals: V1 status donut (required chart) · V2 submissions over time (line) · V3 billed vs collected vs pending by month (grouped bar) · V4 test results (donut) · V5 sample condition (bar) · V6 condition vs result (stacked bar) · V7 top locations (horizontal bar, group by `lower(btrim(location))`) · V8 agent: amount histogram (₹0–1k, 1–5k, 5–10k, 10–25k, 25–50k, 50k+) / admin all-agents: agents by status (stacked bar).
  - Same page for both roles; data scope differs; admin has an agent selector ("All agents" + each agent); one endpoint `GET /dashboard/summary?fromDate&toDate&status&agentId` computes everything with SQL `GROUP BY`; polling every 30 s (TanStack Query `refetchInterval`, pause when tab hidden) + Refresh button + "Last updated".
- **Fewer, larger PRs:** remaining work is planned as **3–4 feature PRs** (user doesn't want many features/PRs), each with several small Conventional Commits.
- **Git attribution:** do **NOT** add `Co-Authored-By: Claude` to commits and do **NOT** add "Generated with Claude Code" to PR descriptions (user decision). Older commits from PR #1 keep theirs — never rewrite `dev`/`main` history.
- **Commit/push/PR only when the user asks.** Never merge PRs yourself (the app's safety check also blocks it) — the user merges on GitHub. Tell the user clearly when a branch is fully pushed so they don't merge early (a premature merge already happened once, see §6.4).
- The user is **new to Git/GitHub** and wants each step explained (what was built, how it works, how it was tested) after each piece of work.

### 6.2 Architecture decisions
- Monorepo with npm workspaces; `shared` holds constants and Zod schemas used by both sides.
- Layered backend (routes → middlewares → controllers → services → repositories). Repositories are the only Prisma users.
- PostgreSQL + Prisma; snake_case DB / camelCase code; CHECK constraints and generated column in hand-written migration SQL.
- Auth: hybrid JWT access token + DB-backed rotating refresh token, both in httpOnly cookies; CSRF via custom header + SameSite=Lax + CORS allow-list.
- Vite dev proxy for same-origin cookies.
- Server decides every status; client sends actions (`submit`, `resubmit`, `record-payment`, `complete`, `send-back`, `reject`).

### 6.3 Status transitions (agreed; to implement in feature/submissions and copy into README)

| From | To | Who | Rule |
| --- | --- | --- | --- |
| (new) | Billing – Payment Not Done | Agent | submitted complete, amount due > 0 |
| (new) | Billing – Payment Done | Agent | submitted complete, amount due = 0 |
| Billing – Payment Not Done | Billing – Payment Done | Agent (own) or Admin | payment recorded, due becomes 0 (automatic) |
| Billing – Payment Not Done / Done | Not Filled Completely | Admin | send back; note required (10–500 chars) |
| Not Filled Completely | Billing – Payment Not Done / Done | Agent (own) | resubmit; amount due decides |
| Billing – Payment Done | Completed | Admin | verify and close |
| Not Done / Done / Not Filled Completely | Rejected | Admin | reason required (10–500 chars) |
| Completed, Rejected | — | — | final |

Every transition writes one `submission_status_history` row in the same DB transaction; invalid transitions ⇒ **409**.

### 6.4 Problems encountered and how they were solved (don't repeat them)
- **Prisma `migrate dev` hangs** when run non-interactively by the agent. Workaround used: generate SQL with `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_<name>/migration.sql`, review/edit it, then `prisma migrate deploy`; verify with `migrate diff ... --exit-code` (exit 0 = no drift).
- **Prisma blocks `migrate reset` when run by an AI agent** (requires explicit user consent). It was **not bypassed**. Tests use `migrate deploy` + seed instead (non-destructive). The `db:reset` script exists for the user to run themselves.
- **Generated column drift:** Prisma introspects `amount_due` as a DB default; fixed by `@default(dbgenerated("(total_amount - amount_paid)"))` in the schema.
- **npm workspace install bug** (`Cannot read properties of null (reading 'edgesOut')`) when running `npm i -w <ws> <pkg>`: instead set versions with `npm pkg set -w <ws> "dependencies.<pkg>=^x.y.z"` and run `npm install` at the root.
- **Version incompatibilities:** TypeScript 7 (typescript-eslint), tsup 9 (Node 22.9), React Router 8 (needs Node 22.22), @hookform/resolvers 6 (peer chain) — older majors pinned.
- **OneDrive locks folders** (`EPERM` on `node_modules/.vite`, `.vitest-cache`, `npm ci`): Vite and Vitest `cacheDir` moved to the OS temp folder; prefer `npm install` over `npm ci` locally. Moving the project out of OneDrive would avoid this entirely (not done).
- **Preview tool injects `PORT=5173`** — when the agent previews, run the backend in a terminal tab (`npm run dev -w backend`) and preview only the frontend (`.claude/launch.json` config "client"). Normal `npm run dev` is unaffected.
- **Frontend bugs fixed during testing:** (1) spinner stuck for signed-out users (session-expired handler cleared cache during first load) → handler only acts if a user was signed in; (2) nested `<label>` confused screen readers → wrapper is a `div`; (3) validation on blur shifted the Sign in button mid-click → `mode: 'onSubmit'` + `reValidateMode: 'onChange'`; (4) sign-out briefly landed on `/dashboard` → `endSession()` instead of `queryClient.clear()`.
- **Pastel error/success colours were unreadable as text** (≈1.9:1) → deeper `--color-error` (#b04a46) and `--color-success` (#4a6b3d).
- **PR #2 was merged before the rename commit was pushed** → the rename went in separately as PR #3.

### 6.5 Environment quirks
- Line-ending warnings (`LF will be replaced by CRLF`) on commit are harmless.
- `npm audit` reports 3 high advisories in `deepmerge-ts` via the Prisma CLI (dev tooling); no fix without a Prisma major upgrade. Known and accepted for now.
- The user's own terminal tab "create database" (`c1`) may still be open; the agent can't close tabs the user typed in.

### 6.6 Design doc vs code (code wins)
The design doc (claude.ai link in §1) still mentions some things that were changed or dropped: `reference_no VARCHAR(20)` (code: INTEGER autoincrement), audit-log entries/page in sections 7–9, `asyncHandler`/`apiResponse` utils in the folder tree (not needed with Express 5), a `RoleRoute`/`ForbiddenPage` (not built yet), `themes.css`/`tailwind.config.ts` (Tailwind 4 uses CSS config), 10 KPI cards in old text (now 8). Treat the doc as intent, the code as fact.

---

## 7. Current Status

- **Latest completed step:** `feature/auth` (PR #5) was committed, pushed, CI passed (1 min 8 s) and **the user merged it into `dev`** (verified on GitHub: merge commit `301943e`).
- **Local git state at handover:** `dev` is up to date with `origin/dev`. The working copy is on branch **`feature/submissions`** (created from `dev`), with 3 local commits **not pushed yet**: `622cf1f feat(frontend): add role-based navigation and placeholder pages`, `a265abc feat: make corporate the default theme`, and `docs: add project handover` (this file). They contain: role-based sidebar, `RoleRoute`, `ForbiddenPage`, `PagePlaceholder` + 3 placeholder pages, router entries, Corporate default theme (shared/themes.ts, frontend/index.html, globals.css), Prisma schema default + migration `20261023180000_default_theme_corporate`, seed sets demo users to the default theme, and this `PROJECT_HANDOVER.md`. The migration is applied to the local `forms_db` and the seed was re-run. All checks pass with these changes (lint, format, typecheck, 24/24 tests, build) and both roles were checked in the browser. Merged branch `feature/auth` still exists locally and on GitHub (deleting it needs the user's OK).
- **Working:** everything in §4.1 marked ✅. Last verified run: `npm run lint`, `format:check`, `typecheck`, `test` (**24/24 passed**), `build` — all exit 0 locally; CI passed on PR #5.
- **No known failing tests or open bugs.** The dashboard page is an intentional placeholder.
- **Not started:** submissions, agent management, dashboard metrics, README, release.
- **Time used:** roughly 5 of the 10 planned hours (estimate).

---

## 8. Next Steps (prioritized)

**Immediate next action (start of the new chat):**
1. Already on `feature/submissions` with 3 local, unpushed commits (§7). Keep building on this branch; push and open the PR only when the whole submissions feature is done and the user asks. Ask before deleting the merged `feature/auth` branch. Next: replace the placeholder pages with the real features below.

**Feature PR 1 — `feature/submissions`** (largest, ~2.5–3 h):
2. Shared: `submissionSchema` (fields + rules from design doc §10.4: name 2–100 letters/space/.'-, location 2–150, total > 0 ≤ 10,000,000 two decimals, paid ≥ 0 ≤ total, condition/result enums, optional phone 10–15 digits, email, collectedOn not future, remarks ≤ 500), list query schema (page, pageSize, sortBy allow-list, status[], fromDate ≤ toDate, search ≤ 100, agentId admin-only), `recordPaymentSchema` (> 0, ≤ due), `changeStatusSchema` (action + note 10–500 for reject/send-back), agent schemas (create/edit/status/reset password). Helper `formatReference(n) → SUB-000001`.
3. Backend: `submission.repository/service/controller/routes` — `GET /submissions`, `POST /submissions`, `GET /submissions/:id`, `PATCH /submissions/:id` (resubmit, own + NOT_FILLED_COMPLETELY only), `POST /submissions/:id/payments`, `PATCH /submissions/:id/status` (admin), `GET /submissions/:id/history`; a `statusTransition` service implementing §6.3; transactions for status + history; ownership ⇒ 404; scope admin to own agents.
4. Backend: agents (admin): `GET /agents`, `GET /agents/options`, `POST /agents`, `GET /agents/:id`, `PATCH /agents/:id`, `PATCH /agents/:id/status` (revoke sessions on deactivate), `POST /agents/:id/reset-password`. Register `/agents/options` before `/agents/:id`.
5. Tests for transitions, ownership (404), admin-only (403), validation.
6. Frontend: `RoleRoute`; nav items Submissions (+ Agents for admin); pages: submission list (filters in URL, pagination, status badges with `STATUS_TONES`), new submission form (live amount due, confirm dialog showing resulting status), detail (cards + status timeline + actions by status/role: record payment, resubmit, admin complete/send back/reject using `Modal`), agents list + create/edit/reset dialogs.

**Feature PR 2 — `feature/dashboard`** (~1.75 h): install Recharts; `GET /dashboard/summary` (scope by role, admin `agentId` validated against own agents, date/status filters, money excludes rejected); 8 cards + 8 visuals (§6.1); filters; agent selector; 30 s polling + Refresh + last updated; loading/empty/error states.

**Feature PR 3 — `feature/polish-and-docs`** (~1 h): README with all 8 required sections (overview, stack, prerequisites, env vars, step-by-step setup incl. `db:create`/`db:migrate`/`db:seed`, test credentials for admin + agent, scripts, assumptions) + status transitions table + ER diagram link + security notes; responsive/empty-state polish; optional `cleanupExpiredTokens` cron (node-cron); final fresh-clone test.

**Release:** PR `dev` → `main`; tell the user that branch protection on a **private** repo needs GitHub Pro (options: make repo public, or state "protected by convention" in README); user grants reviewer access and sends the submission note (assumptions, trade-offs, AI use).

---

## 9. Commands and Verification

Run from the project root unless noted.

| Purpose | Command |
| --- | --- |
| Install all workspaces | `npm install` |
| Create DB role + database (once; asks for postgres superuser password) | `npm run db:create` |
| Apply migrations (interactive dev) | `npm run db:migrate` |
| Apply migrations (non-interactive, safe) | `npx prisma migrate deploy` (in `backend/`) |
| Generate Prisma client | `npm run db:generate -w backend` |
| Seed / reset test data | `npm run db:seed` |
| Wipe + re-migrate + seed (destructive — **user runs it**) | `npm run db:reset` |
| Browse DB | `npm run db:studio` |
| Start backend + frontend | `npm run dev` → http://localhost:5173 (API on :4000) |
| Backend only / frontend only | `npm run dev -w backend` / `npm run dev -w frontend` |
| Lint / fix | `npm run lint` / `npm run lint:fix` |
| Format / check | `npm run format` / `npm run format:check` |
| Typecheck | `npm run typecheck` |
| Tests (uses `forms_db_test`) | `npm test` |
| Build | `npm run build` |
| Drift check (in `backend/`) | `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` |
| GitHub CLI (not on PATH in Git Bash) | `export PATH="$PATH:/c/Program Files/GitHub CLI"` then `gh ...` |

**Verified results (23 Oct 2026):** lint ✅, format ✅, typecheck ✅, tests **24/24** ✅, build ✅ (local and in CI for PR #5). Manually tested in the browser as admin and agent (desktop and narrow widths): protected redirect, empty-form errors, wrong-password generic error, sign in, reload keeps session, theme saved to account, change-password dialog (errors, Esc, success), sign out.

---

## 10. Instructions for the Next Claude Code Chat

1. **Read this file first**, then inspect the actual source files (§3) to confirm it — the code is the source of truth.
2. **Continue from the current state.** Do not rebuild, re-scaffold or re-decide anything in §6.
3. **Preserve working features and architecture** (layers, shared schemas, auth flow, themes, tests, CI).
4. **Do not overwrite files, modify or reset the database, install/upgrade dependencies, or remove working code unless the task needs it** — and say why. Never run destructive DB commands (`migrate reset`, dropping data) yourself; ask the user.
5. **Ask before anything destructive or irreversible**, and before commits, pushes, PRs, branch deletions or force-pushes. **Never merge PRs** — the user does.
6. **Commits:** small, Conventional Commits, **no Claude co-author line, no "Generated with Claude Code" in PRs**. Push only when the whole feature is done and tested, then tell the user it is safe to merge.
7. **After each piece of work, explain to the user what was built, how it works and how it was tested** (they are learning Git and full-stack development and asked for this).
8. **Verify every change** with `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, plus a browser check for UI work. Add tests for new backend behaviour.
9. Follow the UI palette (pastel beige, contrast ≥ 4.5:1), reuse existing components (`TextField`, `PasswordField`, `Modal`, …), and keep the role rules enforced on the server.
10. Watch out for the environment issues in §6.4–6.5 (OneDrive locks, preview PORT, npm workspace bug, Prisma AI guard, `migrate dev` hanging).

---

## 11. Important Conversation Context

- The user (GitHub: **Bindubhargavi37**) is doing this assignment with guidance from a **mentor**, whose decisions are in §6.1. Repo: https://github.com/Bindubhargavi37/Full-Stack-Take-Home-Assignment (**private**). Default GitHub branch is `main` (still almost empty — only gets code at release).
- The brief **allows AI tools** but expects the candidate to understand and explain every line. The user asked for interview-style explanations; keep giving them.
- The user wanted **one feature PR per big area** and merged seed/indexes into the auth PR on purpose.
- Test DB name rule: tests refuse to run unless `DATABASE_URL` ends in `_test` (derived automatically).
- Monetary values are in **₹ (INR)**, two decimals; locations are Indian cities in the seed.
- Optional form fields chosen: customer phone, customer email, collected-on date, remarks. Required: name, location, total amount, amount paid (default 0), sample condition, result.
- The admin cannot be created via the UI; only the seed creates it. Agents cannot sign up; admins create them.
- **Uncertain / unverified:** whether the user wants a dark beige theme (asked, unanswered); whether the repo will be made public before submission; whether a live deployment is wanted (optional in the brief, not planned); the exact remaining time budget (the user said 10 hours total; elapsed time is estimated).
- Claude's memory notes for this project were saved under a different (scratch) project path and may **not** be visible to a new session started in this folder — this document replaces them.
