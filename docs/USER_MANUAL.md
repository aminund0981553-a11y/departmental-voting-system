# Student User Manual

Welcome to the GSU Computer Science Departmental E-Voting System. This
guide walks you through everything a student can do in the app.

---

## 1. Create an Account

1. Open the app and click **Sign In / Register**.
2. Choose **Create account** and provide:
   - Full name
   - Registration number (e.g. `UG20/SCCS/1234`)
   - Department (defaults to Computer Science)
   - Level (100 – 500)
   - Gender, phone (optional)
   - Email address and a strong password
3. Click **Create account**. You'll be signed in immediately.

> Your registration number and profile details are used to verify
> eligibility to vote. Keep them accurate.

## 2. Sign In

1. Go to **Sign In**.
2. Enter the email and password you registered with.
3. On success you'll land on your **Dashboard**.

Forgot password? Use the **Forgot password** link on the sign-in page.

## 3. Your Dashboard

The dashboard has these sections:

| Menu item      | What it does                                              |
| -------------- | --------------------------------------------------------- |
| Overview       | Active elections and your nomination/vote status          |
| Elections      | Full list of elections you can vote in                    |
| Nominate       | Submit yourself as a candidate for an open position       |
| History        | Past elections you participated in + your vote receipts   |
| Profile        | Edit your personal details and photo                      |

## 4. Update Your Profile

1. Click **Profile** in the sidebar.
2. Update any field (name, level, phone, photo).
3. Click **Save changes**.

A complete profile is required before nominating yourself.

## 5. Run for Office (Submit a Nomination)

1. Click **Nominate** in the sidebar.
2. If an election is accepting nominations, its positions appear under
   **New nomination**.
3. Pick a position, write a short manifesto (max 2,000 chars), and
   optionally upload a photo.
4. Click **Submit nomination**.
5. Your nomination shows in **My nominations** with one of:
   - `pending` — awaiting review
   - `approved` — you're on the ballot
   - `rejected` — with a reason from the electoral committee

You can **withdraw** a pending nomination at any time.

## 6. Cast Your Vote

1. Open **Elections** (or click an active election on the Overview).
2. Click **Vote** next to an active election.
3. For each position, select **one** candidate.
4. Review your choices, then click **Submit ballot**.
5. You receive a **vote receipt** — a unique code you can keep.

**Rules enforced by the system:**

- You may vote only once per position per election.
- You must vote for at least one position, but you may skip positions.
- Once submitted, a ballot cannot be changed.

## 7. Verify Your Vote

1. Go to **History**.
2. Find the election.
3. Your receipt code is shown. Match it with any published receipt list.

## 8. View Results

- While an election is **active**, results are hidden.
- After the electoral committee **publishes results**, an "Results"
  button appears on the election card.
- Public results are also available at `/results/<election-id>` without
  logging in.

## 9. Sign Out

Click your avatar (top-right) → **Sign out**.

---

## Troubleshooting

**"No elections are currently accepting nominations."**
No election is in the `active` window with nominations open. Check back
later or contact the electoral committee.

**"You have already voted for this position."**
The system enforces one vote per position. This is by design.

**Nomination stuck on `pending`.**
Approvals are done manually by the electoral committee. Please wait or
contact them.

**Can't sign in.**
Confirm the email is correct. Use **Forgot password** to reset.

For anything else, contact the electoral committee via the **Contact**
page in the footer.
