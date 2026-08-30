# Policy-Decision Migration Handoff

## Purpose

The existing Supabase database records policy outcomes in `audit_logs`, but the RecoverAI product requires a first-class, immutable policy-decision ledger. The separate migration file [`database/03_add_policy_decisions.sql`](../database/03_add_policy_decisions.sql) adds one table, three supporting indexes, row-level security, and an append-only trigger. It does **not** alter or delete any existing table or data.

> **Important:** I have not run this migration against the active Supabase project. It must be reviewed and manually executed by you in the Supabase SQL Editor.

## What the Migration Adds

| Component | Purpose |
|---|---|
| `policy_decisions` | Records each action evaluated by the deterministic policy engine, including action, result, rule, reason, recovery probability, attempt count, actor, and timestamp. |
| Relationships | Links each decision to an existing `payments.payment_id` and, when available, the related recovery-case and simulated-action identifiers. |
| Check constraints | Restricts actions to the five allowlisted simulation tools and policy results to `APPROVED`, `BLOCKED`, or `HUMAN_REVIEW_REQUIRED`. It also prevents a non-simulated row. |
| Indexes | Supports payment decision timelines, policy block-rate reporting, and recovery-case detail views. |
| RLS | Protects the table from direct browser access. Only server-side code using the private service-role secret should write policy records. |
| Append-only trigger | Rejects updates and deletes, so any correction is represented by a new decision row rather than altered history. |

## Manual Application Steps

| Step | Action |
|---:|---|
| 1 | Open your Supabase project and select **SQL Editor**. |
| 2 | Open `database/03_add_policy_decisions.sql` from this repository. |
| 3 | Review the transaction, especially the append-only trigger. |
| 4 | Paste and run the complete migration. |
| 5 | Run the two verification queries at the bottom of the migration file. |
| 6 | Reply here with **“policy migration applied”** and, optionally, paste any SQL error. |

## Expected Safety Properties

The migration creates an additive, simulation-only table. Existing payment records and your current audit log remain unchanged. The later application update will insert a policy decision before recording a simulated action and its audit event; it will not introduce any real payment execution pathway.
