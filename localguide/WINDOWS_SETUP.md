# Run ReVora on Windows

This guide prepares ReVora to run on a Windows 10 or Windows 11 computer while using your **existing Supabase Cloud project**. You do not need to install PostgreSQL, Docker, or the Supabase CLI for this path.

> **Important:** Your existing Supabase project already has ReVora’s tables and data. Do **not** run `database/01_revora_schema_reference.sql`, `database/02_revora_local_seed_reference.sql`, or the policy migration again. The local app will read your existing data and write only clearly marked simulation-policy/action/audit records if you run a simulation.

## 1. Install the two required tools

Install the current **Node.js 22 LTS** release from [nodejs.org](https://nodejs.org/). During installation, keep the default option to add Node.js to your PATH. Install **Git for Windows** from [git-scm.com](https://git-scm.com/download/win) if you will clone the source from GitHub.

Open **Windows PowerShell** and run:

```powershell
node --version
corepack enable
corepack prepare pnpm@10 --activate
pnpm --version
```

Close and reopen PowerShell if `pnpm` is not recognized. The project requires Node.js 22 or later and pnpm 10 or later.

## 2. Download the ReVora source

Choose one method.

| Method | PowerShell command |
|---|---|
| GitHub repository | `git clone https://github.com/<your-account>/revora.git` |
| ZIP download | Extract the ZIP, then open PowerShell in the extracted `revora` folder. |

For a Git clone, enter the folder:

```powershell
cd revora
```

Confirm you are in the correct folder:

```powershell
Get-ChildItem package.json, client, server, database
```

## 3. Create your private `.env` file

From the ReVora root folder, run:

```powershell
Copy-Item docs\environment-example.env .env
notepad .env
```

Replace the placeholder values with credentials from your **existing** Supabase project:

```dotenv
SUPABASE_URL=https://your-existing-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-existing-service-role-key

# Optional: enables the Gemini AI Brief page.
GEMINI_API_KEY=your-gemini-api-key
```

In Supabase, find the project URL and service-role key under **Project Settings → API**. The service-role key is server-only. Never share it in chat, add it to GitHub, place it in client code, or give it a `VITE_` prefix.

Delete or leave unset `LOCAL_DATABASE_URL`. It is only for a separate locally hosted PostgreSQL bootstrap and is not needed for your Supabase Cloud workflow.

## 4. Run the Windows setup helper

Run this command from the ReVora root:

```powershell
pnpm run setup:windows
```

The helper checks Node.js and pnpm, creates `.env` from the template if needed, confirms that the required Supabase variable names have values without printing them, and installs dependencies. It stops safely if configuration is incomplete.

If PowerShell blocks script execution, use the same command above—the package script already applies a **process-only** bypass and does not alter your machine-wide execution policy. Alternatively, enter this once in the current terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## 5. Start ReVora

Run:

```powershell
pnpm dev
```

Open the address printed in PowerShell, typically [http://localhost:3000](http://localhost:3000). A Windows Firewall prompt may appear; allow private-network access for Node.js only if Windows asks. The app is public within your browser and does not require a ReVora login.

## 6. Verify the application

Before editing or deploying, run:

```powershell
pnpm check
pnpm test
pnpm build
pnpm start
```

The first three commands check TypeScript, recovery/simulation behavior, and the production build. `pnpm start` serves the production build locally; stop it with `Ctrl+C` after checking it.

## Troubleshooting

| Problem | Resolution |
|---|---|
| `pnpm` is not recognized | Run `corepack enable` and `corepack prepare pnpm@10 --activate`, then reopen PowerShell. |
| `node` is below version 22 | Install Node.js 22 LTS, reopen PowerShell, and rerun `node --version`. |
| Setup reports missing Supabase variables | Open `.env`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, save, then rerun `pnpm run setup:windows`. |
| Dashboard cannot load data | Confirm the `.env` credentials belong to the existing ReVora Supabase project and restart `pnpm dev`. |
| Port 3000 is in use | Stop the other Node process, or use the alternate localhost address printed by ReVora. |
| Gemini AI Brief is unavailable | Add a valid `GEMINI_API_KEY` to `.env`, save it, and restart `pnpm dev`. Core recovery views still work without it. |
| `EPERM` or locked-file errors during install | Close terminals, editors, or Explorer windows using `node_modules`; then retry `pnpm install`. |
| `Cannot find module ... generatedModelEvaluation` | Your local folder is an older or incomplete copy. Download the current ReVora release again or run `git pull` from the project root, then run `pnpm install` and `pnpm dev`. Do not create a blank generated file. |

## Safety reminder

ReVora remains **simulation-only** in local Windows development. Do not add payment-gateway credentials, live-charge routes, browser-exposed Supabase service-role keys, or automatic recovery execution. The deterministic policy is authoritative; Gemini explains decisions but cannot override or execute them.

## Verification boundary

The ReVora project was verified with a fresh Node startup, TypeScript, model metadata, recovery-engine, full Vitest, and production-build checks after removal of the transient generated-model imports. The `setup:windows` command is covered by an automated script-contract test.

Run the following final command sequence in your own Windows PowerShell terminal after downloading the current project version. This confirms Windows-specific PATH, file permissions, and PowerShell behavior on your computer:

```powershell
pnpm install
pnpm run setup:windows
pnpm dev
```

If the terminal no longer reports `generatedModelEvaluation`, the startup repair is complete on your machine.
