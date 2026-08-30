# ReVora Local Setup Guide

This guide explains how to run **ReVora** on your own computer. It is written for a clean local checkout and keeps the production safety boundary intact: the application works with synthetic payment data, evaluates only simulated recovery actions, and never connects to a live payment gateway. For a Windows PowerShell workflow using your existing Supabase project, begin with [`WINDOWS_SETUP.md`](WINDOWS_SETUP.md).

> **Important:** Do not run the schema or seed SQL against the populated Supabase project currently used by ReVora. Create a new personal Supabase project or a local Supabase stack for development.

## 1. What you need

| Requirement | Recommended version | Why it is needed |
|---|---:|---|
| Node.js | 22 or later | Runs the React frontend and Express/tRPC server. |
| pnpm | 10 or later | Installs and runs the project dependencies. |
| Git | Current stable version | Clones your own exported repository and manages your own history. |
| PostgreSQL client (`psql`) | 16 or later | Runs the optional one-command database bootstrap verification. |
| Supabase account or Supabase CLI | Current stable version | Provides an isolated PostgreSQL/Supabase development database. |
| Python | 3.11 or later, optional | Re-runs the offline recovery-model evaluation. |

Verify the basic tools after installation:

```bash
node --version
pnpm --version
git --version
psql --version
```

## 2. Get the source code

Download or export the ReVora project source, then open a terminal in the project root.

```bash
git clone <your-github-repository-url> revora
cd revora
```

If you received a ZIP archive instead, extract it and run `cd revora`. The managed workspace `.git` directory is not needed for your own local copy. If you want your own Git history, initialize a fresh repository after extracting the source:

```bash
git init
git add .
git commit -m "Initial ReVora local setup"
```

## 3. Install JavaScript dependencies

Install the exact dependency versions listed in the project lockfile:

```bash
pnpm install
```

Do not place `.env` files, `node_modules`, build output, or database dumps under version control. The project `.gitignore` already excludes these local artifacts.

## 4. Create an isolated Supabase database

Choose **one** of the following options. A personal cloud project is the fastest path. A local Supabase stack gives you full local database control.

### Option A: Personal Supabase project

1. Create a new development project in your own Supabase account.
2. Open that project’s **SQL Editor**.
3. Run `database/01_revora_schema_reference.sql` in full.
4. Run `database/02_revora_local_seed_reference.sql` in full.
5. In Supabase project settings, copy the project URL and the **service-role** key for local server configuration only.

The SQL files create and seed the isolated development database with deterministic synthetic records. They are idempotent for the intended empty development project.

### Option B: Fully local Supabase stack

Install Docker and the Supabase CLI, then initialize and start Supabase from the ReVora project root:

```bash
npx supabase init
npx supabase start
```

The CLI prints the local API URL, service-role key, and database connection string. Apply the SQL files in this order:

```bash
psql "$LOCAL_DATABASE_URL" -f database/01_revora_schema_reference.sql
psql "$LOCAL_DATABASE_URL" -f database/02_revora_local_seed_reference.sql
```

## 5. Configure server-only environment variables

Create a local environment file from the supplied safe template:

```bash
cp docs/environment-example.env .env
```

Set the following values in `.env`. Never place a `VITE_` prefix on the Supabase service-role key, Gemini key, or any other server secret.

```dotenv
SUPABASE_URL=https://your-development-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-development-service-role-key

# Optional: enables the on-demand Gemini AI Brief.
GEMINI_API_KEY=your-gemini-api-key

# Optional: enables the one-command local database bootstrap verifier.
LOCAL_DATABASE_URL=postgresql://postgres:password@localhost:5432/revora_dev
```

The browser never receives these values. ReVora has **no OpenAI dependency or OpenAI key requirement**. The existing Gemini AI Brief is optional; the core dashboard, payment explorer, recovery policy, and simulation flows work without it.

## 6. Start ReVora locally

Run the development server:

```bash
pnpm dev
```

Open the localhost URL printed in your terminal, typically `http://localhost:3000`. The public preview does not require an application login because the project uses only synthetic development records. Supabase and Gemini credentials remain server-side.

## 7. Verify the local application

Run these commands from the project root before committing or deploying changes:

| Command | What it checks |
|---|---|
| `pnpm check` | TypeScript types and source import paths. |
| `pnpm test` | Recovery policy, simulation, Supabase normalization, public API, and Gemini safety tests. |
| `pnpm build` | Production frontend bundle and server build. |
| `LOCAL_DATABASE_URL=... pnpm verify:local-db` | Applies the local schema and seed and checks expected record counts. Use only an empty personal database. |

For the local database bootstrap verifier, set the URL first:

```bash
export LOCAL_DATABASE_URL="postgresql://postgres:password@localhost:5432/revora_dev"
pnpm verify:local-db
```

Expected development counts after a clean bootstrap are `10,000` payments, `2,307` recovery cases, `769` simulated recovery actions, and `2,307` audit records.

## 8. Optional: re-run model evaluation

The offline model script reads your configured Supabase `payments` data and writes only local model/evaluation artifacts. It does not write predictions to Supabase or execute recovery actions.

```bash
python3 -m pip install -r requirements.txt
pnpm train:recovery-model
```

The portable model metadata and predictor used by the server are committed source files under `server/recovery/domain/model/`. A normal clone does not need to run model training before `pnpm dev`. The model is advisory only; the deterministic policy engine continues to control every simulated recovery outcome.

## 9. Understand the project layout

| Location | Description |
|---|---|
| `client/src/` | React frontend, pages, shared UI components, styles, and tRPC client. |
| `server/routers.ts` | Validated tRPC API contract exposed to the frontend. |
| `server/recovery/domain/` | Recovery scoring, deterministic policy, simulation logic, and portable model artifacts. |
| `server/recovery/data/` | Server-only Supabase reads, policy ledger access, operations aggregation, and simulated action persistence. |
| `server/recovery/ai/` | Bounded server-side Gemini AI Brief service. |
| `database/` | Complete numbered Supabase schema, local synthetic seed/reference, payment-policy, and B2B Receivables SQL handoff. Start with `database/README.md`. |
| `docs/` | Architecture, security, deployment, model evaluation, and verification documentation. |
| `localguide/` | This step-by-step local setup guide. |

The `server/_core/`, `drizzle/`, `server/db.ts`, and `server/storage.ts` files are compatibility support for the managed runtime template. ReVora’s product data source is the server-only Supabase adapter under `server/recovery/data/`.

## 10. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Dashboard shows unavailable data | Missing or incorrect `SUPABASE_URL` or service-role key. | Recheck `.env`, restart `pnpm dev`, and confirm the selected Supabase project contains the schema and seed. |
| AI Brief is unavailable | `GEMINI_API_KEY` is not set or lacks model access. | Continue using the recovery UI normally, or configure a valid server-side Gemini key. |
| `pnpm verify:local-db` fails | The target database is not empty, `psql` cannot connect, or the URL is wrong. | Use a new personal database, validate `LOCAL_DATABASE_URL`, then run the command again. |
| Port 3000 is busy | Another local process is already using the default port. | Stop the other process or use the alternate local URL printed by the server. |
| TypeScript cannot resolve a module | Dependencies were not installed cleanly. | Delete `node_modules`, run `pnpm install`, then run `pnpm check`. |
| A preview-only strip appears in a managed preview | This is external preview chrome, not ReVora source code. | It is not part of the local app and is absent from a deployed application URL. |

## Local verification status

The project-quality commands `pnpm check`, `pnpm test`, and `pnpm build` were run successfully in the maintained project workspace. The README link to this guide was also verified.

The local machine bootstrap commands in Sections 2–6 are **handoff instructions** for your computer or a separate development environment. This workspace has the `psql` client but does not have a local PostgreSQL server, Supabase runtime, Docker/Podman runtime, or `LOCAL_DATABASE_URL`; therefore, the `psql` schema/seed sequence and `pnpm verify:local-db` were not re-executed here. Use a newly created personal Supabase project or local Supabase stack when following those steps.

## 11. Safety checklist

> **ReVora is simulation-only.** Local setup must not introduce payment-provider credentials, live charge endpoints, automatic retry handlers, unrestricted SQL execution, or browser-accessible service keys.

Before using a local change, confirm the following:

1. The database is a personal development project, not a shared or active production project.
2. `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and any other secret exist only in local environment configuration or a secret manager.
3. The application continues to state that recovery actions and outcomes are simulated.
4. Deterministic policy remains authoritative over model output and Gemini explanations.
5. `pnpm check`, `pnpm test`, and `pnpm build` pass.

For deployment preparation and additional security guidance, see `docs/deployment.md` and `docs/security.md`.
