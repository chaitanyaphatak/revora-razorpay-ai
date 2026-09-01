# Publish ReVora from Windows: GitHub to Vercel

This guide deploys the verified ReVora source from your Windows computer through your own GitHub repository and Vercel account. It does **not** change your existing Supabase data, and it does not require PostgreSQL, Python, or `requirements.txt`.

> **Safety boundary:** ReVora is simulation-only. Keep `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` only in your private `.env` and Vercel environment settings. Never add them to GitHub, browser code, or a `VITE_` variable.

## 1. Confirm your local folder works

Open PowerShell in the ReVora folder and run:

```powershell
pnpm install
pnpm check
pnpm test
pnpm build
```

The production deployment uses the committed `vercel.json`. It sets the Vite build command to `pnpm run build:vercel`, serves `dist/public`, preserves `/api/*` for the serverless tRPC handler, and redirects non-API deep links to the React application.

## 2. Check whether you already uploaded to GitHub

Run these commands in PowerShell:

```powershell
git remote -v
git status
git branch --show-current
git ls-remote origin HEAD
```

If `git remote -v` prints a GitHub URL and `git ls-remote origin HEAD` prints a commit hash, the folder is connected to a GitHub repository. Open that URL in a browser and verify that the latest changed files, such as `vercel.json`, `api/[...path].ts`, and `server/recovery/domain/model/modelPredictor.ts`, are visible.

If the command says that `origin` does not exist, follow the next section.

## 3. Upload the project to a new GitHub repository

1. Sign in to [GitHub](https://github.com/) and choose **New repository**.
2. Name it `revora`. Choose **Private** unless you intentionally want the code public.
3. Do **not** create a README, `.gitignore`, or license in the GitHub form, because this project already has them.
4. Copy the repository URL, such as `https://github.com/your-name/revora.git`.
5. Return to PowerShell in the ReVora project root and run:

```powershell
git init
git branch -M main
git check-ignore -v .env
git add .
git status
git commit -m "Initial ReVora release"
git remote add origin https://github.com/your-name/revora.git
git push -u origin main
```

`git check-ignore -v .env` should print an ignore rule. In the `git status` output, **`.env` must not appear**. Stop and remove it from staging if it does.

If GitHub asks you to authenticate, sign in through the browser prompt or Git Credential Manager. Do not paste Supabase or Gemini values into a commit message, source file, or GitHub form.

## 4. Import the repository into Vercel

1. Sign in to [Vercel](https://vercel.com/), preferably with the same GitHub account.
2. Select **Add New → Project**.
3. Find the `revora` repository and choose **Import**. If it is not listed, approve Vercel’s access to that repository in GitHub, then refresh the Vercel import page.
4. Keep the **Root Directory** as `./` (the repository root).
5. Vercel should recognize the committed Vite configuration. Do not delete or replace `vercel.json`.
6. Before deploying, open **Environment Variables** and add the values in the next section.

Vercel creates a deployment for every connected Git push by default; pushes to the production branch, normally `main`, become production deployments. [1]

## 5. Add the required Vercel environment variables

Under **Project → Settings → Environment Variables**, create these server-side variables exactly as shown.

| Variable | Required | Scope to select | Value source |
|---|---:|---|---|
| `SUPABASE_URL` | Yes | Production | Your existing Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Production | Your existing Supabase service-role key. |
| `GEMINI_API_KEY` | Optional | Production | Enables the on-demand AI Brief. |

Do **not** use `VITE_SUPABASE_SERVICE_ROLE_KEY`, `VITE_GEMINI_API_KEY`, or `LOCAL_DATABASE_URL`. A Vite-prefixed variable is exposed to browser builds and must not contain a service-role or AI key. Vercel applies environment-variable changes only to new deployments, so redeploy after adding or changing a value. [2]

For your first deployment, select **Production** only. If you later enable **Preview**, use a separate development Supabase project or confirm that the synthetic shared dataset is appropriate for publicly accessible preview URLs.

## 6. Deploy

Click **Deploy**. Vercel uses the versioned configuration in this repository:

| Vercel setting | Expected value |
|---|---|
| Framework | `Vite` |
| Build Command | `pnpm run build:vercel` |
| Output Directory | `dist/public` |
| Node.js | Node 22 or later, declared in `package.json` |
| API handler | `api/[...path].ts` |

Wait until Vercel reports a successful deployment, then open the generated `*.vercel.app` URL.

## 7. Perform the production checks

Replace `your-project.vercel.app` with your actual Vercel domain:

```text
https://your-project.vercel.app/api/health
https://your-project.vercel.app/
https://your-project.vercel.app/payments
https://your-project.vercel.app/payments?customerId=C0754
```

The health URL should respond successfully. In the application, verify that the Overview loads, the Payments page loads, and a deep-linked route refreshes without a 404 page. If Supabase data cannot load, open **Vercel → Project → Deployments → the failed deployment → Functions/Logs** and confirm that the two required Supabase variable names exist in the Production scope.

## 8. Update or roll back safely

For a normal update, validate locally, then use:

```powershell
git add .
git commit -m "Describe the change"
git push
```

Vercel will build the new `main` commit automatically. If a production update has a problem, open **Vercel → Project → Deployments**, select the earlier successful deployment, and use the dashboard’s **Promote to Production** action. Do not place an old `.env` file in the repository to roll back configuration.

## References

[1]: https://vercel.com/docs/git/vercel-for-github "Vercel: Deploying GitHub Projects"
[2]: https://vercel.com/docs/environment-variables "Vercel: Environment variables"
[3]: https://vercel.com/docs/frameworks/frontend/vite "Vercel: Vite on Vercel"
[4]: https://vercel.com/docs/functions "Vercel: Vercel Functions"
