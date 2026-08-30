# B2B Receivables Recovery: Supabase Setup

The invoice module uses the existing ReVora **server-side Supabase connection**. It does not use the template MySQL database, require local PostgreSQL, expose Supabase credentials, or introduce FastAPI.

## One-time schema handoff

Review and manually run [`04_add_invoice_receivables.sql`](./04_add_invoice_receivables.sql) in the intended Supabase SQL Editor. The script is additive: it creates the invoice, Promise-to-Pay, invoice-policy, simulated-action, and invoice-audit tables only when absent. It does **not** insert sample invoices, modify current payment tables, or rerun the original ReVora schema.

| Table | Purpose | Writes by ReVora |
|---|---|---|
| `invoices` | Source B2B invoice facts supplied by the merchant or upstream accounting workflow. | None from the simulation module. |
| `invoice_promises` | Promise-to-Pay commitments. | Explicit operator-created simulated commitments only. |
| `invoice_policy_decisions` | Deterministic receivables policy decisions. | Explicit operator simulation only. |
| `invoice_recovery_actions` | Simulated reminder, follow-up, escalation, or Promise-to-Pay outcomes. | Explicit operator simulation only. |
| `invoice_audit_logs` | Immutable-style invoice decision/action trail. | Explicit operator simulation only. |

## Source-data contract

Import or create real invoice records through an approved accounting process. ReVora will display an empty state until the `invoices` table has source records. It never fabricates invoice or customer business data.

Each invoice requires `invoice_id`, `customer_id`, `amount`, `issued_date`, `due_date`, and a supported `status`. Optional `customer_name`, `payment_terms_days`, `payment_reference`, and `notes` improve visibility but are not required for receivables scoring. Dates are stored as PostgreSQL `date`; action and audit timestamps are stored as UTC `timestamptz`.

## Optional professional demonstration workspace

If you need to present every workflow before loading invoice source data, manually review and run [`05_receivables_demo_data.sql`](./05_receivables_demo_data.sql) after the schema migration. It adds eight `DEMO-INV-*` invoices covering current, overdue, high-value, disputed, partially recovered, paid, active Promise-to-Pay, kept Promise-to-Pay, and missed-promise cases. It also adds corresponding records to the invoice policy, action, and audit tables.

The script is idempotent and only adds rows marked `[SIMULATED DEMO]`; it never edits existing invoices or any ReVora payment table. Delete the `DEMO-*` rows manually from a presentation environment only if you no longer want to show the simulation scenarios.

> The module is simulation-only. A successful simulated recovery action is recorded only in the new invoice action and audit tables, and it contributes to ReVora’s aggregate recovered-revenue display. It never charges, sends a reminder, changes an external accounting system, or marks a source invoice paid.
