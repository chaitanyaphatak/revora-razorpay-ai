export const invoiceRecoveryActions = ["send_reminder", "follow_up", "escalate", "mark_promise_to_pay", "do_nothing"] as const;
export type InvoiceRecoveryAction = (typeof invoiceRecoveryActions)[number];
export type InvoicePolicyResult = "approved" | "blocked" | "human_review_required";

export type InvoiceRiskInput = {
  invoiceId: string;
  amount: number;
  amountPaid: number;
  dueDate: string;
  status: string;
  activePromise?: { promisedAmount: number; promisedDate: string; isMissed: boolean } | null;
};

export type PromiseProposal = { promisedAmount: number; promisedDate: string };

export type InvoicePolicyDecision = {
  action: InvoiceRecoveryAction;
  result: InvoicePolicyResult;
  ruleCode: string;
  reason: string;
  policyVersion: "recoverai-invoice-v1";
};

export type InvoiceActionCandidate = {
  action: InvoiceRecoveryAction;
  successProbability: number;
  expectedRecoveryValue: number;
  risk: "low" | "medium" | "high";
  humanEffort: "none" | "low" | "high";
  policy: InvoicePolicyDecision;
};

export type InvoiceRecoveryIntelligence = {
  invoiceId: string;
  recoveryProbability: number;
  outstandingAmount: number;
  daysOverdue: number;
  recoveryRisk: "low" | "medium" | "high";
  recommendedAction: InvoiceRecoveryAction;
  expectedRecoveryValue: number;
  candidates: InvoiceActionCandidate[];
  reasons: string[];
};

export type InvoiceSimulationResult = {
  invoiceId: string;
  action: InvoiceRecoveryAction;
  policy: InvoicePolicyDecision;
  executionStatus: "success" | "failed" | "blocked" | "escalated" | "skipped";
  amountRecovered: number;
  deterministicRoll: number;
  message: string;
  simulationSeed: string;
};

const asUtcDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
const todayUtc = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

export function getInvoiceOutstandingAmount(invoice: InvoiceRiskInput) {
  if (["paid", "cancelled", "written_off"].includes(invoice.status.toLowerCase())) return 0;
  return Math.max(0, Math.round((invoice.amount - invoice.amountPaid) * 100) / 100);
}

export function getInvoiceDaysOverdue(invoice: InvoiceRiskInput, now = todayUtc()) {
  if (["paid", "cancelled", "written_off"].includes(invoice.status.toLowerCase()) || getInvoiceOutstandingAmount(invoice) <= 0) return 0;
  const due = asUtcDate(invoice.dueDate);
  if (!Number.isFinite(due.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
}

export function calculateInvoiceRecoveryProbability(invoice: InvoiceRiskInput) {
  const outstanding = getInvoiceOutstandingAmount(invoice);
  const daysOverdue = getInvoiceDaysOverdue(invoice);
  if (!outstanding || ["paid", "cancelled", "written_off"].includes(invoice.status.toLowerCase())) return 0;
  if (invoice.status.toLowerCase() === "disputed") return 0.18;
  let score = 0.48;
  score += Math.min(0.22, daysOverdue / 90 * 0.22);
  score += outstanding >= 50_000 ? 0.09 : outstanding >= 15_000 ? 0.04 : 0;
  if (invoice.activePromise?.isMissed) score -= 0.15;
  else if (invoice.activePromise) score += 0.08;
  return Math.max(0.08, Math.min(0.94, Number(score.toFixed(4))));
}

export function evaluateInvoicePolicy(invoice: InvoiceRiskInput, action: InvoiceRecoveryAction, promise?: PromiseProposal): InvoicePolicyDecision {
  const outstanding = getInvoiceOutstandingAmount(invoice);
  const daysOverdue = getInvoiceDaysOverdue(invoice);
  const probability = calculateInvoiceRecoveryProbability(invoice);
  const status = invoice.status.toLowerCase();
  const decision = (result: InvoicePolicyResult, ruleCode: string, reason: string): InvoicePolicyDecision => ({ action, result, ruleCode, reason, policyVersion: "recoverai-invoice-v1" });

  if (action === "do_nothing") return decision("approved", "INVOICE_NO_ACTION_ALLOWED", "The operator may decide not to simulate a receivables action.");
  if (!outstanding) return decision("blocked", "INVOICE_SETTLED", "The invoice has no outstanding balance in the approved source context.");
  if (action === "escalate") return decision("approved", "INVOICE_ESCALATION_ALLOWED", "Escalation is an allowed review workflow and does not contact a customer or alter an invoice.");
  if (status === "disputed") return decision("human_review_required", "INVOICE_DISPUTE_REVIEW", "A disputed invoice requires human review; automated collection simulation is not allowed.");
  if (daysOverdue < 1) return decision("blocked", "INVOICE_NOT_OVERDUE", "The invoice is not overdue under the supplied due date, so receivables action is not available.");
  if (action === "mark_promise_to_pay") {
    if (!promise) return decision("human_review_required", "PROMISE_DETAILS_REQUIRED", "A promised amount and future promised date are required before a simulated Promise-to-Pay can be recorded.");
    if (promise.promisedAmount <= 0 || promise.promisedAmount > outstanding) return decision("blocked", "PROMISE_AMOUNT_INVALID", "The promised amount must be greater than zero and cannot exceed the outstanding invoice balance.");
    if (asUtcDate(promise.promisedDate).getTime() <= todayUtc().getTime()) return decision("blocked", "PROMISE_DATE_INVALID", "The promised date must be a future business date.");
    return decision("approved", "PROMISE_RECORDING_ALLOWED", "The future Promise-to-Pay is within the outstanding balance and can be recorded as a simulation-only commitment.");
  }
  if (outstanding > 50_000) return decision("human_review_required", "INVOICE_HIGH_VALUE_REVIEW", "The outstanding balance exceeds the ₹50,000 simulation boundary and requires human review.");
  if (invoice.activePromise?.isMissed) return decision("human_review_required", "MISSED_PROMISE_REVIEW", "A prior Promise-to-Pay is missed, so a human should review the next collection step.");
  if (action === "send_reminder") {
    if (daysOverdue > 14) return decision("blocked", "REMINDER_WINDOW_EXPIRED", "Reminder simulation is limited to invoices up to 14 days overdue; use a follow-up or escalation workflow instead.");
    if (probability < 0.45) return decision("blocked", "REMINDER_PROBABILITY_LOW", "Reminder simulation requires at least 45% calculated recovery probability.");
    return decision("approved", "REMINDER_ALLOWED", "The invoice is overdue, within the reminder window, and inside the deterministic recovery threshold.");
  }
  if (daysOverdue < 7) return decision("blocked", "FOLLOW_UP_TOO_EARLY", "Follow-up simulation begins seven days after the due date; a reminder may be appropriate first.");
  if (probability < 0.4) return decision("human_review_required", "FOLLOW_UP_LOW_CONFIDENCE", "The calculated recovery probability is below the follow-up confidence boundary.");
  return decision("approved", "FOLLOW_UP_ALLOWED", "The overdue invoice meets the deterministic follow-up timing, value, and recovery-probability boundaries.");
}

function actionProfile(action: InvoiceRecoveryAction) {
  if (action === "escalate") return { risk: "low" as const, humanEffort: "high" as const, baseProbability: 0 };
  if (action === "mark_promise_to_pay") return { risk: "low" as const, humanEffort: "low" as const, baseProbability: 0 };
  if (action === "follow_up") return { risk: "medium" as const, humanEffort: "low" as const, baseProbability: 0.58 };
  if (action === "send_reminder") return { risk: "low" as const, humanEffort: "none" as const, baseProbability: 0.42 };
  return { risk: "low" as const, humanEffort: "none" as const, baseProbability: 0 };
}

function candidateSuccessProbability(action: InvoiceRecoveryAction, recoveryProbability: number) {
  const base = actionProfile(action).baseProbability;
  return base ? Math.max(0.05, Math.min(0.92, Number((base + (recoveryProbability - 0.5) * 0.25).toFixed(4)))) : 0;
}

export function buildInvoiceRecoveryIntelligence(invoice: InvoiceRiskInput): InvoiceRecoveryIntelligence {
  const outstandingAmount = getInvoiceOutstandingAmount(invoice);
  const daysOverdue = getInvoiceDaysOverdue(invoice);
  const recoveryProbability = calculateInvoiceRecoveryProbability(invoice);
  const candidates = invoiceRecoveryActions.map(action => {
    const policy = evaluateInvoicePolicy(invoice, action);
    const profile = actionProfile(action);
    const successProbability = candidateSuccessProbability(action, recoveryProbability);
    const expectedRecoveryValue = policy.result === "approved" && ["send_reminder", "follow_up"].includes(action) ? Number((outstandingAmount * recoveryProbability * successProbability).toFixed(2)) : 0;
    return { action, policy, successProbability, expectedRecoveryValue, risk: profile.risk, humanEffort: profile.humanEffort };
  });
  const preferred = invoice.status.toLowerCase() === "disputed" || invoice.activePromise?.isMissed || daysOverdue > 30 ? "escalate" : daysOverdue >= 7 ? "follow_up" : "send_reminder";
  const recommendedCandidate = candidates.find(candidate => candidate.action === preferred && candidate.policy.result === "approved") ?? candidates.find(candidate => candidate.policy.result === "approved" && candidate.action !== "do_nothing") ?? candidates.find(candidate => candidate.action === "do_nothing")!;
  const reasons = [
    `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue.`,
    `₹${outstandingAmount.toLocaleString("en-IN")} outstanding.`,
    invoice.activePromise?.isMissed ? "An active Promise-to-Pay is past its promised date." : invoice.activePromise ? "An active Promise-to-Pay is on record." : "No active Promise-to-Pay is recorded.",
  ];
  return { invoiceId: invoice.invoiceId, recoveryProbability, outstandingAmount, daysOverdue, recoveryRisk: recoveryProbability >= 0.7 ? "high" : recoveryProbability >= 0.45 ? "medium" : "low", recommendedAction: recommendedCandidate.action, expectedRecoveryValue: recommendedCandidate.expectedRecoveryValue, candidates, reasons };
}

function deterministicUnitInterval(input: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

export function simulateInvoiceRecovery(invoice: InvoiceRiskInput, action: InvoiceRecoveryAction, promise?: PromiseProposal): InvoiceSimulationResult {
  const intelligence = buildInvoiceRecoveryIntelligence(invoice);
  const policy = evaluateInvoicePolicy(invoice, action, promise);
  const simulationSeed = `recoverai-invoice-v1|${invoice.invoiceId}|${action}|${intelligence.daysOverdue}|${intelligence.recoveryProbability.toFixed(4)}`;
  const deterministicRoll = deterministicUnitInterval(simulationSeed);
  if (policy.result === "blocked" || policy.result === "human_review_required") return { invoiceId: invoice.invoiceId, action, policy, executionStatus: "blocked", amountRecovered: 0, deterministicRoll, simulationSeed, message: `${policy.result === "blocked" ? "Blocked" : "Escalated for human review"} by deterministic receivables policy. No message, collection, or payment was sent.` };
  if (action === "escalate") return { invoiceId: invoice.invoiceId, action, policy, executionStatus: "escalated", amountRecovered: 0, deterministicRoll, simulationSeed, message: "The overdue invoice was escalated in the simulated workflow. No external collection activity occurred." };
  if (action === "mark_promise_to_pay") return { invoiceId: invoice.invoiceId, action, policy, executionStatus: "success", amountRecovered: 0, deterministicRoll, simulationSeed, message: "The Promise-to-Pay was recorded in the simulated receivables workflow. No payment was collected." };
  if (action === "do_nothing") return { invoiceId: invoice.invoiceId, action, policy, executionStatus: "skipped", amountRecovered: 0, deterministicRoll, simulationSeed, message: "No receivables action was simulated by operator choice." };
  const success = deterministicRoll < candidateSuccessProbability(action, intelligence.recoveryProbability);
  return { invoiceId: invoice.invoiceId, action, policy, executionStatus: success ? "success" : "failed", amountRecovered: success ? intelligence.outstandingAmount : 0, deterministicRoll, simulationSeed, message: success ? `Simulated ${action.replaceAll("_", " ")} reached a recovery outcome. No real message or payment was processed.` : `Simulated ${action.replaceAll("_", " ")} did not reach a recovery outcome. No real message or payment was processed.` };
}
