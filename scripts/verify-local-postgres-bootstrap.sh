#!/usr/bin/env bash
set -euo pipefail

: "${LOCAL_DATABASE_URL:?Set LOCAL_DATABASE_URL to an empty personal PostgreSQL database before running this verification.}"

psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/supabase/recoverai_schema.sql
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/supabase/recoverai_local_seed.sql

payments=$(psql "$LOCAL_DATABASE_URL" -Atc "select count(*) from public.payments")
recovery_cases=$(psql "$LOCAL_DATABASE_URL" -Atc "select count(*) from public.recovery_cases")
recovery_actions=$(psql "$LOCAL_DATABASE_URL" -Atc "select count(*) from public.recovery_actions")
audit_logs=$(psql "$LOCAL_DATABASE_URL" -Atc "select count(*) from public.audit_logs")

test "$payments" = "10000"
test "$recovery_cases" = "2307"
test "$recovery_actions" = "769"
test "$audit_logs" = "2307"

echo "RecoverAI local PostgreSQL bootstrap verified: payments=$payments, recovery_cases=$recovery_cases, recovery_actions=$recovery_actions, audit_logs=$audit_logs"
