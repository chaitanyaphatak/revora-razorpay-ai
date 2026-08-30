# Merchant Assistant Safety Contract

The RecoverAI Merchant Assistant is a **read-only Gemini explanation feature**. It can answer general product questions and explain one selected synthetic payment’s approved recovery context. It does not execute payment retries, charges, refunds, reminders, policy changes, or database mutations.

| Boundary | Implementation |
|---|---|
| Context | General product facts, or a validated payment ID’s allowlisted payment, model, case, and deterministic policy fields. |
| Conversation | At most six messages with 600 characters each; only `user` and `assistant` roles are accepted. |
| Authority | Deterministic recovery policy remains authoritative; Gemini cannot select or override an action. |
| Security | Secrets, credential requests, prompt injection, and execution requests receive fixed local refusals without calling Gemini. |
| Data writes | None. The endpoint does not call simulation, payment, policy, or audit mutation functions. |

The feature requires `GEMINI_API_KEY` as a server-only runtime variable. It must never be named with the `VITE_` prefix or sent to browser code.
