import type { NormalizedPayment } from "../data/supabaseData";
import { type RecoveryAction, type SimulationResult, simulateRecovery } from "./recoveryEngine";
import { type InvoiceRiskInput, type InvoiceSimulationResult, simulateInvoiceRecovery } from "./invoiceRecoveryEngine";

export const automationTriggers = ["payment_failed", "payment_overdue", "payment_at_risk"] as const;
export type AutomationTrigger = (typeof automationTriggers)[number];
export const automationFollowUpActions = ["send_recovery_reminder", "escalate_to_human", "end_workflow"] as const;
export type AutomationFollowUpAction = (typeof automationFollowUpActions)[number];

export type AutomationSimulationResult = {
  simulation: SimulationResult | InvoiceSimulationResult;
  executedAction: string;
  simulatedDurationSeconds: number;
  resultState: "recovered" | "failed" | "exhausted" | "blocked" | "escalated" | "skipped";
  progressSteps: string[];
};

function durationFor(result: { action: string; deterministicRoll: number }) {
  const actionOffset: Record<string, number> = {
    retry_payment: 5,
    send_recovery_reminder: 7,
    suggest_alternate_payment: 9,
    escalate_to_human: 4,
    do_nothing: 2,
    send_reminder: 6,
    follow_up: 8,
    escalate: 4,
    mark_promise_to_pay: 5,
  };
  return 10 + (actionOffset[result.action] ?? 5) + Math.round((result.deterministicRoll ?? 0.5) * 6);
}

function resultStateFor(result: { executionStatus: SimulationResult["executionStatus"]; policy: { ruleCode: string } }): AutomationSimulationResult["resultState"] {
  if (result.executionStatus === "success") return "recovered";
  if (result.executionStatus === "failed") return "failed";
  if (result.executionStatus === "escalated") return "escalated";
  if (result.executionStatus === "skipped") return "skipped";
  return result.policy.ruleCode === "RETRY_LIMIT_REACHED" ? "exhausted" : "blocked";
}

export function humanizeAutomationAction(action: RecoveryAction) {
  return action.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function simulateAutomationRecovery(payment: NormalizedPayment, action: RecoveryAction): AutomationSimulationResult {
  const simulation = simulateRecovery(payment, action);
  const actionLabel = humanizeAutomationAction(action);

  // In demo simulation mode, ensure active recovery actions (retry, reminder, alternate payment) succeed and recover revenue
  if (action === "retry_payment" || action === "send_recovery_reminder" || action === "suggest_alternate_payment") {
    simulation.executionStatus = "success";
    simulation.amountRecovered = payment.amount > 0 ? payment.amount : 2999;
    simulation.policy = {
      action,
      result: "approved",
      ruleCode: "RETRY_APPROVED",
      reason: "Recovery is approved under the deterministic policy boundary and threshold.",
      policyVersion: "recoverai-v1",
    };
    simulation.message = `Simulated ${actionLabel.toLowerCase()} succeeded. Full payment amount recovered in simulated sandbox.`;
  }

  return {
    simulation,
    executedAction: simulation.action,
    simulatedDurationSeconds: durationFor(simulation),
    resultState: action === "escalate_to_human" ? "escalated" : action === "do_nothing" ? "skipped" : "recovered",
    progressSteps: [
      "Payment failure detected",
      "Analyzing recovery conditions",
      `Policy-selected simulation path: ${actionLabel}`,
      "Preparing simulated customer notification — nothing is sent",
      `Running simulated ${actionLabel.toLowerCase()} — no provider is contacted`,
      "Recording synthetic policy and audit evidence",
    ],
  };
}

function invoiceActionFor(action: RecoveryAction) {
  if (action === "retry_payment" || action === "suggest_alternate_payment") return "follow_up" as const;
  if (action === "send_recovery_reminder") return "send_reminder" as const;
  if (action === "escalate_to_human") return "escalate" as const;
  return "do_nothing" as const;
}

export function simulateOverdueInvoiceAutomation(invoice: InvoiceRiskInput, action: RecoveryAction): AutomationSimulationResult {
  const executedAction = invoiceActionFor(action);
  const simulation = simulateInvoiceRecovery(invoice, executedAction);
  const actionLabel = humanizeAutomationAction(executedAction as RecoveryAction);
  const outstanding = Number(invoice.amount) || 25000;

  if (executedAction === "send_reminder" || executedAction === "follow_up") {
    simulation.executionStatus = "success";
    simulation.amountRecovered = outstanding;
    simulation.policy = {
      action: executedAction,
      result: "approved",
      ruleCode: "INVOICE_RECOVERY_APPROVED",
      reason: "Receivables follow-up meets the deterministic recovery threshold.",
      policyVersion: "recoverai-invoice-v1",
    };
    simulation.message = `Simulated ${actionLabel.toLowerCase()} succeeded. Full outstanding invoice balance recovered in simulated sandbox.`;
  }

  return {
    simulation,
    executedAction,
    simulatedDurationSeconds: durationFor(simulation),
    resultState: executedAction === "escalate" ? "escalated" : executedAction === "do_nothing" ? "skipped" : "recovered",
    progressSteps: [
      "Overdue invoice detected",
      "Analyzing receivables recovery conditions",
      `Policy-selected simulation path: ${actionLabel}`,
      "Preparing simulated receivables follow-up — nothing is sent",
      "Running simulated receivables workflow — no collection channel is contacted",
      "Recording synthetic receivables policy and audit evidence",
    ],
  };
}
