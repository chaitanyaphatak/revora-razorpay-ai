export type PolicyDecisionRecord = {
  id: number;
  paymentId: string;
  recoveryCaseId: number | null;
  recoveryActionId: number | null;
  action: string;
  result: string;
  ruleCode: string;
  reason: string;
  recoveryProbability: number | null;
  attemptNumber: number | null;
  autopilotLimitAmount: number;
  policyVersion: string;
  actor: string;
  simulationOnly: boolean;
  decisionTimestamp: string;
};

type SupabasePolicyDecision = {
  id: number;
  payment_id: string;
  recovery_case_id: number | null;
  recovery_action_id: number | null;
  action: string;
  policy_result: string;
  rule_code: string;
  reason: string;
  recovery_probability: number | string | null;
  attempt_number: number | null;
  autopilot_limit_amount: number | string;
  policy_version: string;
  actor: string;
  simulation_only: boolean;
  decision_timestamp: string;
};

function normalizeStatus(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function numberOrNull(value: number | string | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fractionOrNull(value: number | string | null) {
  const parsed = numberOrNull(value);
  if (parsed === null) return null;
  return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("ReVora Supabase server credentials are not configured.");
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export async function getPolicyDecisionsForPayment(paymentId: string) {
  const safePaymentId = paymentId.replace(/[^A-Za-z0-9_-]/g, "");
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/policy_decisions?payment_id=eq.${encodeURIComponent(safePaymentId)}&select=*&order=decision_timestamp.desc`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Supabase policy-decision read failed with ${response.status}.`);
  const rows = await response.json() as SupabasePolicyDecision[];
  return rows.map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    recoveryCaseId: row.recovery_case_id,
    recoveryActionId: row.recovery_action_id,
    action: row.action,
    result: normalizeStatus(row.policy_result),
    ruleCode: row.rule_code,
    reason: row.reason,
    recoveryProbability: fractionOrNull(row.recovery_probability),
    attemptNumber: row.attempt_number,
    autopilotLimitAmount: numberOrNull(row.autopilot_limit_amount) ?? 0,
    policyVersion: row.policy_version,
    actor: row.actor,
    simulationOnly: row.simulation_only,
    decisionTimestamp: row.decision_timestamp,
  } satisfies PolicyDecisionRecord));
}
