# Security and Operating Boundaries

## Data Classification

RecoverAI is designed around **synthetic payment data**. The application must not be repurposed to collect raw card information, CVV values, bank credentials, or authentication factors. The current data model uses operational payment context and recovery labels only.

## Server-Side Secret Handling

The Supabase service-role credential and Gemini API key are server-only values. They are read only in server modules, never placed in React components, never returned by tRPC procedures, and never committed to source control. The frontend accesses application data only through authenticated protected procedures.

## Deterministic Authority

The recovery model provides probability estimates. Gemini produces a short explanation of an already-computed decision. Neither component has authority to execute or change a recovery action.

> The deterministic policy engine is the single action authority. It allowlists action types, enforces retry and value limits, raises human-review requirements, and records policy outcomes before any simulated result is written.

## Simulation Controls

The simulation mutation records only a policy decision, a `[SIMULATED]` recovery action, and a `[SIMULATED]` audit event. It does not invoke payment APIs or payment gateway SDKs. The What-If preview is read-only until an authenticated operator explicitly records a simulated outcome.

## Operational Guidance

| Control | Required practice |
|---|---|
| Supabase RLS | Keep operational tables under row-level security and restrict browser access; use a server-side adapter for validated access. |
| Audit trail | Treat `audit_logs` and `policy_decisions` as append-oriented business records. Do not mutate them to hide prior decisions. |
| Gemini | Use only the bounded server-side explanation endpoint. Do not send personal data or secrets in prompts. |
| Policy changes | Fixed autopilot limits are intentional. Any future policy configurability requires a reviewed migration, access control, approval workflow, and test coverage. |
| Production data | Complete a privacy, legal, payment, and security review before substituting any real production payment data. |
