# Deploy ReVora to Vercel

ReVora is prepared for a **manual Vercel deployment**. The repository combines a Vite single-page frontend with a portable Express/tRPC API function. Vercel serves the generated frontend from `dist/public` and discovers `api/[...path].ts` as the Node serverless handler for `/api/*`. The portable handler exposes the simulation-only recovery API and omits managed OAuth and storage-proxy routes that are not required by ReVora.

> **Safety boundary:** Deploy only with a development or approved synthetic-data Supabase project. ReVora does not process real payments. Never add payment-provider credentials or browser-exposed service-role keys.

## Readiness status

| Area | Status | Evidence |
|---|---|---|
| Vite production client | Ready | `pnpm run build:vercel` creates `dist/public`. |
| Serverless API | Ready | `api/[...path].ts` exports the Express/tRPC handler and its `/api/health` endpoint is covered by an automated test. |
| SPA deep links | Ready | `vercel.json` sends non-API routes to the Vite entry page. |
| Data access | Ready with variables | Server-only Supabase URL and service-role key must be added in Vercel. |
| AI Brief | Optional | It becomes available only when `GEMINI_API_KEY` is configured. |
| Authentication | Not required | ReVora is deliberately a public, synthetic-data simulation preview. |

Vercel supports Express applications as serverless functions and serves static assets independently of Express static middleware. The configuration here follows that model. [1] Vite applications require an SPA fallback for deep links such as `/payments/P00272`; `vercel.json` supplies it while excluding `/api/*`. [2]

## 1. Push the project to GitHub

Use your own GitHub account or organization. Do **not** commit `.env`, `.env.local`, database backups, service-role keys, Gemini keys, or downloaded data.

```bash
git add .
git commit -m "Prepare ReVora for Vercel"
git branch -M main
git remote add origin https://github.com/<your-account>/revora.git
git push -u origin main
```

If your local source was extracted from an archive, first create your own repository with `git init`. The project’s managed workspace history is not needed in your personal GitHub repository.

## 2. Import the repository in Vercel

1. Sign in at [Vercel](https://vercel.com/).
2. Select **Add New → Project**.
3. Import your ReVora GitHub repository.
4. Keep the project **Root Directory** as `./` unless the repository is nested in a monorepo.
5. Vercel should detect **Vite**. If it does not, select **Other** and enter the values in the next table.

| Setting | Value |
|---|---|
| Framework Preset | `Vite` |
| Install Command | `pnpm install` |
| Build Command | `pnpm run build:vercel` |
| Output Directory | `dist/public` |
| Node.js | 22.x or later |

The committed `vercel.json` already contains the build/output configuration, API function duration, and SPA fallback. Leave the file in the repository.

## 3. Add environment variables before deploying

In Vercel, open **Project Settings → Environment Variables**. Add the following variables for **Production** and **Preview**. Vercel encrypts environment variables at rest, and variable changes apply to new deployments rather than existing ones. [3]

| Variable | Required | Scope | Purpose |
|---|---:|---|---|
| `SUPABASE_URL` | Yes | Production and Preview | Your Supabase project REST URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Production and Preview | Server-only key for the ReVora Supabase adapter. Mark as a secret. |
| `GEMINI_API_KEY` | Optional | Production and Preview | Enables the on-demand Gemini AI Brief. Mark as a secret. |

Do **not** create a variable beginning with `VITE_` for a server secret. Vite embeds `VITE_*` values into browser code. Do not add `DATABASE_URL`, `OAUTH_SERVER_URL`, `BUILT_IN_FORGE_API_KEY`, or `BUILT_IN_FORGE_API_URL` for ReVora’s Vercel adapter; those are managed-runtime compatibility variables and are not used by the portable `/api` handler.

## 4. Deploy manually

After adding variables, return to the import screen and select **Deploy**. Vercel will run the committed build command, upload `dist/public`, and create the API function. A push to the production branch, normally `main`, creates a production deployment; pushes to other branches create Preview deployments. [3]

> Each environment-variable change requires a fresh deployment. Use **Redeploy** after adding, rotating, or correcting a key.

## 5. Perform the post-deploy checks

Open the generated `https://<your-project>.vercel.app` address and check the following items before using a custom domain:

| URL or interaction | Expected result |
|---|---|
| `/api/health` | Returns JSON with `status: "ok"` and `mode: "simulation_only"`. |
| `/` | Revenue Command Center loads source-derived data. |
| `/payments` | Payment explorer loads and filters source records. |
| `/payments/P00272` | A direct deep link opens the payment detail view rather than a Vercel 404 page. |
| `/simulator` | Simulated action controls clearly state that no real payment is processed. |
| `/ai-brief` | Works only if `GEMINI_API_KEY` is configured; it must leave deterministic policy visible and authoritative. |

If the dashboard loads but shows a data error, verify the two Supabase variables, their Vercel environment scope, and that the Supabase project allows the Vercel function’s server-side request. Do not paste secret values into Vercel build logs, Git commits, browser code, screenshots, or support messages.

## 6. Custom domain and rollback

After the default Vercel URL passes the checks, use **Project Settings → Domains** to add your domain and complete its DNS records. Keep the generated Vercel URL available until the custom domain is confirmed.

If a future release fails, use Vercel’s deployment history to promote a previously successful deployment. ReVora’s database schema and current Supabase records are independent of an application rollback; do not run the local schema or seed SQL during a rollback.

## Sources

[1]: https://vercel.com/docs/frameworks/backend/express "Express on Vercel"
[2]: https://vercel.com/docs/frameworks/frontend/vite "Vite on Vercel"
[3]: https://vercel.com/docs/environment-variables "Vercel environment variables"
