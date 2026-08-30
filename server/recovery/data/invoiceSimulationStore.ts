import type { InvoiceRecoveryAction, InvoiceSimulationResult, PromiseProposal } from "../domain/invoiceRecoveryEngine.js";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("ReVora Supabase server credentials are not configured.");
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

async function insert(table: string, values: Record<string, unknown>) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`Supabase ${table} simulation record failed with ${response.status}.`);
  return response.json() as Promise<Record<string, unknown>[]>;
}

export async function recordInvoiceSimulation(
  result: InvoiceSimulationResult,
  context: { recoveryProbability: number; outstandingAmount: number; promise?: PromiseProposal; executionMode?: "standard" | "automation"; automationName?: string },
) {
  const timestamp = new Date().toISOString();
  const automation = context.executionMode === "automation";
  const label = automation ? "[SIMULATED AUTOMATION]" : "[SIMULATED]";
  const automationName = context.automationName?.trim().slice(0, 80);
  const contextLabel = automationName ? ` Automation: ${automationName}.` : "";
  const policyDecision = await insert("invoice_policy_decisions", {
    invoice_id: result.invoiceId,
    action: result.action,
    policy_result: result.policy.result.toUpperCase(),
    rule_code: result.policy.ruleCode,
    reason: result.policy.reason,
    recovery_probability: context.recoveryProbability,
    outstanding_amount: context.outstandingAmount,
    policy_version: result.policy.policyVersion,
    actor: automation ? "automation_simulator" : "invoice_policy_engine",
    simulation_only: true,
    decision_timestamp: timestamp,
  });
  let promise = null;
  if (result.action === "mark_promise_to_pay" && result.executionStatus === "success" && context.promise) {
    const inserted = await insert("invoice_promises", {
      invoice_id: result.invoiceId,
      promised_amount: context.promise.promisedAmount,
      promised_date: context.promise.promisedDate,
      status: "active",
      note: "[SIMULATED] Operator-recorded Promise-to-Pay. No external customer contact occurred.",
    });
    promise = inserted[0] ?? null;
  }
  const recoveryAction = await insert("invoice_recovery_actions", {
    invoice_id: result.invoiceId,
    action_type: result.action,
    execution_status: result.executionStatus.toUpperCase(),
    amount_recovered: result.amountRecovered,
    executed_at: timestamp,
    message: `${label} ${result.message}${contextLabel}`,
  });
  await insert("invoice_audit_logs", {
    invoice_id: result.invoiceId,
    ai_decision: result.action,
    diagnosis: automation ? "automation_invoice_recovery_simulation" : "deterministic_invoice_recovery_simulation",
    recovery_probability: context.recoveryProbability,
    policy_result: result.policy.result.toUpperCase(),
    action: result.action,
    execution_result: result.executionStatus.toUpperCase(),
    amount_recovered: result.amountRecovered,
    reason: `${label} ${result.policy.ruleCode}: ${result.policy.reason}${contextLabel}`,
    timestamp,
  });
  return { policyDecision: policyDecision[0] ?? null, recoveryAction: recoveryAction[0] ?? null, promise, simulatedAction: result.action as InvoiceRecoveryAction };
}
