-- =============================================================================
-- ReVora: Seed Data for Impact Creator Voice Recovery Demo (2 Demo Customers)
-- Run this in Supabase SQL Editor to seed the 2 demo customer payment records.
-- =============================================================================

begin;

-- 1. Insert/Upsert Demo Payments
insert into public.payments (
  payment_id,
  customer_id,
  amount,
  currency,
  payment_method,
  gateway,
  status,
  failure_reason,
  attempt_number,
  previous_failures,
  customer_success_history,
  timestamp,
  merchant_category,
  customer_tenure,
  device_type,
  country,
  hour_of_day,
  is_recurring_payment,
  days_since_last_success,
  recoverable,
  recovery_probability,
  recovery_status
)
values
  (
    'P-VOICE-1001',
    'C-DEMO-RAHUL',
    2999.00,
    'INR',
    'upi',
    'razorpay',
    'FAILED',
    'upi_timeout',
    2,
    1,
    0.850000,
    now() - interval '2 hours',
    'digital_services',
    180,
    'mobile',
    'IN',
    14,
    true,
    3,
    true,
    0.820000,
    'PENDING'
  ),
  (
    'P-VOICE-1002',
    'C-DEMO-PRIYA',
    4500.00,
    'INR',
    'card',
    'razorpay',
    'FAILED',
    'insufficient_funds',
    1,
    0,
    0.720000,
    now() - interval '5 hours',
    'digital_services',
    90,
    'desktop',
    'IN',
    11,
    true,
    7,
    true,
    0.650000,
    'PENDING'
  )
on conflict (payment_id) do update set
  amount = excluded.amount,
  status = excluded.status,
  failure_reason = excluded.failure_reason,
  attempt_number = excluded.attempt_number,
  recovery_probability = excluded.recovery_probability,
  recovery_status = excluded.recovery_status,
  timestamp = excluded.timestamp;

-- 2. Insert/Upsert Recovery Cases for Demo Customers
insert into public.recovery_cases (
  payment_id,
  recovery_probability,
  ai_recommendation,
  confidence,
  case_status,
  diagnosis,
  reasoning,
  created_at
)
values
  (
    'P-VOICE-1001',
    0.820000,
    'voice_recovery',
    0.880000,
    'voice_recommended',
    'UPI bank timeout detected during recurring subscription renewal.',
    'Customer Rahul Sharma has 85% success history. Failure is transient UPI gateway timeout. Recommended for Hinglish Voice Recovery Assistant with Card/UPI alternative routing.',
    now() - interval '2 hours'
  ),
  (
    'P-VOICE-1002',
    0.650000,
    'voice_recovery',
    0.850000,
    'voice_recommended',
    'Card declined due to insufficient funds / card limit.',
    'Customer Priya Patel requested flexible payment options. Recommended for Hinglish Voice Assistant to capture Promise-to-Pay or alternate payment route.',
    now() - interval '5 hours'
  )
on conflict (payment_id) do update set
  recovery_probability = excluded.recovery_probability,
  ai_recommendation = excluded.ai_recommendation,
  confidence = excluded.confidence,
  case_status = excluded.case_status,
  diagnosis = excluded.diagnosis,
  reasoning = excluded.reasoning;

-- 3. Initial Audit Logs for Demo Customers
insert into public.audit_logs (
  payment_id,
  ai_decision,
  diagnosis,
  recovery_probability,
  confidence,
  policy_result,
  action,
  execution_result,
  amount_recovered,
  reason,
  timestamp
)
values
  (
    'P-VOICE-1001',
    'voice_recovery',
    'Payment failure detected (UPI timeout)',
    0.820000,
    0.880000,
    'APPROVED',
    'recommend_voice_recovery',
    'PENDING',
    0.00,
    'ReVora rules engine recommended Hinglish Voice Recovery for Rahul Sharma (₹2,999).',
    now() - interval '2 hours'
  ),
  (
    'P-VOICE-1002',
    'voice_recovery',
    'Payment failure detected (insufficient funds)',
    0.650000,
    0.850000,
    'APPROVED',
    'recommend_voice_recovery',
    'PENDING',
    0.00,
    'ReVora rules engine recommended Hinglish Voice Recovery for Priya Patel (₹4,500).',
    now() - interval '5 hours'
  );

commit;

-- Verification query
select payment_id, customer_id, amount, status, failure_reason, recovery_probability from public.payments where payment_id in ('P-VOICE-1001', 'P-VOICE-1002');
