# Dinely — Developer Handover Guide

> **Project:** Dinely — SaaS restaurant reservation platform  
> **Domain:** [dinely.co.uk](https://www.dinely.co.uk)  
> **Backend API:** [dinely.fly.dev](https://dinely.fly.dev)  
> **Handover date:** May 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Local Development Setup](#4-local-development-setup)
5. [Environment Variables](#5-environment-variables)
6. [Services & Access](#6-services--access)
   - [Supabase](#61-supabase)
   - [Fly.io](#62-flyio)
   - [Stripe](#63-stripe)
   - [Resend (Email)](#64-resend-email)
   - [Domain (dinely.co.uk)](#65-domain-dinelycouuk)
7. [Database Schema](#7-database-schema)
8. [Key API Routes](#8-key-api-routes)
9. [Deployment](#9-deployment)
10. [Codebase Structure](#10-codebase-structure)
11. [Access Handover Checklist](#11-access-handover-checklist-for-outgoing-developer)

---

## 1. Project Overview

Dinely is a multi-tenant SaaS platform for restaurant reservation management. Restaurants sign up, complete a guided setup wizard, and receive:

- A public booking page at `/book-a-table/:slug` for their customers
- A staff dashboard at `/staff/:slug/tables` for live table management
- An admin panel at `/admin` for reservations, settings, and floor map management
- Stripe Connect integration so restaurants can optionally collect deposits via card

The platform owner (super admin) has a dashboard at `/admin/super` and can onboard restaurants manually.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (React SPA)                │
│               hosted on Vercel (Hobby)               │
│               https://www.dinely.co.uk               │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS REST calls
                        ▼
┌─────────────────────────────────────────────────────┐
│          Express API (Node.js / TypeScript)          │
│            hosted on Fly.io (London region)          │
│            https://dinely.fly.dev/api/v1             │
└───────────────┬──────────────────────┬──────────────┘
                │                      │
        Supabase (DB + Auth)     Stripe (Payments)
                │
         Resend (Email)
```

- **Frontend** — React 19 SPA, deployed on **Vercel**
- **Backend** — Node.js/Express API, deployed on **Fly.io** (`dinely` app, London region)
- **Database + Auth** — **Supabase** (PostgreSQL + Supabase Auth)
- **Payments** — **Stripe** (SaaS subscriptions + Stripe Connect for per-restaurant deposits)
- **Email** — **Resend** (transactional email via `noreply@dinely.co.uk`)
- **Realtime** — Supabase Realtime (used directly by the frontend with the anon key for live table updates)

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19, React Router v7 |
| Frontend build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| HTTP client | Axios |
| Icons | Lucide React |
| Backend runtime | Node.js 20 (Docker) |
| Backend framework | Express 5 |
| Backend language | TypeScript 5 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| ORM/Query | Supabase JS client + raw `pg` driver |
| Validation | Zod |
| Payment | Stripe SDK v22 |
| Email | Resend |
| Containerisation | Docker (multi-stage, node:20-alpine) |
| Deployment (BE) | Fly.io |
| Deployment (FE) | Vercel |

---

## 4. Local Development Setup

### Prerequisites

- Node.js 20+
- npm
- [Fly CLI](https://fly.io/docs/flyctl/installing/) (optional, for backend deploys)

### Frontend

```bash
# From the project root
npm install
npm run dev
# Runs on http://localhost:5173
```

The dev server reads from `.env` or `.env.local` in the root. Create a `.env.local` to override:

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://qkumyhtgzsnwhzgaznig.supabase.co
VITE_SUPABASE_ANON_KEY=<get from Supabase dashboard or team>
VITE_STRIPE_PUBLISHABLE_KEY=<use test key for dev: pk_test_...>
```

### Backend

```bash
cd backend
npm install

# Create your local .env (copy from .env.example and fill in secrets)
cp .env.example .env
# Edit .env with real values (get from team/Fly secrets)

npm run dev
# Runs on http://localhost:3001
```

Test that it works:
```bash
curl http://localhost:3001/health
```

---

## 5. Environment Variables

### Frontend (`root/.env.local` for local, `.env.production` committed for Vercel)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (`https://dinely.fly.dev/api/v1` in prod) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (safe for client) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (safe for client) |

### Backend (`backend/.env` locally, Fly.io secrets in production)

| Variable | Description |
|---|---|
| `PORT` | Server port (default `3001`) |
| `NODE_ENV` | `development` or `production` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS — keep secret) |
| `JWT_SECRET` | Secret for signing session JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | JWT TTL (e.g. `30d`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `STRIPE_SECRET_KEY` | Stripe live/test secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_PRICE_STARTER_GBP` | Stripe Price ID for Starter plan (GBP) |
| `STRIPE_PRICE_STARTER_USD` | Stripe Price ID for Starter plan (USD) |
| `STRIPE_PRICE_PROFESSIONAL_GBP` | Stripe Price ID for Professional plan (GBP) |
| `STRIPE_PRICE_PROFESSIONAL_USD` | Stripe Price ID for Professional plan (USD) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from Stripe dashboard |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | From address (`noreply@dinely.co.uk`) |
| `FRONTEND_URL` | Frontend base URL for Stripe redirect URLs |

> **Production secrets** are stored as Fly.io secrets (not in any committed file). To view/edit them:
> ```bash
> fly secrets list --app dinely
> fly secrets set KEY=value --app dinely
> ```

---

## 6. Services & Access

### 6.1 Supabase

**What it's used for:** PostgreSQL database, Supabase Auth (user sign-up/login), Realtime subscriptions for live table updates.

**Project ref:** `qkumyhtgzsnwhzgaznig`  
**Dashboard:** [supabase.com/dashboard/project/qkumyhtgzsnwhzgaznig](https://supabase.com/dashboard/project/qkumyhtgzsnwhzgaznig)

**Key notes:**
- The backend uses the **service role key** which bypasses Row Level Security (RLS). Keep this key strictly server-side.
- The frontend uses the **anon key** only for Realtime subscriptions and Auth.
- All data mutations from the frontend go through the Express backend, not directly to Supabase.
- Row Level Security is enabled on core tables but primarily enforced server-side via the service role.

**Running migrations:**  
Migration SQL files are in `backend/migrations/`. Run them in order in the Supabase SQL Editor:

```
001_initial_schema.sql         — Core tables, indexes, RLS
002_atomic_reservation_rpc.sql — Atomic booking stored procedure
003_update_atomic_reservation.sql
004_update_atomic_locks.sql
005_widget_text_and_staff_ip_login.sql
006_reservation_completed_no_block.sql
add_email_branding_fields.sql
add_widget_bg_url.sql
```

**How to give access (for handover):**
1. Go to [supabase.com](https://supabase.com) → sign in with owner account
2. Open the `dinely` project
3. Go to **Settings → Team**
4. Click **Invite** and enter the new developer's email
5. Assign role: **Developer** (can view/edit data, schema, functions) or **Owner** if full control is needed

---

### 6.2 Fly.io

**What it's used for:** Hosting the Express backend API as a Docker container.

**App name:** `dinely`  
**Region:** `lhr` (London)  
**Live URL:** `https://dinely.fly.dev`  
**Config file:** `backend/fly.toml`

**Machine spec:** 1 shared CPU, 1 GB RAM. Auto-stops when idle, auto-starts on request. Min 1 machine always running.

**Useful commands:**
```bash
# View live logs
fly logs --app dinely

# SSH into the running machine
fly ssh console --app dinely

# View current secrets
fly secrets list --app dinely

# Deploy (from backend/ directory)
fly deploy --app dinely

# Check machine status
fly status --app dinely
```

**How to give access (for handover):**
1. Go to [fly.io](https://fly.io) → sign in with owner account
2. Go to **Account → Organizations** (or the personal org where `dinely` lives)
3. Go to **Members**
4. Click **Invite Member**, enter the new developer's email
5. Assign role: **Member** (can deploy and manage apps) or **Admin** if needed

Alternatively, the new developer can log in with the Fly CLI using their own account after being added:
```bash
fly auth login
fly apps list   # dinely should appear
```

---

### 6.3 Stripe

**What it's used for:** Two separate payment flows:

1. **SaaS Subscriptions** — Platform charges restaurants a monthly fee (Starter / Professional plans). Handled via Stripe Checkout sessions.
2. **Stripe Connect** — Each restaurant can connect their own Stripe account to collect reservation deposits from their customers. The platform uses `express` account type.

**Account:** Stripe account linked to the business email  
**Dashboard:** [dashboard.stripe.com](https://dashboard.stripe.com)

**Stripe Price IDs (production):**
| Plan | Currency | Price ID |
|---|---|---|
| Starter | GBP | `price_1TNGUKP28b9T5FKhQ3XjKMTr` |
| Starter | USD | `price_1TNGUKP28b9T5FKhqZ520a4I` |
| Professional | GBP | `price_1TNGULP28b9T5FKhZtaOAgvl` |
| Professional | USD | `price_1TNGULP28b9T5FKhPcuTbbi4` |

**Webhook:** The backend listens at `POST /api/v1/stripe/webhook`. The webhook signing secret (`STRIPE_WEBHOOK_SECRET`) must match what is configured in the Stripe Dashboard under **Developers → Webhooks**.

**How to give access (for handover):**
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Top-right → **Account settings → Team and security**
3. Click **Invite user**
4. Enter the new developer's email
5. Assign role: **Developer** (can view API keys, webhooks, test mode — cannot make payouts) or **Administrator**

> For local development, always use **test mode** keys (`sk_test_...` / `pk_test_...`). Never use live keys locally.

---

### 6.4 Resend (Email)

**What it's used for:** Sending transactional emails (reservation confirmations, staff invites, password resets) from `noreply@dinely.co.uk`.

**Dashboard:** [resend.com](https://resend.com)

**How to give access (for handover):**
1. Sign in to [resend.com](https://resend.com) with the owner account
2. Go to **Settings → Team**
3. Invite the new developer by email
4. Assign the **Member** role

The `RESEND_API_KEY` in Fly.io secrets is the active production key. Do not rotate it without updating the Fly secret simultaneously.

---

### 6.5 Domain (dinely.co.uk)

**Domain registrar/DNS:** Check with the current owner — likely managed in the registrar's control panel or Cloudflare.

**DNS records to be aware of:**
- `www.dinely.co.uk` → Vercel (frontend)
- `dinely.co.uk` → redirect to `www.dinely.co.uk`
- `noreply@dinely.co.uk` → Resend (requires SPF/DKIM records set up in DNS)

**How to give access:** Transfer or share credentials for the domain registrar account where `dinely.co.uk` is registered. If using Cloudflare, add the new developer to the Cloudflare account as a member of the zone.

---

## 7. Database Schema

Core tables in Supabase PostgreSQL:

| Table | Purpose |
|---|---|
| `organizations` | One row per restaurant. Holds all config (hours, slug, Stripe account ID, setup status). |
| `staff_members` | Restaurant staff with roles: `owner`, `manager`, `host`, `viewer`. |
| `tables` | Physical tables. Linked to `floor_areas`. Has capacity, shape, position for floor map. |
| `floor_areas` | Named zones within a restaurant (e.g. Main Dining, Outdoor). |
| `reservations` | All bookings. Status enum: `pending → confirmed → arriving → seated → completed / cancelled / no_show`. |
| `customers` | Guest profiles, linked to `auth.users`. |
| `customer_restaurant_link` | Many-to-many between customers and restaurants (tracks per-restaurant visit count). |
| `waiting_list` | Walk-in queue entries. |
| `api_keys` | Per-restaurant API keys for third-party widget integrations. |
| `audit_log` | Immutable log of all admin actions. |
| `platform_settings` | Key-value store for global platform config. |
| `super_admins` | Platform-level super admins (separate from restaurant staff). |
| `email_templates` | Per-restaurant customisable email templates. |

The atomic reservation logic (preventing double-booking under concurrent requests) is implemented as a PostgreSQL stored procedure in `migrations/002_atomic_reservation_rpc.sql`.

---

## 8. Key API Routes

Base path: `/api/v1`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `POST` | `/organizations` | None | Create new restaurant (sign-up) |
| `GET` | `/organizations/:id` | JWT | Get org details |
| `PATCH` | `/organizations/:id` | JWT (owner/manager) | Update org config |
| `GET` | `/organizations/:id/dashboard/stats` | JWT (viewer+) | Dashboard stats |
| `GET` | `/organizations/:id/reservations` | JWT (viewer+) | List reservations |
| `POST` | `/organizations/:id/reservations` | API key or JWT | Create reservation |
| `PATCH` | `/organizations/:id/reservations/:rid` | JWT (host+) | Update reservation status |
| `GET` | `/organizations/:id/tables` | JWT or API key | List tables |
| `GET` | `/organizations/:id/staff` | JWT (manager+) | List staff |
| `POST` | `/organizations/:id/staff` | JWT (manager+) | Invite staff member |
| `GET` | `/organizations/:id/waiting-list` | JWT | Get waiting list |
| `POST` | `/stripe/connect/:id` | JWT (owner) | Create Stripe Connect link |
| `GET` | `/stripe/connect/:id/status` | JWT (owner) | Get Stripe Connect status |
| `POST` | `/stripe/webhook` | Stripe signature | Stripe webhook handler |
| `POST` | `/subscriptions/checkout` | None | Create Stripe Checkout session |
| `GET` | `/subscriptions/:orgId` | JWT | Get subscription status |

Authentication uses Bearer JWT tokens issued by the backend on login. Staff login is separate from customer/owner login and issues its own token.

---

## 9. Deployment

### Backend (Fly.io)

The backend is containerised with Docker. Deploying is a single command from the `backend/` directory:

```bash
cd backend
fly deploy --app dinely
```

This builds the Docker image and deploys it. The multi-stage `backend/Dockerfile` compiles TypeScript in a builder stage and runs the compiled JS in a lean production stage.

> **Note:** There is also a root-level `Dockerfile` and `fly.toml` that represent an alternative combined deployment where the frontend static build is served by the backend on the same Fly.io machine. This is not the current active setup (frontend runs on Vercel), but kept as a fallback option.

The CI/CD workflow is currently manual — there is no GitHub Actions pipeline. Deploying requires the Fly CLI authenticated against the account that owns the `dinely` app.

### Frontend (Vercel)

The frontend is deployed on Vercel. It is connected to the GitHub repository. Pushes to `main` trigger automatic deployments.

**Environment variables** set in Vercel (mirror `.env.production`):
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

To give the new developer Vercel access:
1. Log in to [vercel.com](https://vercel.com) with the owner account
2. Go to **Team Settings → Members**
3. Invite by email with **Member** role (or **Owner** for full control)

---

## 10. Codebase Structure

```
dinely/                         ← Monorepo root
├── src/                        ← React frontend source
│   ├── App.tsx                 ← Route definitions
│   ├── main.tsx                ← Entry point
│   ├── pages/                  ← Page-level components
│   │   ├── admin/              ← Admin dashboard tabs
│   │   ├── staff/              ← Staff table management
│   │   ├── reservation/        ← Reservation wizard (logged-in)
│   │   ├── user-reservation/   ← Reservation wizard (customer account)
│   │   ├── public-reservation/ ← Public booking widget (/book-a-table/:slug)
│   │   └── superadmin/         ← Platform super admin UI
│   ├── components/             ← Shared UI components
│   ├── context/                ← AuthContext, ThemeContext
│   ├── hooks/                  ← useRealtimeReservations (Supabase Realtime)
│   └── services/
│       ├── api.ts              ← Axios client (attaches JWT Bearer token)
│       └── supabaseClient.ts   ← Supabase JS client (anon key)
├── backend/                    ← Express API source
│   ├── src/
│   │   ├── server.ts           ← Entry point
│   │   ├── app.ts              ← Express app setup, middleware, routes
│   │   ├── config/
│   │   │   ├── env.ts          ← Zod-validated env vars (fails fast on startup)
│   │   │   ├── database.ts     ← Supabase client setup
│   │   │   └── cors.ts         ← CORS config
│   │   ├── middleware/
│   │   │   ├── auth.ts         ← JWT verification
│   │   │   ├── rbac.ts         ← Role-based access (owner/manager/host/viewer)
│   │   │   ├── apiKeyAuth.ts   ← API key authentication for widget integrations
│   │   │   └── errorHandler.ts ← Global error handler
│   │   ├── routes/             ← Route definitions
│   │   ├── controllers/        ← Request handlers
│   │   └── services/           ← Business logic
│   ├── migrations/             ← SQL migration files (run manually in Supabase)
│   ├── fly.toml                ← Fly.io deployment config
│   ├── Dockerfile              ← Multi-stage Docker build
│   └── .env.example            ← Template for local .env
├── .env.production             ← Frontend env vars committed for Vercel build
└── HANDOVER.md                 ← This file
```

### Role system

Staff roles in ascending access order: `viewer < host < manager < owner`

- **viewer** — read-only dashboard access
- **host** — can update reservation status (seat/complete guests)
- **manager** — can manage tables, staff, settings
- **owner** — full access including Stripe Connect and billing

Super admins are a separate concept stored in the `super_admins` table with platform-wide access.

---

## 11. Access Handover Checklist (for outgoing developer)

Use this checklist to systematically hand over access to the incoming developer.

### What the incoming developer needs to give you first
- [ ] Their email address (for service invitations)
- [ ] Their GitHub account username (for repo access)

### Services to invite them to

| Service | Steps |
|---|---|
| **GitHub** | Repo Settings → Collaborators → Add by username or email |
| **Supabase** | Project → Settings → Team → Invite → assign Developer or Owner |
| **Fly.io** | Organization → Members → Invite Member |
| **Stripe** | Account Settings → Team and Security → Invite User (Developer or Admin) |
| **Resend** | Settings → Team → Invite Member |
| **Vercel** | Team Settings → Members → Invite |
| **Domain registrar** | Add as member/user, or share credentials securely (use a password manager) |

### Secrets to share securely

Share these via a password manager (1Password, Bitwarden) or an encrypted channel — never plaintext email or Slack:

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET` (current production value)
- [ ] `STRIPE_SECRET_KEY` (live)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] Domain registrar login credentials (if not using member invite)

### After handover

- [ ] Remove your own accounts/access from services where appropriate
- [ ] Rotate any secrets that were shared in plaintext
- [ ] Transfer billing ownership in Fly.io / Vercel / Stripe / Supabase to the new owner if required
