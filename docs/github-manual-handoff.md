# Manual GitHub File-Addition Workflow

This project is prepared for a **manual GitHub handoff**. No repository has been created, connected, or pushed automatically.

## Create an Empty Repository

Create a new private repository in GitHub. Do not initialize it with a README, `.gitignore`, or license; this avoids an unnecessary merge when adding the prepared ReVora files.

## Add the Files Manually

Download the project from the project interface, extract it locally, then use either GitHub Desktop or the Git command line.

```bash
cd path/to/revora
git init
git add .
git status
git commit -m "Initial ReVora revenue recovery operations platform"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

## Files That Must Not Be Added

Do not commit local environment files or secret values. Keep the following outside GitHub:

| Exclude | Reason |
|---|---|
| `.env`, `.env.local`, or equivalent secret files | They may contain Supabase service-role or Gemini API credentials. |
| PostgreSQL data directories | They are local runtime state, not application source. |
| Manually downloaded test outputs containing secrets | They may expose credentials or internal logs. |

The committed SQL schema and seed files are safe because they contain no credentials. They are meant for a clean local development environment, not for re-running against the populated Supabase project.

## After the Push

Review the GitHub repository’s **Settings → Secrets and variables** only if you later connect an external CI/CD system. The standard managed deployment continues to obtain Supabase and Gemini secrets from the project’s secure runtime configuration, not from GitHub.
