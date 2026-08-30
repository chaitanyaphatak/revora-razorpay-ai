# Deployment Preparation

## Deployment Scope

ReVora is a request-driven simulation-only application: no background worker, daemon, payment processor, fixed IP, or long-running job is required. The deployed service reads Supabase through server-side credentials and uses Gemini only for an on-demand operator action.

> **Do not deploy a local `.env` file.** Configure runtime secrets through the platform’s secure secret-management panel.

## Required Server-Side Environment Values

| Variable | Required | Purpose | Browser exposure |
|---|---:|---|---|
| `SUPABASE_URL` | Yes | Supabase REST endpoint used only by server data adapters. | Never expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase access for protected recovery APIs. | Never expose. |
| `GEMINI_API_KEY` | Required for AI Brief | Google Gemini generation credential for on-demand structured explanations. | Never expose. |
| `OAUTH_SERVER_URL`, `BUILT_IN_FORGE_API_*`, `DATABASE_URL` | Not required by the Vercel adapter | Managed-runtime compatibility values. | Do not configure for Vercel. |

A clone-safe placeholder file is available at [`environment-example.env`](environment-example.env). Copy the variable names only; do not commit real secret values.

## Pre-Publish Checklist

Run the following from the project root before creating a publishable checkpoint:

```bash
pnpm check
pnpm test
pnpm build
```

Then confirm the following manually:

| Check | Expected result |
|---|---|
| Supabase access | Dashboard, explorer, payment detail, simulator, and control center load authenticated source data. |
| Simulation boundary | Every action view states that it is simulated; no payment gateway credential or SDK is present. |
| Gemini AI Brief | The brief returns an explanation only; the deterministic recommendation and policy result remain visible alongside it. |
| Mobile layout | The payment explorer uses cards rather than a horizontally dependent table at small widths. |
| Secrets | Supabase and Gemini values exist only in secure server-side configuration. |

## Hosting options

ReVora can be hosted through the built-in project hosting with custom-domain support, or through Vercel. For a full Git-connected Vercel deployment procedure, including the committed serverless API adapter and all manual Vercel Dashboard settings, see [`vercel-deployment.md`](vercel-deployment.md).

For built-in hosting, create a project checkpoint after validation and then use the **Publish** control in the project interface. For either hosting option, configure the required server-only secrets through the selected host’s secure environment-variable settings.
