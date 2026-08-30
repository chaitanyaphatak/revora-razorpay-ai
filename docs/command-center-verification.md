# Revenue Command Center Verification

The public command center was tested with the live browser date selector. Changing the selector from **30D** to **7D** triggered a new source-derived dashboard request and changed the visible revenue-at-risk value from ₹95,28,932 across 966 at-risk payments to ₹14,75,624 across 196 at-risk payments.

The recovery chart label, trend points, funnel values, priority opportunities, and highest-impact AI insight also refreshed to match the seven-day source window. This verifies that the date control affects the dashboard aggregation rather than only changing an interface label.

> All displayed values are based on the existing synthetic Supabase dataset, and recovery records remain explicitly simulated.

## Analytics workspace verification

The new **Recovery Analytics** workspace was verified against the public source-derived 12-month dashboard response. It renders 10,000 source payments, ₹3,07,25,672 revenue at risk, ₹8,21,853 simulated recovered revenue, a 91% recovery rate, and a failure-signal bar chart. The initial aggregation takes approximately eight seconds against the current full synthetic source and displays a component-level loading surface during that interval rather than exposing an empty or failed page.

## Customer-to-payment handoff verification

The public **Customers** workspace was tested by opening the first listed customer’s Payments action. The application navigated to `/payments?customerId=C0754`, displayed the active customer filter, and returned eight actual matching source payments for that customer, including the two failed records used in its at-risk total. The filter can be cleared from the explorer without changing source data.

## Command-palette verification

The final public shell was tested from the filtered Payments explorer. The global search trigger opened a keyboard-accessible command palette with navigation shortcuts for Overview, Revenue Risk, Recovery, Customers, Payments, AI Agents, Analytics, Activity, and Settings, alongside quick actions for the What-If simulator and AI Brief.

## Post-redesign AI Brief verification

The refreshed public AI Brief was executed in the browser for synthetic payment `P00272` without an authenticated session. The request completed successfully and returned a Gemini diagnosis and risk note, while the separate deterministic recommendation remained visible as **Escalate To Human / Approved / ESCALATION_ALLOWED**. The interface explicitly states that the deterministic policy remains the authority and that no payment action is initiated.
