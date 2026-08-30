# Revenue Recovery AI UI Redesign Mapping

## Design Direction

The redesigned product will use a **light-first financial SaaS system** with white surfaces, neutral gray backgrounds, restrained semantic accents, Inter-style typography, subtle borders, and modest radii. The existing translucent planes and large glass surfaces will be reduced in favor of a more disciplined command-center layout.

## Navigation and Data Availability

| Requested workspace | RecoverAI implementation approach | Data source or boundary |
|---|---|---|
| Overview | Revenue Command Center with KPIs, trend, funnel, risk table, AI insight, and operations activity. | Calculated from existing payments, recovery cases, actions, audits, and policy decisions. |
| Revenue Risk | Filtered opportunity workbench with risk scores, action readiness, and detail links. | Derived from failed and recovery-pending payments. |
| Recovery | Pipeline and opportunity cards. | Derived from recovery-case states and simulated action outcomes. |
| Customers | Aggregated customer health and risk view. | Derived by `customer_id`; no fabricated customer profiles. |
| Payments | Existing live payment explorer and detail. | Existing `payments` source table. |
| Invoices and Promises | B2B Receivables command center, detail analysis, Promise-to-Pay tracker, and simulation audit records. | Additive Supabase invoice source, Promise-to-Pay, policy, action, and audit tables. Synthetic `DEMO-*` rows are visibly labelled. |
| AI Agents | Transparent agent capability and activity workspace. | Existing deterministic policy, Gemini brief, audit and recovery data. |
| Automations | Read-only deterministic recovery policy map. | Fixed policy only; no editable automation system is implied. |
| Control Center | Complete audit timeline and policy-decision review. | Existing aggregation endpoints and immutable audit log. |
| Settings | Transparent public workspace configuration summary. | No authentication or editable account settings in the public preview. |

> **Integrity rule:** Payment-provider connection status and user-role controls are not fabricated; the public workspace transparently identifies fixed simulation and policy boundaries.

## Safety Language

Every redesigned recovery action must continue to identify simulation status, deterministic policy outcome, human-review requirements, audit context, and the absence of any real payment processing. Gemini content remains a concise explanation layer and never changes the selected action or policy result.
