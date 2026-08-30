# Existing Supabase Data Mapping

## Scope of Inspection

RecoverAI will use the existing Supabase PostgreSQL project as the authoritative data source. No table-creation SQL has been run against Supabase, and no synthetic data has been inserted or replaced during this inspection.

## Observed Tables and Volumes

| Supabase table | Observed records | RecoverAI role |
|---|---:|---|
| `payments` | 10,000 | Source payment events, recovery features, and calculated dashboard metrics. |
| `recovery_cases` | 302 | AI-assisted recovery-case state, recommendation, diagnosis, confidence, and human-review metadata. |
| `recovery_actions` | 172 | Simulated recovery execution outcomes and recovered amounts. |
| `audit_logs` | 384 | Existing audit timeline events for recovery decisions and executions. |

## Field Compatibility

The existing table shape already covers the MVP recovery workflow. Monetary fields are represented as decimal INR values rather than the initial internal paise proposal. RecoverAI server adapters will preserve that convention and will not convert or overwrite source values.

| RecoverAI capability | Existing Supabase fields |
|---|---|
| Payment context | `payments.payment_id`, `customer_id`, `amount`, `currency`, `payment_method`, `gateway`, `status`, `failure_reason`, `attempt_number`, and `timestamp`. |
| Recovery features and probability | `payments.customer_success_history`, `customer_tenure`, `previous_failures`, `is_recurring_payment`, `days_since_last_success`, `recoverable`, `recovery_probability`, and `recovery_status`. |
| Recommendation and explanation | `recovery_cases.diagnosis`, `ai_recommendation`, `confidence`, `reasoning`, and `case_status`. |
| Simulation result | `recovery_actions.action_type`, `execution_status`, `amount_recovered`, `executed_at`, and `message`. |
| Audit timeline | `audit_logs.ai_decision`, `diagnosis`, `recovery_probability`, `confidence`, `policy_result`, `action`, `execution_result`, `amount_recovered`, `reason`, and `timestamp`. |

> **Integration rule:** existing Supabase records will be read without mutation during the dashboard and analytics phases. Any future recovery simulation will use the existing write tables only after the user approves the exact non-destructive simulation flow.

## Compatibility Findings

The existing dataset is compatible with the dashboard, payment explorer, payment detail, decision timeline, simulation display, and audit-center scope. Recovery probability and confidence are stored as fractions from `0` to `1`; the application will display them as percentages. Existing status values such as `FAILED`, `PENDING`, `RESOLVED`, `SUCCESS`, and `PASSED` will be normalized in server-side view models for consistent presentation while leaving stored source values unchanged.
