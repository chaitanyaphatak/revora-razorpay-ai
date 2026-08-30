# Public Preview Verification

## Authentication-Free Access

The RecoverAI preview was opened directly at `/ai-brief` without an authenticated browser session. The sign-in gate no longer appeared. The public shell identified the session as a **Public preview** using synthetic data only.

## AI Brief Workflow

The default synthetic payment `P00272` was submitted through the visible **Generate AI brief** action. Gemini returned a structured diagnosis summary, business explanation, and risk note. The page concurrently displayed the deterministic recommendation, `Escalate To Human`, with an `Approved` policy result and the `ESCALATION_ALLOWED` rule code.

> The generated business explanation did not replace or modify the deterministic recommendation. The rendered UI explicitly stated that the deterministic policy remained the authority, and no payment action was initiated.

## Validation Context

The browser verification complements the passing public API, Gemini live-generation, recovery workflow, TypeScript, and production-build checks. The browser result was retrieved through the application’s public preview route and contained no user authentication flow.
