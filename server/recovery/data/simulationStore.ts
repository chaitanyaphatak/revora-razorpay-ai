import type { SimulationResult } from "../domain/recoveryEngine";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("ReVora Supabase server credentials are not configured.");
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

async function insert(path: string, values: Record<string, unknown>) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`Supabase simulation record failed with ${response.status}.`);
  return response.json() as Promise<Record<string, unknown>[]>;
}

export async function recordSimulation(result: SimulationResult, context: { recoveryProbability: number; attemptNumber: number; recoveryCaseId?: number | null; executionMode?: "standard" | "manual" | "automation"; operatorNote?: string; automationName?: string }) {
  const executedAt = new Date().toISOString();
  const manual = context.executionMode === "manual";
  const automation = context.executionMode === "automation";
  const label = manual ? "[SIMULATED MANUAL]" : automation ? "[SIMULATED AUTOMATION]" : "[SIMULATED]";
  const operatorNote = context.operatorNote?.trim().slice(0, 240);
  const automationName = context.automationName?.trim().slice(0, 80);
  const contextLabel = operatorNote ? ` Operator note: ${operatorNote}` : automationName ? ` Automation: ${automationName}.` : "";
  const storedPolicy = await insert("policy_decisions", {
    payment_id: result.paymentId,
    recovery_case_id: context.recoveryCaseId ?? null,
    recovery_action_id: null,
    action: result.action,
    policy_result: result.policy.result.toUpperCase(),
    rule_code: result.policy.ruleCode,
    reason: result.policy.reason,
    recovery_probability: context.recoveryProbability,
    attempt_number: context.attemptNumber,
    autopilot_limit_amount: 5000,
    policy_version: result.policy.policyVersion,
    actor: manual ? "manual_simulation_operator" : automation ? "automation_simulator" : "policy_engine",
    simulation_only: true,
    decision_timestamp: executedAt,
  });
  const storedAction = await insert("recovery_actions", {
    payment_id: result.paymentId,
    action_type: result.action,
    execution_status: result.executionStatus.toUpperCase(),
    amount_recovered: result.amountRecovered,
    executed_at: executedAt,
    message: `${label} ${result.message}${contextLabel}`,
  });
  await insert("audit_logs", {
    payment_id: result.paymentId,
    ai_decision: result.action,
    diagnosis: manual ? "manual_recovery_simulation" : automation ? "automation_recovery_simulation" : "deterministic_recovery_simulation",
    recovery_probability: null,
    confidence: null,
    policy_result: result.policy.result.toUpperCase(),
    action: result.action,
    execution_result: result.executionStatus.toUpperCase(),
    amount_recovered: result.amountRecovered,
    reason: `${label} ${result.policy.ruleCode}: ${result.policy.reason}${contextLabel}`,
    timestamp: executedAt,
  });
  return { policyDecision: storedPolicy[0] ?? null, recoveryAction: storedAction[0] ?? null };
}
