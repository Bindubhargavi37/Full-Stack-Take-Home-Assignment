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

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and `JWT_ACCESS_SECRET`. Every other variable has a working default, and each one is explained in `.env.example`.

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

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the backend and the frontend |
| `npm run build` | Builds the app for production |
| `npm start` | Runs the built app |
| `npm test` | Runs the backend tests (on a separate `_test` database) |
| `npm run lint` | Checks the code for problems |
| `npm run db:seed` | Resets the demo data |

---

## Status rules

Every form has exactly one status. Users don't pick a status directly: they take an action, and the server sets the status.

| From | To | Who |
| --- | --- | --- |
| New form, amount still due | Billing – Payment Not Done | Agent |
| New form, fully paid | Billing – Payment Done | Agent |
| Payment Not Done | Payment Done (when the amount due reaches 0) | Agent (own forms) or Admin |
| Payment Not Done / Done | Not Filled Completely (sent back with a note) | Admin |
| Not Filled Completely | Payment Not Done / Done (after the agent resubmits) | Agent (own forms) |
| Payment Done | Completed | Admin |
| Payment Not Done / Done / Not Filled Completely | Rejected (with a reason) | Admin |
| Completed or Rejected | No further changes | - |

---

## Assumptions & notes

- **"Not Filled Completely" means sent back.** Forms are always saved complete. This status means the admin sent the form back for missing or wrong information, and the agent fixes and resubmits it.
- **Only agents submit forms.** The brief made this optional for admins; admins review forms and manage agents.
- **Forms can't be deleted**, and Completed and Rejected are final.
- **There is no sign-up.** Admins create agents; the admin account comes from the demo data.
- **Money** is in Indian rupees (₹). Money paid on a rejected form is shown as refunded, not collected.
- **Dates** use Indian Standard Time and are shown as dd/mm/yyyy.
- **Hosting:** the live demo runs on Render with a Neon PostgreSQL database.
