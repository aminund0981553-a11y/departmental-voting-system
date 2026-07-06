# Database Schema

Backend: Lovable Cloud (Postgres). All application tables live in the
`public` schema. Every table has RLS enabled and explicit grants.

## Enums

```sql
app_role         := 'admin' | 'student'
election_status  := 'draft' | 'scheduled' | 'active' | 'paused' | 'ended' | 'published'
```

## Tables

### `profiles`
1:1 with `auth.users`. Auto-created by the `handle_new_user()` trigger.

| Column       | Type      | Notes                                 |
| ------------ | --------- | ------------------------------------- |
| id           | uuid PK   | references `auth.users(id)`           |
| full_name    | text      |                                       |
| reg_number   | text      | unique matric number                  |
| department   | text      | default `Computer Science`            |
| level        | text      | 100–500                               |
| gender       | text      |                                       |
| phone        | text      |                                       |
| photo_url    | text      |                                       |
| created_at   | timestamptz |                                     |
| updated_at   | timestamptz | auto-set via trigger                |

### `user_roles`
Role assignments, separate from `profiles` for security.

| Column   | Type      | Notes                                     |
| -------- | --------- | ----------------------------------------- |
| id       | uuid PK   |                                           |
| user_id  | uuid      | references `auth.users(id)` on delete cascade |
| role     | app_role  |                                           |
| unique   | (user_id, role) |                                     |

### `elections`

| Column             | Type              | Notes                             |
| ------------------ | ----------------- | --------------------------------- |
| id                 | uuid PK           |                                   |
| title              | text              |                                   |
| description        | text              |                                   |
| starts_at          | timestamptz       |                                   |
| ends_at            | timestamptz       |                                   |
| status             | election_status   | default `draft`                   |
| results_published  | boolean           | default `false`                   |
| created_by         | uuid              |                                   |
| created_at         | timestamptz       |                                   |
| updated_at         | timestamptz       |                                   |

### `positions`

| Column         | Type      | Notes                                    |
| -------------- | --------- | ---------------------------------------- |
| id             | uuid PK   |                                          |
| election_id    | uuid FK   | → elections.id                           |
| title          | text      |                                          |
| description    | text      |                                          |
| display_order  | int       | for UI ordering                          |

### `candidates`

| Column         | Type      | Notes                                    |
| -------------- | --------- | ---------------------------------------- |
| id             | uuid PK   |                                          |
| position_id    | uuid FK   | → positions.id                           |
| user_id        | uuid      | nullable (admin-added candidates)        |
| full_name      | text      |                                          |
| manifesto      | text      |                                          |
| photo_url      | text      | Storage bucket `candidate-photos`        |
| approved       | boolean   | default `false`                          |
| status         | text      | `pending` / `approved` / `rejected`      |
| reject_reason  | text      |                                          |
| submitted_at   | timestamptz |                                        |

### `votes`

| Column         | Type      | Notes                                    |
| -------------- | --------- | ---------------------------------------- |
| id             | uuid PK   |                                          |
| election_id    | uuid FK   |                                          |
| position_id    | uuid FK   |                                          |
| candidate_id   | uuid FK   |                                          |
| voter_id       | uuid      | references `auth.users(id)`              |
| receipt        | text      | unique per vote                          |
| created_at     | timestamptz |                                        |
| UNIQUE         | (voter_id, position_id) |                            |

### `audit_logs`

| Column     | Type       | Notes                     |
| ---------- | ---------- | ------------------------- |
| id         | uuid PK    |                           |
| user_id    | uuid       |                           |
| action     | text       | e.g. `vote_cast`          |
| metadata   | jsonb      |                           |
| created_at | timestamptz|                           |

## RLS Summary

- `profiles` — user reads/writes own row; admins read all.
- `user_roles` — user reads own; only admins mutate via RPC.
- `elections`, `positions` — public `SELECT`; admin-only write.
- `candidates` — `SELECT` for authenticated; admin-only write (via RPCs);
  each user can INSERT/UPDATE their own pending row.
- `votes` — user can `INSERT` own; can `SELECT` own only; admins can
  `SELECT` all tallies via `get_election_tallies`.
- `audit_logs` — `INSERT` via `log_audit` RPC only; admin-only `SELECT`.

## Triggers

- `tg_set_updated_at` — sets `updated_at` on relevant tables.
- `handle_new_user` (on `auth.users`) — seeds a `profiles` row and a
  default `student` `user_roles` row.

## Storage Buckets

| Bucket             | Public | Purpose                    |
| ------------------ | ------ | -------------------------- |
| `candidate-photos` | No     | Candidate photos           |
