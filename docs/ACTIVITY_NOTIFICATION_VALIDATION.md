# Activity and Manual-Simulation Notification Validation

## Initial visual check

The restored Activity route renders a responsive timestamped audit timeline in the regular desktop viewport. The initial full-page capture was not used as a layout acceptance signal because the 399-event audit list produced an abnormal narrow capture artifact; the regular viewport showed the intended command header, simulation boundary strip, metric cards, activity filters, and event entries.

## Audit classification

Manual simulations are identified using the existing explicit persisted evidence: the manual-operator actor where available, the `manual_recovery_simulation` audit diagnosis, or the `[SIMULATED MANUAL]` audit label. This supports both new and pre-existing valid manual simulation records without changing any source record.

## Notification boundary

The notification handoff is browser-local. A successful manual simulation dispatches a short-lived UI event; the notification indicator and its Activity link do not deliver an email, SMS, push message, provider request, or collection action.

## Responsive follow-up

The corrected desktop Activity view displayed nine existing manual simulations, including a visible manual-simulation label, payment identifier, policy result, recovered amount, relative timestamp, and expandable source detail. The narrow mobile view retained the Activity header, simulation boundary, audit metrics, and readable stacked layout. The Manual Simulation page also remained readable at the same mobile width.

## Final quality checks

TypeScript validation, the production build, and the complete automated suite passed after the final audit-classification update. The suite contains 26 passing test files and 70 passing tests, with two intentional opt-in live Gemini checks skipped. Browser-console entries generated after the final server restart contain no React key warning, runtime error, or failed request.
