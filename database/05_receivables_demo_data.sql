-- ReVora B2B Receivables: professional simulation demonstration data
-- -----------------------------------------------------------------------------
-- MANUAL HANDOFF ONLY. Run this ONLY AFTER 04_add_invoice_receivables.sql.
-- It inserts eight clearly labelled DEMO invoices and related simulated promises,
-- policy decisions, actions, and audit events. It does not touch payments or any
-- non-DEMO invoice. Re-running this script does not add duplicate DEMO records.

begin;

insert into public.invoices (
  invoice_id, customer_id, customer_name, amount, currency, issued_date,
  due_date, status, payment_terms_days, payment_reference, notes
) values
  ('DEMO-INV-001', 'DEMO-CUST-001', 'Atlas Components Pvt Ltd', 18000.00, 'INR', current_date - 37, current_date - 7, 'open', 30, 'DEMO-PO-2026-001', '[SIMULATED DEMO] Seven-day overdue receivable with a successful simulated follow-up.'),
  ('DEMO-INV-002', 'DEMO-CUST-002', 'Cedarline Solutions LLP', 25000.00, 'INR', current_date - 50, current_date - 20, 'open', 30, 'DEMO-PO-2026-002', '[SIMULATED DEMO] Overdue invoice with an active future Promise-to-Pay.'),
  ('DEMO-INV-003', 'DEMO-CUST-003', 'Northbridge Logistics Ltd', 78000.00, 'INR', current_date - 125, current_date - 95, 'open', 30, 'DEMO-PO-2026-003', '[SIMULATED DEMO] High-value overdue invoice requiring human escalation review.'),
  ('DEMO-INV-004', 'DEMO-CUST-004', 'Harbor & Field Services', 12000.00, 'INR', current_date - 35, current_date - 5, 'disputed', 30, 'DEMO-PO-2026-004', '[SIMULATED DEMO] Disputed invoice; non-escalation collection simulations require human review.'),
  ('DEMO-INV-005', 'DEMO-CUST-005', 'Silverline Facilities Co', 42000.00, 'INR', current_date - 60, current_date - 30, 'partially_paid', 30, 'DEMO-PO-2026-005', '[SIMULATED DEMO] Partially recovered invoice with a kept Promise-to-Pay.'),
  ('DEMO-INV-006', 'DEMO-CUST-006', 'Pineworks Manufacturing', 22000.00, 'INR', current_date - 54, current_date - 24, 'open', 30, 'DEMO-PO-2026-006', '[SIMULATED DEMO] Overdue invoice with an active Promise-to-Pay past its date.'),
  ('DEMO-INV-007', 'DEMO-CUST-007', 'Bluepeak Consulting', 12800.00, 'INR', current_date - 60, current_date - 30, 'paid', 30, 'DEMO-PO-2026-007', '[SIMULATED DEMO] Settled invoice, included to demonstrate zero outstanding treatment.'),
  ('DEMO-INV-008', 'DEMO-CUST-008', 'Meridian Studio Works', 6500.00, 'INR', current_date - 15, current_date + 15, 'open', 30, 'DEMO-PO-2026-008', '[SIMULATED DEMO] Current invoice; recovery action is blocked until it is overdue.')
on conflict (invoice_id) do nothing;

insert into public.invoice_promises (invoice_id, promised_amount, promised_date, status, note)
select demo.invoice_id, demo.promised_amount, demo.promised_date, demo.status, demo.note
from (values
  ('DEMO-INV-002', 25000.00::numeric, current_date + 7, 'active', '[SIMULATED DEMO] Active operator-recorded Promise-to-Pay. No external customer contact occurred.'),
  ('DEMO-INV-005', 9000.00::numeric, current_date - 5, 'kept', '[SIMULATED DEMO] Kept Promise-to-Pay included for tracker coverage.'),
  ('DEMO-INV-006', 22000.00::numeric, current_date - 3, 'active', '[SIMULATED DEMO] Active Promise-to-Pay intentionally past date for missed-promise detection.')
) as demo(invoice_id, promised_amount, promised_date, status, note)
where exists (select 1 from public.invoices invoice where invoice.invoice_id = demo.invoice_id)
  and not exists (
    select 1 from public.invoice_promises promise
    where promise.invoice_id = demo.invoice_id and promise.note = demo.note
  );

insert into public.invoice_policy_decisions (
  invoice_id, action, policy_result, rule_code, reason, recovery_probability,
  outstanding_amount, policy_version, actor, simulation_only, decision_timestamp
)
select demo.invoice_id, demo.action, demo.policy_result, demo.rule_code, demo.reason,
  demo.recovery_probability, demo.outstanding_amount, 'recoverai-invoice-v1',
  'invoice_policy_engine', true, now() - demo.event_age
from (values
  ('DEMO-INV-001', 'follow_up', 'APPROVED', 'FOLLOW_UP_ALLOWED', '[SIMULATED DEMO] Seven-day overdue balance meets the follow-up boundary.', 0.54::numeric, 18000.00::numeric, interval '4 days'),
  ('DEMO-INV-003', 'escalate', 'APPROVED', 'INVOICE_ESCALATION_ALLOWED', '[SIMULATED DEMO] High-value aged balance is routed to human escalation review.', 0.80::numeric, 78000.00::numeric, interval '3 days'),
  ('DEMO-INV-004', 'follow_up', 'HUMAN_REVIEW_REQUIRED', 'INVOICE_DISPUTE_REVIEW', '[SIMULATED DEMO] Disputed invoice requires human review before collection activity.', 0.18::numeric, 12000.00::numeric, interval '2 days'),
  ('DEMO-INV-005', 'follow_up', 'APPROVED', 'FOLLOW_UP_ALLOWED', '[SIMULATED DEMO] Partially recovered overdue balance meets follow-up policy.', 0.59::numeric, 42000.00::numeric, interval '1 day'),
  ('DEMO-INV-006', 'escalate', 'HUMAN_REVIEW_REQUIRED', 'MISSED_PROMISE_REVIEW', '[SIMULATED DEMO] Missed active Promise-to-Pay requires human review.', 0.39::numeric, 22000.00::numeric, interval '12 hours')
) as demo(invoice_id, action, policy_result, rule_code, reason, recovery_probability, outstanding_amount, event_age)
where not exists (
  select 1 from public.invoice_policy_decisions decision
  where decision.invoice_id = demo.invoice_id and decision.reason = demo.reason
);

insert into public.invoice_recovery_actions (
  invoice_id, action_type, execution_status, amount_recovered, executed_at, message
)
select demo.invoice_id, demo.action_type, demo.execution_status, demo.amount_recovered,
  now() - demo.event_age, demo.message
from (values
  ('DEMO-INV-001', 'follow_up', 'SUCCESS', 4500.00::numeric, interval '4 days', '[SIMULATED DEMO] Follow-up reached a partial recovery outcome. No real message or payment was processed.'),
  ('DEMO-INV-003', 'escalate', 'ESCALATED', 0.00::numeric, interval '3 days', '[SIMULATED DEMO] High-value receivable escalated for human review. No external collection occurred.'),
  ('DEMO-INV-004', 'follow_up', 'BLOCKED', 0.00::numeric, interval '2 days', '[SIMULATED DEMO] Follow-up was blocked because the invoice is disputed.'),
  ('DEMO-INV-005', 'follow_up', 'SUCCESS', 6000.00::numeric, interval '1 day', '[SIMULATED DEMO] Follow-up reached a partial recovery outcome. No real message or payment was processed.'),
  ('DEMO-INV-006', 'escalate', 'BLOCKED', 0.00::numeric, interval '12 hours', '[SIMULATED DEMO] Escalation is awaiting required human review after a missed promise.')
) as demo(invoice_id, action_type, execution_status, amount_recovered, event_age, message)
where not exists (
  select 1 from public.invoice_recovery_actions action
  where action.invoice_id = demo.invoice_id and action.message = demo.message
);

insert into public.invoice_audit_logs (
  invoice_id, ai_decision, diagnosis, recovery_probability, policy_result, action,
  execution_result, amount_recovered, reason, timestamp
)
select demo.invoice_id, demo.action, 'deterministic_invoice_recovery_simulation',
  demo.recovery_probability, demo.policy_result, demo.action, demo.execution_result,
  demo.amount_recovered, demo.reason, now() - demo.event_age
from (values
  ('DEMO-INV-001', 'follow_up', 0.54::numeric, 'APPROVED', 'SUCCESS', 4500.00::numeric, '[SIMULATED DEMO] FOLLOW_UP_ALLOWED: partial recovery outcome recorded.', interval '4 days'),
  ('DEMO-INV-003', 'escalate', 0.80::numeric, 'APPROVED', 'ESCALATED', 0.00::numeric, '[SIMULATED DEMO] INVOICE_ESCALATION_ALLOWED: human review route recorded.', interval '3 days'),
  ('DEMO-INV-004', 'follow_up', 0.18::numeric, 'HUMAN_REVIEW_REQUIRED', 'BLOCKED', 0.00::numeric, '[SIMULATED DEMO] INVOICE_DISPUTE_REVIEW: collection simulation blocked.', interval '2 days'),
  ('DEMO-INV-005', 'follow_up', 0.59::numeric, 'APPROVED', 'SUCCESS', 6000.00::numeric, '[SIMULATED DEMO] FOLLOW_UP_ALLOWED: partial recovery outcome recorded.', interval '1 day'),
  ('DEMO-INV-006', 'escalate', 0.39::numeric, 'HUMAN_REVIEW_REQUIRED', 'BLOCKED', 0.00::numeric, '[SIMULATED DEMO] MISSED_PROMISE_REVIEW: human review required.', interval '12 hours')
) as demo(invoice_id, action, recovery_probability, policy_result, execution_result, amount_recovered, reason, event_age)
where not exists (
  select 1 from public.invoice_audit_logs audit
  where audit.invoice_id = demo.invoice_id and audit.reason = demo.reason
);

commit;

-- Safe verification queries (run separately):
-- select invoice_id, customer_name, amount, due_date, status from public.invoices where invoice_id like 'DEMO-INV-%' order by invoice_id;
-- select invoice_id, promised_amount, promised_date, status from public.invoice_promises where note like '[SIMULATED DEMO]%' order by invoice_id;
-- select invoice_id, action, policy_result, execution_result, amount_recovered from public.invoice_audit_logs where reason like '[SIMULATED DEMO]%' order by timestamp desc;
