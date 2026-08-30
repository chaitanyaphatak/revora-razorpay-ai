# RecoverAI Project Structure

RecoverAI uses a deliberately small, feature-oriented structure. The active application is a public, simulation-only React and TypeScript product and does not reintroduce authentication.

```text
recoverai/
├── api/                         # Vercel catch-all API entry point
├── client/
│   └── src/
│       ├── components/           # Dashboard shell, error boundary, and UI primitives
│       ├── contexts/             # Application theme provider
│       ├── hooks/                # Reusable client hooks
│       ├── lib/                  # Typed tRPC client and small utilities
│       └── pages/                # Active product workspaces and detail pages
├── server/
│   ├── _core/                    # Managed Express, tRPC, Vite, and server runtime support
│   ├── recovery/
│   │   ├── ai/                   # Server-only Gemini explanation and assistant boundaries
│   │   ├── data/                 # Server-only Supabase reads and simulated-record persistence
│   │   └── domain/               # Deterministic payment and invoice policy engines
│   └── routers.ts                # Validated public tRPC contract
├── database/                     # Numbered Supabase SQL handoffs and execution guidance
├── docs/                         # Architecture, security, operation, and maintenance guidance
├── localguide/                   # Step-by-step local and Windows startup guides
└── shared/                       # Shared non-secret types and constants
```

## Active Product Workspaces

| Workspace | Primary implementation | Responsibility |
|---|---|---|
| Overview | `OperationsDashboard.tsx` | Payment recovery KPIs, risk trends, source-derived performance, and activity summary. |
| Revenue Risk and Recovery | `RevenueWorkspaces.tsx` | Ranked payment opportunities and policy-controlled recovery pipeline. |
| Customers and Payments | `RevenueWorkspaces.tsx`, `PaymentsExplorer.tsx`, `PaymentDetail.tsx` | Source-derived customer aggregation, payment filtering, deterministic decisions, and audit context. |
| B2B Receivables | `ReceivablesDashboard.tsx`, `InvoiceDetail.tsx`, `PromiseToPayTracker.tsx` | Invoice KPIs, recovery recommendation, Promise-to-Pay tracking, simulated outcomes, and invoice audit history. |
| Assistant and AI Agents | `MerchantAssistant.tsx`, `AIBrief.tsx`, `RevenueWorkspaces.tsx` | Bounded Gemini explanation and merchant questions; AI never executes an action. |
| Automations and Settings | `RevenueWorkspaces.tsx`, `SettingsWorkspace.tsx` | Transparent fixed-policy view and public read-only workspace status. |

## Backend Ownership Boundaries

The `server/recovery/domain/` folder is authoritative for deterministic recovery and receivables policy. `server/recovery/ai/` may explain policy outputs but cannot change them. `server/recovery/data/` is the only product layer permitted to access Supabase; only explicit simulation mutations append records to simulation and audit tables. No product code calls payment gateways or executes external collection work.

## Database Handoff Order

The root [`database/`](../database/README.md) directory is flat by design so every SQL handoff is visible in a project file browser. Review each script before manual use.

| Order | File | Purpose |
|---|---|---|
| 01 | `01_recoverai_schema_reference.sql` | New empty development database only. |
| 02 | `02_recoverai_local_seed_reference.sql` | Reference synthetic payment data for a new development database only. |
| 03 | `03_add_policy_decisions.sql` | Add the payment policy ledger when it is absent. |
| 04 | `04_add_invoice_receivables.sql` | Add the B2B Receivables schema. |
| 05 | `05_receivables_demo_data.sql` | Add idempotent, clearly labelled `DEMO-*` invoice scenarios for a safe presentation workspace. |

> **Do not run files 01 or 02 against the populated Supabase project.** File 05 is synthetic demonstration data only; it does not modify payments or non-demo invoices.

## Deliberately Retained Framework Files

`server/_core/`, `drizzle/`, and supporting root configuration remain because the managed React, Express, tRPC, Vite, and Vercel runtime expects them. They are infrastructure compatibility files, not RecoverAI business modules. The active product database source remains Supabase PostgreSQL rather than the template Drizzle/MySQL layer.
