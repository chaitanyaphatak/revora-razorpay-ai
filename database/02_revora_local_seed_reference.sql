-- ReVora: deterministic local development data
-- -----------------------------------------------------------------------------
-- Run this file only AFTER 01_revora_schema_reference.sql in a fresh local or
-- personal development Supabase project. It is idempotent: existing payment IDs
-- are not overwritten. It never connects to a payment gateway or processes money.
-- -----------------------------------------------------------------------------

begin;

with deterministic_payments as (
  select
    series_id as n,
    'P' || lpad(series_id::text, 5, '0') as payment_id,
    'C' || lpad((1000 + (series_id % 1250))::text, 4, '0') as customer_id,
    round((299 + ((series_id * 97) % 14700))::numeric, 2) as amount,
    case series_id % 4 when 0 then 'upi' when 1 then 'card' when 2 then 'net_banking' else 'wallet' end as payment_method,
    case series_id % 3 when 0 then 'razorcore' when 1 then 'payu' else 'cashfree' end as gateway,
    case when series_id % 13 < 10 then 'SUCCEEDED' when series_id % 13 = 10 then 'FAILED' when series_id % 13 = 11 then 'RECOVERED' else 'PENDING' end as status,
    case series_id % 8
      when 0 then 'gateway_timeout'
      when 1 then 'upi_timeout'
      when 2 then 'issuer_declined'
      when 3 then 'insufficient_funds'
      when 4 then 'network_error'
      when 5 then 'invalid_card'
      when 6 then 'risk_review'
      else 'unknown'
    end as simulated_failure_reason,
    1 + (series_id % 3) as attempt_number,
    series_id % 5 as previous_failures,
    round((0.60 + ((series_id * 37) % 3900) / 10000.0)::numeric, 4) as customer_success_history,
    timestamptz '2026-05-01 00:00:00+00' + (series_id * interval '14 minutes') as event_timestamp,
    case series_id % 4 when 0 then 'retail' when 1 then 'digital_services' when 2 then 'education' else 'travel' end as merchant_category,
    30 + ((series_id * 29) % 1700) as customer_tenure,
    case series_id % 3 when 0 then 'mobile' when 1 then 'desktop' else 'tablet' end as device_type,
    series_id % 24 as hour_of_day,
    (series_id % 5 = 0) as is_recurring_payment,
    (series_id * 11) % 120 as days_since_last_success
  from generate_series(1, 10000) as series_id
), normalized_payments as (
  select
    *,
    case
      when status = 'SUCCEEDED' then null
      else simulated_failure_reason
    end as failure_reason,
    case
      when status = 'SUCCEEDED' then false
      when n % 5 = 0 then false
      else true
    end as recoverable,
    case
      when status = 'SUCCEEDED' then 0.0000
      when simulated_failure_reason = 'gateway_timeout' then 0.8400
      when simulated_failure_reason = 'upi_timeout' then 0.7900
      when simulated_failure_reason = 'network_error' then 0.7200
      when simulated_failure_reason = 'issuer_declined' then 0.5800
      when simulated_failure_reason = 'insufficient_funds' then 0.4600
      when simulated_failure_reason = 'risk_review' then 0.3900
      when simulated_failure_reason = 'invalid_card' then 0.1800
      else 0.3300
    end as recovery_probability,
    case
      when status = 'SUCCEEDED' then 'NOT_REQUIRED'
      when status = 'RECOVERED' then 'RECOVERED'
      when n % 5 = 0 then 'NOT_RECOVERABLE'
      else 'PENDING'
    end as recovery_status
  from deterministic_payments
)
insert into public.payments (
  payment_id, customer_id, amount, currency, payment_method, gateway, status,
  failure_reason, attempt_number, previous_failures, customer_success_history,
  timestamp, merchant_category, customer_tenure, device_type, country,
  hour_of_day, is_recurring_payment, days_since_last_success, recoverable,
  recovery_probability, recovery_status
)
select
  payment_id, customer_id, amount, 'INR', payment_method, gateway, status,
  failure_reason, attempt_number, previous_failures, customer_success_history,
  event_timestamp, merchant_category, customer_tenure, device_type, 'IN',
  hour_of_day, is_recurring_payment, days_since_last_success, recoverable,
  recovery_probability, recovery_status
from normalized_payments
on conflict (payment_id) do nothing;

insert into public.recovery_cases (
  payment_id, recovery_probability, ai_recommendation, confidence, case_status,
  diagnosis, reasoning, created_at
)
select
  payment_id,
  recovery_probability,
  case
    when recovery_probability < 0.45 or amount > 5000 or attempt_number >= 3 then 'escalate_to_human'
    when failure_reason in ('invalid_card', 'insufficient_funds') then 'suggest_alternate_payment'
    when failure_reason = 'risk_review' then 'send_recovery_reminder'
    when recovery_probability >= 0.70 then 'retry_payment'
    else 'send_recovery_reminder'
  end,
  least(0.9500, recovery_probability + 0.1000),
  case
    when status = 'RECOVERED' then 'RESOLVED'
    when recovery_probability < 0.45 or amount > 5000 or attempt_number >= 3 then 'HUMAN_REVIEW_REQUIRED'
    when recovery_probability >= 0.75 then 'AUTOPILOT_ELIGIBLE'
    else 'OPEN'
  end,
  coalesce(failure_reason, 'not_required'),
  case
    when recovery_probability >= 0.70 and amount <= 5000 and attempt_number < 3 then 'Simulated payment context supports a bounded recovery action under the local demonstration policy.'
    else 'Simulated payment context requires a lower-risk recovery action or human review under the local demonstration policy.'
  end,
  timestamp + interval '30 seconds'
from public.payments
where status in ('FAILED', 'RECOVERED', 'PENDING')
on conflict (payment_id) do nothing;

insert into public.recovery_actions (
  payment_id, action_type, execution_status, amount_recovered, executed_at, message
)
select
  payment_id,
  'retry_payment',
  'SUCCESS',
  amount,
  timestamp + interval '45 seconds',
  'Simulated local gateway retry succeeded. No real payment was processed.'
from public.payments
where status = 'RECOVERED'
  and not exists (
    select 1
    from public.recovery_actions as existing_action
    where existing_action.payment_id = payments.payment_id
      and existing_action.action_type = 'retry_payment'
      and existing_action.execution_status = 'SUCCESS'
  )
on conflict do nothing;

insert into public.audit_logs (
  payment_id, ai_decision, diagnosis, recovery_probability, confidence,
  policy_result, action, execution_result, amount_recovered, reason, timestamp
)
select
  recovery_case.payment_id,
  recovery_case.ai_recommendation,
  recovery_case.diagnosis,
  recovery_case.recovery_probability,
  recovery_case.confidence,
  case
    when recovery_case.case_status = 'HUMAN_REVIEW_REQUIRED' then 'REQUIRES_HUMAN_REVIEW'
    when recovery_case.ai_recommendation = 'retry_payment' then 'PASSED'
    else 'PASSED_WITH_GUARDRAIL'
  end,
  recovery_case.ai_recommendation,
  case when payment.status = 'RECOVERED' then 'SUCCESS' else 'NOT_EXECUTED' end,
  case when payment.status = 'RECOVERED' then payment.amount else 0 end,
  recovery_case.reasoning,
  recovery_case.created_at + interval '10 seconds'
from public.recovery_cases as recovery_case
join public.payments as payment on payment.payment_id = recovery_case.payment_id
where not exists (
  select 1 from public.audit_logs as audit
  where audit.payment_id = recovery_case.payment_id
)
on conflict do nothing;

commit;

-- Verification queries for a fresh local database:
-- select count(*) as payments from public.payments;                 -- expected: 10000
-- select count(*) as recovery_cases from public.recovery_cases;     -- expected: 2307
-- select count(*) as recovery_actions from public.recovery_actions; -- expected: 769
-- select count(*) as audit_logs from public.audit_logs;             -- expected: 2307
