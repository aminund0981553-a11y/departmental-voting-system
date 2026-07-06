# Security Overview

This document summarises the security posture of the E-Voting System.

## Principles

1. **Defence in depth.** Application checks + database RLS + `SECURITY
   DEFINER` RPCs. Client-side checks are cosmetic.
2. **Least privilege.** Every DB role has the minimum grants required.
3. **No secrets in the client.** Only the publishable/anon key is exposed.

## Authentication

- Email + password via Lovable Cloud Auth.
- JWTs are short-lived and refreshed automatically.
- Passwords are stored hashed by the backend — never in the app DB.
- Auth middleware `requireSupabaseAuth` runs before every protected
  server function.

## Authorisation

- Roles are stored in `public.user_roles`, **not** on `profiles`.
- Role checks go through `has_role(uuid, app_role)` — a `SECURITY
  DEFINER` function with `search_path = public`.
- Admin-only mutations use `SECURITY DEFINER` RPCs that check
  `has_role(auth.uid(), 'admin')` at the top of the function.

## Row-Level Security

- Every table in `public` has RLS enabled.
- Policies scope reads/writes to `auth.uid()` where appropriate.
- Grants are:
  - `authenticated`: table-level DML on user-facing tables.
  - `anon`: `SELECT` only on public rows (`elections`, `positions`,
    approved `candidates` for public results).
  - `service_role`: full access (used only by verified webhooks).

## Vote Integrity

- **One vote per position** — enforced by `UNIQUE (voter_id, position_id)`
  in `public.votes`. Duplicates fail at the DB.
- **Secret ballot** — `audit_logs.metadata` never stores the candidate
  chosen, only that a vote for a `position_id` occurred.
- **Receipts** — every vote returns a unique receipt to the voter for
  verification.
- **Tallies** — computed server-side by `get_election_tallies` RPC.

## Public Endpoints

- Only routes under `/api/public/*` are unauthenticated.
- The election scheduler webhook validates an HMAC signature before
  running.

## Data at Rest & In Transit

- All traffic is HTTPS (Cloudflare edge).
- Database encryption at rest is managed by Lovable Cloud.
- Storage buckets are private by default (`candidate-photos` is private).

## Threat Considerations

| Threat                              | Mitigation                                          |
| ----------------------------------- | --------------------------------------------------- |
| Duplicate voting                    | DB unique constraint                                |
| Privilege escalation                | Roles in separate table + `has_role` SECURITY DEFINER|
| Client-side admin flag tampering    | Server validates on every call                      |
| Recursive RLS                       | `has_role` uses `SECURITY DEFINER` bypass           |
| Session hijacking                   | Short-lived JWT, HTTPS-only                         |
| Webhook spoofing                    | HMAC signature verification                         |
| Voter deanonymisation               | Audit log stores no candidate choice                |

## Reporting Issues

Contact the Electoral Committee or the department's IT liaison via the
**Contact** page. Please do not disclose vulnerabilities publicly before
a fix is deployed.
