# API Reference

All app-internal server logic uses TanStack `createServerFn`, which is
called from the browser via typed RPC (POST). Public HTTP endpoints
(webhooks, cron) live under `src/routes/api/public/`.

Return values are JSON. Errors surface as thrown `Error` with a message.

---

## Auth

Authentication uses Lovable Cloud email/password. The browser client
(`@/integrations/supabase/client`) handles sign-in, sign-up, password
reset, and session storage. Session tokens are attached to server
function calls automatically via `attachSupabaseAuth` in `src/start.ts`.

---

## Student Functions (`src/lib/student.functions.ts`)

### `getStudentDashboardData()`
Returns active elections, the user's nominations, and vote history.

### `getNominatePageData()`
Returns elections currently accepting nominations, their positions,
and the user's existing nominations + profile.

### `submitNomination({ position_id, manifesto, photo_url? })`
Creates a `pending` candidate row for the caller.

### `withdrawNomination({ candidate_id })`
Deletes a `pending` nomination owned by the caller.

### `getVoteBallotData({ election_id })`
Returns positions, approved candidates, and the user's already-cast
votes for the given election.

### `submitVote({ election_id, choices: [{ position_id, candidate_id }] })`
Inserts one vote per selected position. Returns a receipt code.
Duplicate votes fail at the database.

---

## Admin Functions (`src/lib/admin.functions.ts`)

All admin functions call `checkAdminAccess()` or a `SECURITY DEFINER`
RPC that verifies `has_role(auth.uid(), 'admin')`.

### `claimFirstAdmin()`
One-time bootstrap. Succeeds only if no admin exists.

### `getAdminCandidates()`
Returns all candidates + related elections/positions/profiles.

### `createPosition({ election_id, title, description?, display_order? })`

### `createCandidate({ position_id, full_name, manifesto?, approved? })`

### `createCandidatesBatch({ candidates: [...] })`
Bulk insert helper.

### `updateCandidate({ id, approved?, reject_reason? })`
Approve/reject a candidate. Writes to `admin_update_candidate_status` RPC.

### `deleteCandidate({ id })`
Removes a candidate via `admin_delete_candidate` RPC.

### `deletePosition({ id })`
Deletes an empty position.

---

## Database RPCs (called via `supabase.rpc(...)`)

| RPC                              | Args                                              | Returns    |
| -------------------------------- | ------------------------------------------------- | ---------- |
| `has_role`                       | `_user_id uuid, _role app_role`                   | `boolean`  |
| `claim_first_admin`              | —                                                 | `jsonb`    |
| `get_admin_candidates`           | —                                                 | `setof`    |
| `admin_update_candidate_status`  | `_candidate_id, _approved, _reject_reason?`       | `void`     |
| `admin_delete_candidate`         | `_candidate_id`                                   | `void`     |
| `get_election_tallies`           | `_election_id uuid`                               | `setof`    |
| `get_my_candidate_reject_reason` | `_candidate_id uuid`                              | `text`     |
| `log_audit`                      | `_action text, _metadata jsonb`                   | `void`     |

---

## Public HTTP Endpoints

### `POST /api/public/hooks/election-scheduler`
Called by pg_cron / external scheduler to transition elections between
`scheduled → active → ended` based on `starts_at` / `ends_at`.

- Requires a valid `x-webhook-signature` HMAC header.
- Returns `200 ok` on success, `401` on invalid signature.

---

## Error Codes

| Message                              | Meaning                                       |
| ------------------------------------ | --------------------------------------------- |
| `Unauthorized`                       | No session / expired token                    |
| `Unauthorized: admin access required`| Caller is not admin                           |
| `admin access required` (RPC)        | Same, raised from DB                          |
| `duplicate key value ...`            | One-vote-per-position enforcement kicked in   |
| `not authenticated` (RPC)            | RPC called without an auth JWT                |
