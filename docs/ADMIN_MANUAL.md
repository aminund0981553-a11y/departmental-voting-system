# Administrator Manual

This manual is for the Electoral Committee members who administer the
GSU CS Departmental E-Voting System.

---

## 1. Becoming an Administrator

The **first** user to register can self-promote using the built-in
`claim_first_admin()` RPC. On the Admin page, click **Claim admin
access**. This works only if no admin exists yet.

All subsequent admins must be assigned by an existing admin from the
**Admin → Voters** page.

## 2. Admin Console Layout

| Menu item     | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| Overview      | Snapshot of active election, turnout, pending nominations   |
| Elections     | Create/edit elections, positions, and control status        |
| Candidates    | Approve/reject nominations, add candidates manually         |
| Voters        | View users, assign/revoke admin role, export voter roll     |
| Votes         | Live tallies per position, results publishing controls      |
| Audit log     | Chronological log of every vote and privileged action       |

## 3. Running an Election — End to End

### 3.1 Create the Election

1. Go to **Admin → Elections → New election**.
2. Fill in:
   - Title (e.g. "2026 Departmental Elections")
   - Description
   - `starts_at` and `ends_at` (with timezone)
3. Save. Status starts as `draft`.

### 3.2 Add Positions

1. Open the election → **Positions → Add position**.
2. Provide title, description, and display order.
3. Repeat for each position (President, Vice President, etc.).

### 3.3 Open Nominations

1. Change status from `draft` → `scheduled`.
2. Once the `starts_at` time is reached (or you set `active`), students
   can submit nominations.

### 3.4 Review Nominations

1. Go to **Admin → Candidates**.
2. Filter by position or status.
3. For each nominee, choose **Approve** or **Reject** (with reason).
4. Approved candidates automatically appear on the ballot.

You can also **manually add** a candidate who did not self-nominate.

### 3.5 Voting Window

1. Set the election status to `active` at the scheduled start.
2. Monitor turnout in **Admin → Votes**.
3. Use `paused` to temporarily freeze voting (rare — e.g. incidents).

### 3.6 Close & Publish Results

1. When `ends_at` passes, set status to `ended`.
2. Review the final tallies in **Admin → Votes**.
3. Click **Publish results** to move status to `published`. Public
   results become visible on `/results/<election-id>`.

## 4. Managing Voters

- **Admin → Voters** lists every registered profile.
- Grant admin: select a user → **Assign admin role**.
- Revoke admin: same menu → **Revoke admin role**. You cannot revoke
  your own admin role — ask another admin to do it.
- Export the voter roll as CSV via **Export**.

## 5. Audit Log

- Every ballot cast writes an `audit_logs` row with anonymised metadata
  (position, election, receipt hash — never the candidate chosen).
- Admin privilege changes and status transitions are also recorded.
- Export the log as CSV for incident review.

## 6. Data Safety

- The database is backed up automatically by Lovable Cloud.
- Never share your admin password.
- Do not delete elections that have votes cast — set them to `ended`
  and archive instead. Deletion is permanent.

## 7. Handling Disputes

1. Pause the election (`active` → `paused`).
2. Consult the audit log and vote counts.
3. Take a corrective action (reject a candidate, extend the window,
   annotate the audit log).
4. Resume when resolved.

---

## Support Runbook

| Symptom                                            | First check                                              |
| -------------------------------------------------- | -------------------------------------------------------- |
| Students can't see any active election             | Election `status` is not `active`, or the window is past |
| Students can't nominate                            | No positions added, or nominations closed                |
| Candidate approved but not on the ballot           | Election is not `active` yet, or candidate `approved=false` |
| Duplicate-vote error for a student                 | Working as intended — one vote per position              |
| Vote counts look wrong                             | Compare tallies with `audit_logs`; contact developer     |
