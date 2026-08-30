# Local Development and Database Bootstrap

## Objective

This guide lets a developer clone ReVora, create a clean personal Supabase project, load deterministic local development data, configure server-side credentials, and run the application without touching the shared populated Supabase project.

> **Do not run either SQL file against the active populated Supabase project.** The schema and seed scripts are for a new local or personal development database only.

## Prerequisites

Install Node.js 22 or later, pnpm 10 or later, Git, and either the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) or a personal Supabase project. Docker is required only when using a fully local Supabase stack.

## Fastest Development Path: Personal Supabase Project

| Step | Action | Result |
|---:|---|---|
| 1 | Clone the repository and run `pnpm install`. | Installs the web application dependencies. |
| 2 | Create a new personal Supabase project. | Provides an isolated PostgreSQL database and API. |
| 3 | In the Supabase SQL Editor, run `database/01_revora_schema_reference.sql`. | Creates the four empty ReVora tables, indexes, and RLS protection. |
| 4 | In the same SQL Editor, run `database/02_revora_local_seed_reference.sql`. | Inserts a deterministic 10,000-payment synthetic demonstration dataset. |
| 5 | Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-side secrets. | Allows the ReVora server to read the development dataset. |
| 6 | Run `pnpm dev`. | Starts the local application. |

The seed is idempotent. Re-running it does not overwrite existing payment IDs or add duplicate recovery cases. If a developer needs a clean reset, they should delete and recreate their **personal development project** or truncate its tables manually only after confirming it is not a shared environment.

## One-Command Bootstrap Verification

After setting `LOCAL_DATABASE_URL` to an empty local PostgreSQL database or personal development database, run the repository-provided check from the project root:

```bash
LOCAL_DATABASE_URL=postgresql://user:password@localhost:5432/revora_dev pnpm verify:local-db
```

The command applies the schema, loads the deterministic seed, and checks the expected record counts. It is intentionally pointed at `LOCAL_DATABASE_URL`, not `SUPABASE_URL`, so it cannot silently target the populated shared Supabase project.

## Fully Local Supabase Option

For a local containerized Supabase stack, initialize and start Supabase from the repository root, then run the same two SQL files against the local database.

```bash
pnpm install
npx supabase init
npx supabase start
```

The CLI prints a local API URL and a service-role key. In a terminal with a PostgreSQL client available, apply the scripts in order:

```bash
psql "$LOCAL_DATABASE_URL" -f database/01_revora_schema_reference.sql
psql "$LOCAL_DATABASE_URL" -f database/02_revora_local_seed_reference.sql
```

Alternatively, open the local Supabase Studio URL printed by `npx supabase start`, use its SQL Editor, and run the two files in the same order.

## Environment Configuration

Set the following values in the local development environment or your deployment secret manager. Do not commit real secrets. The service-role key is server-only and must never use a `VITE_` prefix.

```text
SUPABASE_URL=https://your-development-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-development-service-role-key
```

For a local Supabase stack, substitute the local API URL and local service-role key printed by `npx supabase status`. External local clones can run the data API functionality without a Gemini key; the AI Brief then remains unavailable until a server-side key is provided.

## Verification and Start Commands

```bash
pnpm vitest run server/supabase.connection.test.ts
pnpm test
pnpm dev
```

The Supabase connection test validates the health endpoint using only server-side credentials. It does not print secret values. Before starting the UI integration phase, validate the bootstrap dataset with the SQL queries at the bottom of `database/02_revora_local_seed_reference.sql`.

## Optional Offline Model Evaluation

The recovery-intelligence evaluation uses local Python tooling and makes a read-only pull from `payments`. To reproduce it after cloning, install the pinned tools and run:

```bash
python3 -m pip install -r requirements.txt
pnpm train:recovery-model
```

The command writes the selected model metadata to `ml/model/`, a generated TypeScript evaluation summary used by the application, and `docs/evaluation.md`. It does not write predictions or training results to Supabase.

## Database Files

| File | Use |
|---|---|
| `database/01_revora_schema_reference.sql` | Creates the PostgreSQL tables, relationship recommendations, indexes, and RLS protection for an empty development database. |
| `database/02_revora_local_seed_reference.sql` | Creates deterministic synthetic payment, case, simulated action, and audit data for local development. |
| `database/03_add_policy_decisions.sql` | Additive payment-policy ledger migration for a compatible project that lacks `policy_decisions`. |
| `database/04_add_invoice_receivables.sql` | Additive B2B invoice and Promise-to-Pay migration; read `database/RECEIVABLES_SETUP.md` first. |
| `docs/supabase-schema-explanation.md` | Explains the data model and clearly separates verified source properties from recommended clean-schema constraints. |

All SQL and application flows are simulation-only. No script initiates payment activity, contacts a payment provider, or handles real payment credentials.

## Verified Bootstrap Result

The schema and seed scripts were executed in a fresh isolated PostgreSQL 16 database. The first run created `10,000` payments, `2,307` recovery cases, `769` simulated recovery actions, and `2,307` audit entries. A second run created zero additional records, confirming idempotent local bootstrap behavior.
