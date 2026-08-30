# Supabase Database Schema Explanation

## Purpose and Safety Boundary

The current Supabase project already contains the four operational tables required for the RecoverAI MVP: payment source events, recovery decisions, simulated action results, and audit records. The companion file [`database/01_recoverai_schema_reference.sql`](../database/01_recoverai_schema_reference.sql) is a **standalone PostgreSQL recreation script** for explanation and clean-environment setup. It has not been executed against the active Supabase project and must not be run there without first reviewing the existing schema and data.

> **Simulation boundary:** `recovery_actions` records simulated recovery execution only. No table or workflow is designed to trigger a live payment or connect to a payment gateway.

## Entity Relationship

```text
payments
  ├── 0..1 recovery_cases
  ├── 0..N recovery_actions
  └── 0..N audit_logs
```

| Table | Purpose | Key data |
|---|---|---|
| `payments` | Holds the synthetic payment event and recovery-model feature context. | Payment amount, method, gateway, failure reason, attempt count, customer history, recoverability, probability, and recovery state. |
| `recovery_cases` | Holds the business-level decision record for a payment needing recovery. | Diagnosis, recommendation, confidence, reasoning, case state, and optional human review outcome. |
| `recovery_actions` | Holds individual simulated recovery action results. A payment may have multiple actions over time. | Action type, simulated outcome, recovered amount, execution time, and message. |
| `audit_logs` | Holds the chronological, append-oriented audit trail. A payment may have multiple audit events. | AI decision, policy outcome, action, execution outcome, recovered amount, rationale, and timestamp. |

## Column Semantics

The `payments` table is the analytical source of truth. Its `amount` and `amount_recovered` values are decimal INR values. `recovery_probability`, `customer_success_history`, and `confidence` use fractional values between `0` and `1`; the RecoverAI server will present them as percentages. The existing source data includes the payment lifecycle values used by the interface, including payment statuses such as `FAILED`, case statuses such as `RESOLVED`, execution statuses such as `SUCCESS`, and policy outcomes such as `PASSED`.

| Data concept | Source column(s) | Presentation treatment |
|---|---|---|
| Revenue at risk | `payments.amount`, `status`, `recovery_status` | Calculated from failed or unresolved payment records. |
| Recoverable revenue | `payments.amount`, `recovery_probability` | Calculated as amount multiplied by probability; never hard-coded. |
| Recovered revenue | `recovery_actions.amount_recovered`, `execution_status` | Calculated from successful simulated actions only. |
| AI recommendation | `recovery_cases.ai_recommendation`, `diagnosis`, `reasoning` | Shown as a concise business explanation, not hidden reasoning. |
| Policy result | `audit_logs.policy_result`, `reason` | Displayed as the authoritative gate for a simulated action. |
| Decision timeline | `audit_logs.timestamp` plus related case/action timestamps | Rendered in ascending chronological order. |

## Constraints, Indexes, and Security

The documented recreation script uses integer identity keys and stable text `payment_id` identifiers. It enforces non-negative monetary values, fractional probability ranges, non-negative attempt counts, and time-of-day bounds. It uses a one-to-one relationship between a payment and its primary recovery case, then one-to-many relationships from payments to actions and audit entries.

The indexes support the expected dashboard and explorer queries: payment status and time filtering, recovery-opportunity ranking, customer history lookup, case state filtering, action history, and audit timelines. Row-level security is enabled deliberately without browser-facing policies. This means the RecoverAI client should access data only through the server-side API; the Supabase service-role credential remains server-only and bypasses RLS only within trusted server code.

## Verified Versus Recommended Elements

| Verified from the active Supabase data API | Added as clean-schema recommendations |
|---|---|
| Four table names, exposed columns, nullable fields, numeric/timestamp formats, and source record counts. | Primary/foreign-key assumptions, check constraints, indexes, and RLS configuration in the recreation script. |
| Existing values for recovery and policy lifecycle states. | A unique primary recovery case per payment and server-only data access posture. |

The distinction is intentional: the active database remains untouched, while the separate script provides a practical, secure starting point for a fresh project.

## Verification Record

The standalone recreation SQL and this explanation were reviewed after creation. Both describe the same four tables—`payments`, `recovery_cases`, `recovery_actions`, and `audit_logs`—and retain the explicit rule that neither artifact is executed against the current populated Supabase project.
