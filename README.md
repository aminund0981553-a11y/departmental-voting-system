# GSU CS Departmental E-Voting System

A secure, transparent, and auditable online voting platform built for the
Department of Computer Science, Gombe State University. It replaces paper
ballots with a role-based web application that handles nominations, voting,
real-time tallying, and full audit logging.

**Live app:** https://departmental-voting-system.lovable.app

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [User Roles](#user-roles)
6. [Getting Started (Local Dev)](#getting-started-local-dev)
7. [Environment Variables](#environment-variables)
8. [Project Structure](#project-structure)
9. [Database Schema](#database-schema)
10. [Security Model](#security-model)
11. [Deployment](#deployment)
12. [Documentation Index](#documentation-index)

---

## Overview

The Departmental E-Voting System (DEVS) lets students:

- Register with their matriculation details
- View open elections and positions
- Submit nominations to contest a position
- Cast a single secret ballot per position in each election
- Verify their vote via a unique receipt
- View published results after an election ends

Administrators can:

- Create elections, positions, and candidate slates
- Approve or reject nominations with reasons
- Open, pause, end, and publish results for an election
- View live tallies and export audit logs

---

## Features

- Email/password authentication with per-user role assignment
- Row-Level Security (RLS) on every table
- One-person-one-vote enforcement per position via database constraints
- Server-side vote tallying via `SECURITY DEFINER` RPCs
- Vote receipts for verification
- Full audit log of every vote cast
- Server-side rendered pages with SEO metadata
- Responsive UI with light/dark theme

---

## Technology Stack

| Layer            | Technology                                         |
| ---------------- | -------------------------------------------------- |
| Framework        | TanStack Start v1 (React 19 + SSR)                 |
| Build            | Vite 7                                             |
| Styling          | Tailwind CSS v4 + shadcn/ui                        |
| Backend          | Lovable Cloud (Postgres + Auth + Storage)          |
| Server logic     | TanStack `createServerFn` (Cloudflare Workers)     |
| Data fetching    | TanStack Query                                     |
| Forms            | React Hook Form + Zod                              |
| Hosting          | Lovable (Cloudflare edge)                          |

---

## System Architecture

```text
┌────────────────────┐   HTTPS    ┌──────────────────────┐
│  Browser (React)   │──────────▶ │  TanStack Start SSR  │
│  - Route loaders   │            │  (Cloudflare Worker) │
│  - useSuspenseQuery│◀──────────│  - createServerFn    │
└────────────────────┘  streamed  └──────────┬───────────┘
                                             │ Postgres wire
                                             ▼
                                   ┌──────────────────────┐
                                   │   Lovable Cloud DB   │
                                   │   - Auth             │
                                   │   - RLS + policies   │
                                   │   - SECURITY DEFINER │
                                   │     RPCs             │
                                   │   - Storage buckets  │
                                   └──────────────────────┘
```

Auth-scoped calls use the signed-in user's JWT; RLS enforces access.
Admin-only operations run through `SECURITY DEFINER` RPCs that check
`has_role(auth.uid(), 'admin')` before mutating data.

---

## User Roles

| Role        | Capabilities                                                                 |
| ----------- | ---------------------------------------------------------------------------- |
| `student`   | Register, edit profile, view elections, nominate self, vote, view receipts   |
| `admin`     | Everything above + manage elections, positions, candidates, voters, results  |

The first registered user can claim admin via `claim_first_admin()`. All
subsequent role changes must be made by an existing admin.

---

## Getting Started (Local Dev)

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY

# 3. Run the dev server
bun dev
# → http://localhost:8080
```

Lint / format:

```bash
bun run lint
bun run format
```

Build for production:

```bash
bun run build
```

---

## Environment Variables

| Variable                        | Where used   | Description                        |
| ------------------------------- | ------------ | ---------------------------------- |
| `SUPABASE_URL`                  | Server       | Backend URL                        |
| `SUPABASE_PUBLISHABLE_KEY`      | Server       | Public API key (RLS applies)       |
| `VITE_SUPABASE_URL`             | Browser      | Same URL exposed to the client     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser      | Same public key exposed to client  |

`SUPABASE_SERVICE_ROLE_KEY` is managed by Lovable Cloud and is not exposed
to the app. All privileged operations use `SECURITY DEFINER` RPCs instead.

---

## Project Structure

```text
src/
├── routes/                     # File-based routing (TanStack)
│   ├── __root.tsx              # App shell + <head>
│   ├── index.tsx               # Landing page
│   ├── auth.tsx                # Sign in / sign up
│   ├── elections.tsx           # Public election list
│   ├── results.$id.tsx         # Public results
│   ├── _authenticated/         # Gated subtree
│   │   ├── route.tsx           # Auth gate
│   │   ├── dashboard.*.tsx     # Student dashboard
│   │   └── admin.*.tsx         # Admin console
│   └── api/public/             # Public webhooks/cron
├── lib/
│   ├── admin.functions.ts      # Admin server functions
│   ├── student.functions.ts    # Student server functions
│   └── api/public.functions.ts # Public read-only fns
├── integrations/supabase/      # Auto-generated backend client
├── components/                 # UI components (shadcn)
└── hooks/                      # Reusable hooks

supabase/
└── migrations/                 # SQL migrations (versioned)
```

---

## Database Schema

| Table         | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `profiles`    | Student personal details (1:1 with auth.users) |
| `user_roles`  | Per-user role assignments (admin/student)      |
| `elections`   | Election metadata + status                     |
| `positions`   | Positions being contested in an election       |
| `candidates`  | Nominations with approval status               |
| `votes`       | Cast ballots (unique per voter+position)       |
| `audit_logs`  | Append-only audit trail                        |

Election status enum: `draft → scheduled → active → paused → ended → published`.

### Key RPCs

- `has_role(_user_id, _role)` — role check helper
- `claim_first_admin()` — one-time admin bootstrap
- `get_admin_candidates()` — admin candidate listing
- `admin_update_candidate_status(...)` — approve/reject
- `admin_delete_candidate(_candidate_id)` — remove nomination
- `get_election_tallies(_election_id)` — vote counts
- `log_audit(_action, _metadata)` — audit trail writer

---

## Security Model

- **RLS everywhere.** Every `public` table has RLS enabled and explicit
  policies. Grants are scoped: `authenticated` gets DML on user-facing
  tables; `anon` only gets `SELECT` on public-facing rows.
- **Roles in a separate table.** `user_roles` is not on the profile.
  All role checks go through the `has_role()` `SECURITY DEFINER` function
  to avoid recursive RLS.
- **No client-side privilege checks.** Admin gates are enforced server-side
  in RPCs and server functions via `has_role(auth.uid(), 'admin')`.
- **One-vote guarantee.** `votes` has a unique constraint on
  `(voter_id, position_id)`; duplicate inserts fail at the DB.
- **Audit trail.** Every vote writes to `audit_logs` via `log_audit()`.

Review `docs/SECURITY.md` for the full threat model.

---

## Deployment

The app is deployed on Lovable's Cloudflare edge. Pushing changes through
Lovable rebuilds and publishes automatically.

- Preview: https://id-preview--2dae52c0-cafb-4a16-81ec-b81fac7d8b17.lovable.app
- Production: https://departmental-voting-system.lovable.app

---

## Documentation Index

| Document                                        | Audience         |
| ----------------------------------------------- | ---------------- |
| [docs/USER_MANUAL.md](docs/USER_MANUAL.md)      | Students         |
| [docs/ADMIN_MANUAL.md](docs/ADMIN_MANUAL.md)    | Electoral admins |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Developers    |
| [docs/API.md](docs/API.md)                      | Developers       |
| [docs/DATABASE.md](docs/DATABASE.md)            | Developers/DBAs  |
| [docs/SECURITY.md](docs/SECURITY.md)            | Reviewers        |
| [docs/FAQ.md](docs/FAQ.md)                      | Everyone         |

---

## License

Academic project — Department of Computer Science, Gombe State University.
