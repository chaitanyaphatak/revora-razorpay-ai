-- =============================================================================
-- ReVora: 12 Live Customer Records & Dynamic Email Recipients (Pure Upsert — No Deletes)
-- Safe with append-only triggers on policy_decisions.
-- Run this in Supabase SQL Editor.
-- =============================================================================

begin;

-- 1. Create Recovery Recipients table if not exists
create table if not exists public.recovery_recipients (
  customer_id text primary key,
  customer_name text not null,
  customer_email text not null,
  phone text,
  updated_at timestamptz default now()
);

-- 2. Upsert All 12 Customer Email Recipients (Zero Deletes)
insert into public.recovery_recipients (
  customer_id,
  customer_name,
  customer_email
)
values
  ('C-94281', 'Rahul Sharma', 'rahul.sharma@example.com'),
  ('C-81934', 'Priya Patel', 'priya.patel@example.com'),
  ('C-44102', 'Amit Verma', 'amit.verma@example.com'),
  ('C-88324', 'Sneha Kulkarni', 'sneha.kulkarni@example.com'),
  ('C-33912', 'Rohan Mehta', 'rohan.mehta@example.com'),
  ('C-67240', 'Ananya Iyer', 'ananya.iyer@example.com'),
  ('C-19453', 'Vikram Malhotra', 'vikram.malhotra@example.com'),
  ('C-48291', 'Pooja Deshmukh', 'pooja.deshmukh@example.com'),
  ('C-90214', 'Rajesh Nair', 'rajesh.nair@example.com'),
  ('C-71839', 'Neha Choudhury', 'neha.choudhury@example.com'),
  ('C-62910', 'Aditya Reddy', 'aditya.reddy@example.com'),
  ('C-84021', 'Simran Kaur', 'simran.kaur@example.com')
on conflict (customer_id) do update set
  customer_name = excluded.customer_name,
  customer_email = excluded.customer_email,
  updated_at = now();

-- 3. Upsert All 12 Customer Payments (Zero Deletes)
insert into public.payments (
  payment_id, customer_id, amount, currency, payment_method, gateway,
  status, failure_reason, attempt_number, previous_failures,
  customer_success_history, timestamp, merchant_category, customer_tenure,
  device_type, country, hour_of_day, is_recurring_payment,
  days_since_last_success, recoverable, recovery_probability, recovery_status
)
values
  ('P-98421', 'C-94281', 2999.00, 'INR', 'upi', 'razorpay', 'FAILED', 'upi_timeout', 2, 1, 0.85, now() - interval '2 hours', 'digital_services', 180, 'mobile', 'IN', 14, true, 3, true, 0.88, 'PENDING'),
  ('P-76219', 'C-81934', 4500.00, 'INR', 'card', 'razorpay', 'FAILED', 'insufficient_funds', 1, 0, 0.72, now() - interval '5 hours', 'digital_services', 90, 'desktop', 'IN', 11, true, 7, true, 0.76, 'PENDING'),
  ('P-54102', 'C-44102', 1499.00, 'INR', 'upi', 'razorpay', 'FAILED', 'bank_server_down', 2, 1, 0.91, now() - interval '1 hour', 'digital_services', 240, 'mobile', 'IN', 16, true, 2, true, 0.91, 'PENDING'),
  ('P-88324', 'C-88324', 6200.00, 'INR', 'card', 'razorpay', 'FAILED', 'network_drop', 1, 0, 0.80, now() - interval '3 hours', 'digital_services', 120, 'mobile', 'IN', 13, true, 4, true, 0.83, 'PENDING'),
  ('P-33912', 'C-33912', 8999.00, 'INR', 'upi', 'razorpay', 'FAILED', 'daily_limit_exceeded', 3, 2, 0.65, now() - interval '6 hours', 'digital_services', 60, 'mobile', 'IN', 10, true, 12, true, 0.69, 'PENDING'),
  ('P-67240', 'C-67240', 3499.00, 'INR', 'upi', 'razorpay', 'FAILED', 'upi_pin_retry_limit', 2, 1, 0.88, now() - interval '4 hours', 'digital_services', 150, 'mobile', 'IN', 15, true, 5, true, 0.85, 'PENDING'),
  ('P-19453', 'C-19453', 14999.00, 'INR', 'card', 'razorpay', 'FAILED', 'card_security_block', 1, 0, 0.75, now() - interval '8 hours', 'digital_services', 300, 'desktop', 'IN', 9, true, 1, true, 0.72, 'PENDING'),
  ('P-48291', 'C-48291', 2199.00, 'INR', 'upi', 'razorpay', 'FAILED', 'gateway_timeout', 1, 0, 0.90, now() - interval '30 minutes', 'digital_services', 210, 'mobile', 'IN', 18, true, 2, true, 0.89, 'PENDING'),
  ('P-90214', 'C-90214', 5500.00, 'INR', 'card', 'razorpay', 'FAILED', 'card_expired', 2, 1, 0.79, now() - interval '7 hours', 'digital_services', 160, 'desktop', 'IN', 12, true, 6, true, 0.78, 'PENDING'),
  ('P-71839', 'C-71839', 7450.00, 'INR', 'card', 'razorpay', 'FAILED', 'insufficient_funds', 1, 0, 0.68, now() - interval '10 hours', 'digital_services', 75, 'mobile', 'IN', 8, true, 14, true, 0.64, 'PENDING'),
  ('P-62910', 'C-62910', 11200.00, 'INR', 'netbanking', 'razorpay', 'FAILED', 'session_expired', 1, 0, 0.84, now() - interval '4 hours', 'digital_services', 360, 'desktop', 'IN', 14, true, 3, true, 0.81, 'PENDING'),
  ('P-84021', 'C-84021', 4199.00, 'INR', 'upi', 'razorpay', 'FAILED', 'otp_timed_out', 2, 1, 0.86, now() - interval '1 hour', 'digital_services', 190, 'mobile', 'IN', 17, true, 4, true, 0.87, 'PENDING')
on conflict (payment_id) do update set
  status = excluded.status,
  amount = excluded.amount,
  failure_reason = excluded.failure_reason,
  recovery_probability = excluded.recovery_probability,
  recovery_status = excluded.recovery_status;

-- 4. Upsert All 12 Recovery Cases (Zero Deletes)
insert into public.recovery_cases (
  payment_id, recovery_probability, ai_recommendation, confidence, case_status, diagnosis, reasoning, created_at
)
values
  ('P-98421', 0.88, 'voice_recovery', 0.90, 'voice_recommended', 'UPI bank timeout during recurring subscription.', 'Customer Rahul Sharma has 85% success history. Recommended for Hinglish Voice Recovery.', now() - interval '2 hours'),
  ('P-76219', 0.76, 'voice_recovery', 0.85, 'voice_recommended', 'Card declined due to temporary insufficient balance.', 'Customer Priya Patel requested flexible payment options or Promise-to-Pay.', now() - interval '5 hours'),
  ('P-54102', 0.91, 'voice_recovery', 0.93, 'voice_recommended', 'Bank core server timeout on UPI channel.', 'Customer Amit Verma is high-tenure user. Immediate voice recovery recommended.', now() - interval '1 hour'),
  ('P-88324', 0.83, 'voice_recovery', 0.88, 'voice_recommended', 'Mobile network dropped during OTP auth.', 'Customer Sneha Kulkarni ready to complete on voice assistant link.', now() - interval '3 hours'),
  ('P-33912', 0.69, 'voice_recovery', 0.82, 'voice_recommended', 'Daily UPI transaction ceiling reached.', 'Customer Rohan Mehta candidate for Netbanking or Card switch.', now() - interval '6 hours'),
  ('P-67240', 0.85, 'voice_recovery', 0.89, 'voice_recommended', 'UPI PIN retry threshold reached.', 'Customer Ananya Iyer needs alternate link for card or netbanking.', now() - interval '4 hours'),
  ('P-19453', 0.72, 'voice_recovery', 0.84, 'voice_recommended', 'High ticket risk check triggered.', 'Customer Vikram Malhotra ready to authorize high-value payment.', now() - interval '8 hours'),
  ('P-48291', 0.89, 'voice_recovery', 0.92, 'voice_recommended', 'Gateway webhook timeout during peak hours.', 'Customer Pooja Deshmukh transient failure with 90% tenure score.', now() - interval '30 minutes'),
  ('P-90214', 0.78, 'voice_recovery', 0.86, 'voice_recommended', 'Saved card expired.', 'Customer Rajesh Nair prompt to add new card via voice assistant.', now() - interval '7 hours'),
  ('P-71839', 0.64, 'voice_recovery', 0.80, 'voice_recommended', 'Month-end balance limit reached.', 'Customer Neha Choudhury candidate for Promise-to-Pay workflow.', now() - interval '10 hours'),
  ('P-62910', 0.81, 'voice_recovery', 0.87, 'voice_recommended', 'Corporate portal session timeout.', 'Customer Aditya Reddy direct checkout routing recommended.', now() - interval '4 hours'),
  ('P-84021', 0.87, 'voice_recovery', 0.91, 'voice_recommended', 'SMS OTP delayed by telecom provider.', 'Customer Simran Kaur retry via Razorpay standard checkout.', now() - interval '1 hour')
on conflict (payment_id) do update set
  recovery_probability = excluded.recovery_probability,
  confidence = excluded.confidence,
  case_status = excluded.case_status,
  diagnosis = excluded.diagnosis,
  reasoning = excluded.reasoning;

commit;
