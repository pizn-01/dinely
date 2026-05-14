# Dinely — Client documentation phases

This document explains **how we produced the handover materials** and **how you can use them in order** for accuracy. The technical team used the live codebase (database migrations, API routes, React pages) so descriptions match what the software actually does.

---

## Phase 1 — Map the system (completed)

**Goal:** Build a single mental model of actors, data, and screens.

**What was verified**

- **Roles:** Restaurant owner signs up as `admin`; platform operator may use `super_admin`; invited team members are stored as `staff_members` with roles such as `manager` and `host` (see `backend/src/types/enums.ts` and `src/context/AuthContext.tsx`).
- **Core tables:** `organizations`, `floor_areas`, `tables`, `staff_members`, `customers`, `reservations`, `waiting_list`, plus platform tables such as `super_admins` (see `backend/migrations/001_initial_schema.sql`).
- **Public booking:** Embeddable wizard at `/book-a-table/:slug` (or query `?restaurant=slug`), calling `GET /public/:slug/info`, slots/tables APIs, then `POST /public/:slug/reserve`.
- **Atomic booking:** Reservation insert runs through PostgreSQL function `create_reservation_atomic` (row lock + overlap check; premium override logic in `backend/migrations/003_update_atomic_reservation.sql`).
- **Realtime UI:** After a public booking, the backend broadcasts on Supabase channel `restaurant_{organizationId}`; admin and staff UIs subscribe via `useRealtimeReservations`.

**Deliverable:** Architecture diagram and glossary inside the role-specific guides.

---

## Phase 2 — Customer and guest journeys (completed)

**Goal:** Document every path a diner uses without staff training noise.

**Covered flows**

- Anonymous guest booking (`BookATableWizard`), optional return URL, confirmation page.
- Logged-in member booking (`UserReservationWizard`), customer dashboard (`/dashboard`).
- Premium / VIP booking entry points (`PremiumReservation`, related confirm pages) and how VIP priority interacts with the database function.
- Self-service cancellation where implemented (`/cancel/:reservationId` and public cancel API).

**Deliverable:** [`CLIENT_HANDOVER_CUSTOMER_AND_GUEST.md`](./CLIENT_HANDOVER_CUSTOMER_AND_GUEST.md)

---

## Phase 3 — Restaurant admin / owner (completed)

**Goal:** Everything configurable before service: branding, hours, tables, floor, staff invites, waiting list, Stripe-related options where present.

**Verified UI:** `AdminDashboard` tabs — Reservation, Tables Management, Staff Management, Waiting List, Floor Map, Support & Feedback, Settings (`src/pages/admin/AdminDashboard.tsx`).

**Deliverable:** [`CLIENT_HANDOVER_ADMIN_AND_OWNER.md`](./CLIENT_HANDOVER_ADMIN_AND_OWNER.md)

---

## Phase 4 — Staff daily operations (completed)

**Goal:** Shift workflows on the live floor map, reservation list, status changes, walk-ins, table merge (when enabled), date switching.

**Verified UI:** `StaffTableManagement`, `StaffReservationWizard`, staff login paths in `src/utils/restaurantRoutes.ts`.

**Deliverable:** [`CLIENT_HANDOVER_STAFF_OPERATIONS.md`](./CLIENT_HANDOVER_STAFF_OPERATIONS.md)

---

## Phase 5 — Optional polish (your choice)

- Record short Loom-style videos walking through each guide section.
- Replace example domains in guides with your production hostname when you deploy.
- Translate guides if you serve non–English-speaking managers.

---

## Existing documents (still valid)

These were written earlier and remain useful quick reads:

- [`Client_Overview.md`](./Client_Overview.md) — high-level story.
- [`admin_guide.md`](./admin_guide.md) — concise admin checklist.
- [`staff_guide.md`](./staff_guide.md) — concise staff checklist.
- [`customer_booking_guide.md`](./customer_booking_guide.md) / [`member_guide.md`](./member_guide.md) — short policy-style notes.

The **CLIENT_HANDOVER_*** files add **technical accuracy** (what the database and APIs enforce) and **diagrams** in one place for a non-technical client.

---

## Suggested reading order for the client

1. [`Client_Overview.md`](./Client_Overview.md) — big picture.
2. [`CLIENT_HANDOVER_CUSTOMER_AND_GUEST.md`](./CLIENT_HANDOVER_CUSTOMER_AND_GUEST.md) — what diners see.
3. [`CLIENT_HANDOVER_ADMIN_AND_OWNER.md`](./CLIENT_HANDOVER_ADMIN_AND_OWNER.md) — setup and control.
4. [`CLIENT_HANDOVER_STAFF_OPERATIONS.md`](./CLIENT_HANDOVER_STAFF_OPERATIONS.md) — day-of service.
