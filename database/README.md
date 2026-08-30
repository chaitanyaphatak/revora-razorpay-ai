# ReVora Supabase SQL Files

This folder contains **every verified SQL handoff file** used to document, bootstrap, or extend ReVora’s Supabase PostgreSQL model. The files are numbered in the only order they should be considered.

> **Safety rule:** Do not run every file in sequence against the existing populated ReVora Supabase project. Files `01` and `02` are for an empty personal development database only. File `03` is the historic payment-policy migration; do not rerun it if `policy_decisions` already exists. File `04` is the optional B2B Receivables extension and has not been applied to the current source project.

| Order | File | What it contains | Safe execution target |
|---:|---|---|---|
| 01 | [`01_revora_schema_reference.sql`](./01_revora_schema_reference.sql) | Base `payments`, `recovery_cases`, `recovery_actions`, and `audit_logs` tables, indexes, and RLS. | A new, empty personal/local Supabase database only. |
| 02 | [`02_revora_local_seed_reference.sql`](./02_revora_local_seed_reference.sql) | Deterministic synthetic payment, recovery-case, simulated-action, and audit records. | A new, empty personal/local database after file `01` only. |
| 03 | [`03_add_policy_decisions.sql`](./03_add_policy_decisions.sql) | Additive `policy_decisions` ledger, supporting indexes, RLS, and append-only trigger. | A compatible project where the table does not already exist. This was the verified payment-policy migration handoff. |
| 04 | [`04_add_invoice_receivables.sql`](./04_add_invoice_receivables.sql) | Additive invoice, Promise-to-Pay, invoice-policy, invoice-action, and invoice-audit tables. | The intended project only after manual review; it inserts no invoices and does not change payment records. |
| 05 | [`05_receivables_demo_data.sql`](./05_receivables_demo_data.sql) | Eight explicitly labelled invoice scenarios, commitments, policy outcomes, simulated actions, and audit events. | A presentation or development environment after file `04`; it only inserts `DEMO-*` rows and never changes payments. |
| Guide | [`RECEIVABLES_SETUP.md`](./RECEIVABLES_SETUP.md) | Invoice module source-data contract and simulation-only behavior. | Read before using file `04`. |

## Which file should I run?

| Your situation | Correct action |
|---|---|
| You are creating a brand-new personal development Supabase project. | Run `01`, then `02`. Apply `03` only if the local app expects the policy ledger. |
| You are using the existing populated ReVora Supabase project. | Do **not** run `01` or `02`. Do not rerun `03` if the policy ledger exists. Review `04` only if you want to enable B2B invoices. |
| You want the new B2B Receivables module. | Read `RECEIVABLES_SETUP.md`, then manually review and run `04`. Import only your approved invoice source records afterward. |
| You need to demonstrate every invoice feature before importing source data. | After `04`, review and manually run `05`. It adds only clearly labelled simulation records and is idempotent. |

All recovery and receivables actions documented here are **simulation-only**. None of the files contains payment-gateway credentials, real collection calls, or automatic customer-contact logic.
