# ReVora

ReVora is a **simulation-only payment recovery operations platform**. It combines a reproducible synthetic payment dataset, model-backed recovery probabilities, deterministic policy gates, explicitly simulated recovery outcomes, immutable audit records, and on-demand Gemini business explanations.

> **Safety boundary:** ReVora does not connect to payment gateways and cannot process, charge, retry, refund, or otherwise affect a real payment. Every execution interface is a simulation, and deterministic policy is the authority for every proposed action.

## Product Capabilities

| Area | Included capability |
|---|---|
| Recovery intelligence | Logistic Regression recovery scoring, candidate action ranking, expected-value calculations, and held-out evaluation documentation. |
| Policy and audit | Allowlisted actions, deterministic retry and value limits, policy-decision ledger, simulated action history, and chronological audit timelines. |
| Operations UI | Recovery dashboard, payment explorer, payment detail, What-If lab, immutable autopilot profile, playbook analytics, human escalation queue, audit center, and AI brief workspace. |
| Gemini brief | Server-side structured explanations only. Gemini cannot select an action, alter policy results, or execute a payment. |
| B2B Receivables | Invoice KPIs, search and filters, deterministic collection recommendations, Promise-to-Pay tracking, simulated outcomes, and invoice audit history. |
| Merchant Assistant | Read-only Gemini questions over approved payment, recovery, invoice, and product context; it never executes a recovery action or discloses secrets. |

## Quick Start

Install dependencies and start the app:

```bash
pnpm install
pnpm dev
```

The web app is intentionally available as a **public, authentication-free simulation preview**. It expects server-side Supabase credentials and, for the AI Brief, a server-side Gemini key. Use a personal development Supabase project for local work. Start with the complete step-by-step [`localguide/LOCAL_SETUP.md`](localguide/LOCAL_SETUP.md), then use [`docs/local-development.md`](docs/local-development.md) for the technical bootstrap reference.

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the local development server. |
| `pnpm check` | Run TypeScript validation. |
| `pnpm test` | Run the complete Vitest suite. |
| `pnpm build` | Build the production web application. |
| `pnpm verify:local-db` | Apply and validate the local PostgreSQL schema and deterministic seed against `LOCAL_DATABASE_URL`. |

## Application Structure

| Area | Location | Purpose |
|---|---|---|
| Frontend | `client/src/` | React routes, Recovery UI pages, reusable components, visual tokens, and typed tRPC client. |
| Backend contract | `server/routers.ts` | Validated public recovery API procedures. |
| Recovery domain | `server/recovery/domain/` | Deterministic policy engine and portable model artifacts. |
| Recovery data | `server/recovery/data/` | Server-only Supabase reads, policy ledger, operations aggregates, and simulated-action persistence. |
| AI explanation | `server/recovery/ai/` | Bounded server-side Gemini explanation service. |
| Database | `database/` | Complete numbered Supabase schema, seed/reference, policy, and B2B Receivables SQL handoff. |
| Runtime support | `server/_core/`, `drizzle/`, `server/db.ts`, `server/storage.ts` | Managed template compatibility and runtime infrastructure; not used as the product data source. |

## Database and Local Bootstrap

The active application uses the existing Supabase tables `payments`, `recovery_cases`, `recovery_actions`, `audit_logs`, and `policy_decisions`. Every verified SQL handoff is directly visible under [`database/`](database/README.md). The files are separated intentionally:

| File | Use it when | Do not use it when |
|---|---|---|
| `database/01_revora_schema_reference.sql` | Creating a new empty development database. | Pointing at the populated active Supabase project. |
| `database/02_revora_local_seed_reference.sql` | Loading deterministic synthetic records into an empty personal development database. | Pointing at the populated active Supabase project. |
| `database/03_add_policy_decisions.sql` | Adding the policy ledger to a compatible existing project. | Re-running after the policy table already exists. |
| `database/04_add_invoice_receivables.sql` | Enabling the additive B2B Receivables table set after review. | Running it before reviewing [`database/RECEIVABLES_SETUP.md`](database/RECEIVABLES_SETUP.md), or expecting it to create invoice source data. |
| `database/05_receivables_demo_data.sql` | Demonstrating the professional invoice workflow using clearly labelled synthetic `DEMO-*` records. | Treating its rows as real customer records, or expecting it to modify payments or non-demo invoices. |

## Documentation

| Document | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Product architecture and safety boundaries. |
| [`docs/supabase-schema-explanation.md`](docs/supabase-schema-explanation.md) | Supabase data model explanation. |
| [`docs/local-development.md`](docs/local-development.md) | Local PostgreSQL and Supabase setup. |
| [`docs/environment-example.env`](docs/environment-example.env) | Clone-safe server-side environment variable names and placeholders. |
| [`docs/evaluation.md`](docs/evaluation.md) | Recovery model evaluation and selection. |
| [`docs/deployment.md`](docs/deployment.md) | Pre-publish checklist and deployment process. |
| [`docs/vercel-deployment.md`](docs/vercel-deployment.md) | Verified Vercel architecture, secure environment variables, manual deployment, and post-deploy checks. |
| [`docs/github-manual-handoff.md`](docs/github-manual-handoff.md) | Manual GitHub file-addition workflow. |
| [`docs/security.md`](docs/security.md) | Security, privacy, and operating boundaries. |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) | Active MVP workspaces, source ownership boundaries, and the professional project directory map. |
| [`localguide/LOCAL_SETUP.md`](localguide/LOCAL_SETUP.md) | Complete step-by-step guide for running ReVora on a local computer. |
| [`localguide/WINDOWS_SETUP.md`](localguide/WINDOWS_SETUP.md) | Windows PowerShell setup using the existing Supabase Cloud project; no local PostgreSQL required. |
| [`localguide/GITHUB_VERCEL_DEPLOY_WINDOWS.md`](localguide/GITHUB_VERCEL_DEPLOY_WINDOWS.md) | Windows GitHub upload, Vercel deployment, environment setup, health checks, and rollback guide. |

## Security Summary

Supabase and Gemini credentials are server-only secrets. The browser uses validated public tRPC procedures and never receives a Supabase service-role key or a Gemini API key. Gemini receives bounded, non-identifying payment and deterministic-policy context only after an operator requests an AI brief. See [`docs/security.md`](docs/security.md) for the full operating guidance.
