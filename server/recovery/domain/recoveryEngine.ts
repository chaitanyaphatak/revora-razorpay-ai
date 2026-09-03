import { predictPaymentRecoveryProbability } from "./model/modelPredictor.js";
import type { NormalizedPayment } from "../data/supabaseData";

const selectedModelMetadata = {
  name: "logisticRegression",
  selectedThreshold: 0.47,
  heldOutTest: {
    accuracy: 0.7165,
    confusionMatrix: { falseNegative: 29, falsePositive: 98, trueNegative: 198, truePositive: 123 },
    f1: 0.6595,
    precision: 0.5566,
    recall: 0.8092,
    rocAuc: 0.8174,
    threshold: 0.47,
  },
} as const;

export const recoveryActions = ["retry_payment", "send_recovery_reminder", "suggest_alternate_payment", "escalate_to_human", "do_nothing"] as const;
export type RecoveryAction = (typeof recoveryActions)[number];
export const manualSimulationOutcomes = ["recovered", "not_recovered", "escalated", "skipped"] as const;
export type ManualSimulationOutcome = (typeof manualSimulationOutcomes)[number];

export type PolicyResult = "approved" | "blocked" | "human_review_required";
export type PolicyDecision = {
  action: RecoveryAction;
  result: PolicyResult;
  ruleCode: string;
  reason: string;
  policyVersion: "recoverai-v1";
};

export type ActionCandidate = {
  action: RecoveryAction;
  successProbability: number;
  expectedRecoveryValue: number;
  risk: "low" | "medium" | "high";
  humanEffort: "none" | "low" | "high";
  policy: PolicyDecision;
};

export type RecoveryIntelligence = {
  paymentId: string;
  recoveryProbability: number;
  model: {
    name: string;
    selectedThreshold: number;
    heldOutMetrics: typeof selectedModelMetadata.heldOutTest;
  };
  recommendedAction: RecoveryAction;
  expectedRecoveryValue: number;
  candidates: ActionCandidate[];
};

const retryableFailures = new Set(["gateway_timeout", "upi_timeout", "network_error", "issuer_declined", "bank_server_down", "network_drop"]);
const actionBaseSuccess: Record<RecoveryAction, Record<string, number>> = {
  retry_payment: {
    gateway_timeout: 0.85,
    upi_timeout: 0.82,
    bank_server_down: 0.88,
    network_drop: 0.80,
    network_error: 0.74,
    issuer_declined: 0.58,
    default: 0.2,
  },
  send_recovery_reminder: { default: 0.46 },
  suggest_alternate_payment: {
    invalid_card: 0.69,
    insufficient_funds: 0.63,
    issuer_declined: 0.58,
    default: 0.41,
  },
  escalate_to_human: { default: 0.9 },
  do_nothing: { default: 0 },
};

function normalizedFailureReason(payment: NormalizedPayment) {
  return payment.failureReason?.trim().toLowerCase() ?? "unknown";
}

function successProbability(action: RecoveryAction, payment: NormalizedPayment) {
  const reason = normalizedFailureReason(payment);
  const base = actionBaseSuccess[action][reason] ?? actionBaseSuccess[action].default;
  const historyLift = Math.max(-0.08, Math.min(0.08, (payment.customerSuccessHistory ?? 0.7) - 0.7));
  const retryPenalty = action === "retry_payment" ? Math.max(0, payment.attemptNumber - 1) * 0.08 : 0;
  return Math.max(0, Math.min(0.98, base + historyLift - retryPenalty));
}

export function evaluatePolicy(payment: NormalizedPayment, action: RecoveryAction): PolicyDecision {
  const probability = payment.recoveryProbability;
  const reason = normalizedFailureReason(payment);
  const maxAutopilotAmount = 5_000;
  const maxRetryAttempt = 2;

  if (action === "do_nothing") {
    return { action, result: "approved", ruleCode: "NO_ACTION_ALLOWED", reason: "The operator may choose not to simulate recovery for this payment.", policyVersion: "recoverai-v1" };
  }
  if (action === "escalate_to_human") {
    return { action, result: "approved", ruleCode: "ESCALATION_ALLOWED", reason: "Escalation is an allowed safe action and does not initiate a payment attempt.", policyVersion: "recoverai-v1" };
  }
  if (payment.amount > maxAutopilotAmount) {
    return { action, result: "human_review_required", ruleCode: "HIGH_VALUE_REVIEW", reason: `Payment value exceeds the simulated autopilot boundary of ₹${maxAutopilotAmount.toLocaleString("en-IN")}.`, policyVersion: "recoverai-v1" };
  }
  if (probability < 0.5) {
    return { action, result: "human_review_required", ruleCode: "LOW_CONFIDENCE_REVIEW", reason: "Recovery probability is below the 50% low-confidence escalation boundary.", policyVersion: "recoverai-v1" };
  }
  if (action === "retry_payment") {
    if (!retryableFailures.has(reason)) {
      return { action, result: "blocked", ruleCode: "NON_RETRYABLE_FAILURE", reason: "The failure reason is not in the allowlisted retryable failure set.", policyVersion: "recoverai-v1" };
    }
    if (payment.attemptNumber >= maxRetryAttempt) {
      return { action, result: "blocked", ruleCode: "RETRY_LIMIT_REACHED", reason: `The simulated retry limit of ${maxRetryAttempt - 1} additional attempt has been reached.`, policyVersion: "recoverai-v1" };
    }
    if (probability < 0.7) {
      return { action, result: "blocked", ruleCode: "RETRY_PROBABILITY_TOO_LOW", reason: "Retry requires at least 70% recovery probability under the deterministic policy.", policyVersion: "recoverai-v1" };
    }
    return { action, result: "approved", ruleCode: "RETRY_APPROVED", reason: "Retry is allowlisted, retryable, under the limit, within the amount boundary, and above the recovery threshold.", policyVersion: "recoverai-v1" };
  }
  if (action === "send_recovery_reminder" && probability < 0.55) {
    return { action, result: "blocked", ruleCode: "REMINDER_VALUE_TOO_LOW", reason: "Reminder execution requires at least 55% recovery probability.", policyVersion: "recoverai-v1" };
  }
  return { action, result: "approved", ruleCode: "SAFE_ACTION_APPROVED", reason: "The action is allowlisted and within the simulated merchant safety boundary.", policyVersion: "recoverai-v1" };
}

function actionProfile(action: RecoveryAction) {
  if (action === "escalate_to_human") return { risk: "low" as const, humanEffort: "high" as const };
  if (action === "retry_payment") return { risk: "low" as const, humanEffort: "none" as const };
  if (action === "send_recovery_reminder") return { risk: "low" as const, humanEffort: "none" as const };
  if (action === "suggest_alternate_payment") return { risk: "medium" as const, humanEffort: "low" as const };
  return { risk: "low" as const, humanEffort: "none" as const };
}

export function isVoiceRecoveryEligible(payment: NormalizedPayment): { eligible: boolean; reason: string } {
  if (payment.status !== "failed" && payment.status !== "pending") {
    return { eligible: false, reason: "Voice recovery is only recommended for failed or at-risk payments." };
  }
  if (payment.amount < 1000) {
    return { eligible: false, reason: "Payment amount is below the voice recovery recommendation threshold (₹1,000)." };
  }
  if (payment.attemptNumber >= 3) {
    return { eligible: false, reason: "Maximum recovery attempts reached." };
  }
  return { eligible: true, reason: "Payment is eligible for AI Voice Recovery Channel in Hinglish." };
}

export function getActionCandidates(payment: NormalizedPayment): ActionCandidate[] {
  return recoveryActions.map((action) => {
    const policy = evaluatePolicy(payment, action);
    const probability = successProbability(action, payment);
    const expectedRecoveryValue = policy.result === "approved" ? payment.amount * payment.recoveryProbability * probability : 0;
    return { action, successProbability: probability, expectedRecoveryValue, policy, ...actionProfile(action) };
  });
}

export function buildRecoveryIntelligence(payment: NormalizedPayment, probabilityOverride?: number): RecoveryIntelligence {
  const modelRecoveryProbability = probabilityOverride ?? predictPaymentRecoveryProbability(payment);
  const scoredPayment = { ...payment, recoveryProbability: modelRecoveryProbability };
  const candidates = getActionCandidates(scoredPayment);
  const score = (candidate: ActionCandidate) => {
    const riskPenalty = candidate.risk === "high" ? payment.amount * 0.12 : candidate.risk === "medium" ? payment.amount * 0.04 : 0;
    const effortPenalty = candidate.humanEffort === "high" ? payment.amount * 0.08 : candidate.humanEffort === "low" ? payment.amount * 0.02 : 0;
    return candidate.expectedRecoveryValue - riskPenalty - effortPenalty;
  };
  const recommended = candidates.reduce((best, candidate) => (score(candidate) > score(best) ? candidate : best));
  return {
    paymentId: payment.id,
    recoveryProbability: payment.recoveryProbability,
    model: {
      name: selectedModelMetadata.name,
      selectedThreshold: selectedModelMetadata.selectedThreshold,
      heldOutMetrics: selectedModelMetadata.heldOutTest,
    },
    recommendedAction: recommended.action,
    expectedRecoveryValue: recommended.expectedRecoveryValue,
    candidates,
  };
}

function deterministicUnitInterval(input: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

export type SimulationResult = {
  paymentId: string;
  action: RecoveryAction;
  policy: PolicyDecision;
  executionStatus: "success" | "failed" | "blocked" | "escalated" | "skipped";
  amountRecovered: number;
  deterministicRoll: number;
  message: string;
  simulationSeed: string;
};

export type ManualSimulationResult = SimulationResult & {
  simulationMode: "manual";
  selectedOutcome: ManualSimulationOutcome;
};

export function isManualSimulationOutcomeAllowed(action: RecoveryAction, outcome: ManualSimulationOutcome) {
  if (action === "escalate_to_human") return outcome === "escalated";
  if (action === "do_nothing") return outcome === "skipped";
  return outcome === "recovered" || outcome === "not_recovered";
}

export function simulateRecovery(payment: NormalizedPayment, action: RecoveryAction): SimulationResult {
  const policy = evaluatePolicy(payment, action);
  const simulationSeed = `recoverai-v1|${payment.id}|${action}|${payment.attemptNumber}|${payment.recoveryProbability.toFixed(4)}`;
  const deterministicRoll = deterministicUnitInterval(simulationSeed);
  if (policy.result === "blocked" || policy.result === "human_review_required") {
    return { paymentId: payment.id, action, policy, executionStatus: "blocked", amountRecovered: 0, deterministicRoll, simulationSeed, message: `${policy.result === "blocked" ? "Blocked" : "Escalated for human review"} by deterministic policy. No simulated payment action was executed.` };
  }
  if (action === "escalate_to_human") {
    return { paymentId: payment.id, action, policy, executionStatus: "escalated", amountRecovered: 0, deterministicRoll, simulationSeed, message: "Case escalated in the simulated environment. No payment action was executed." };
  }
  if (action === "do_nothing") {
    return { paymentId: payment.id, action, policy, executionStatus: "skipped", amountRecovered: 0, deterministicRoll, simulationSeed, message: "No recovery action was simulated by operator choice." };
  }
  const actionProbability = successProbability(action, payment);
  const success = deterministicRoll < actionProbability;
  return {
    paymentId: payment.id,
    action,
    policy,
    executionStatus: success ? "success" : "failed",
    amountRecovered: success ? payment.amount : 0,
    deterministicRoll,
    simulationSeed,
    message: success ? `Simulated ${action.replaceAll("_", " ")} succeeded. No real payment was processed.` : `Simulated ${action.replaceAll("_", " ")} did not recover the payment. No real payment was processed.`,
  };
}

export function simulateManualRecovery(payment: NormalizedPayment, action: RecoveryAction, outcome: ManualSimulationOutcome): ManualSimulationResult {
  if (!isManualSimulationOutcomeAllowed(action, outcome)) throw new Error("The selected simulated outcome is not valid for the chosen recovery action.");
  const base = simulateRecovery(payment, action);
  const simulationSeed = `${base.simulationSeed}|manual|${outcome}`;
  const deterministicRoll = deterministicUnitInterval(simulationSeed);
  if (base.policy.result !== "approved") {
    return { ...base, deterministicRoll, simulationSeed, simulationMode: "manual", selectedOutcome: outcome, executionStatus: "blocked", amountRecovered: 0, message: `${base.policy.result === "blocked" ? "Blocked" : "Escalated for human review"} by deterministic policy. The operator-selected outcome was not recorded.` };
  }
  const executionStatus = outcome === "recovered" ? "success" : outcome === "not_recovered" ? "failed" : outcome;
  const amountRecovered = outcome === "recovered" ? payment.amount : 0;
  const outcomeLabel = outcome.replaceAll("_", " ");
  return {
    ...base,
    deterministicRoll,
    simulationSeed,
    simulationMode: "manual",
    selectedOutcome: outcome,
    executionStatus,
    amountRecovered,
    message: `Operator-selected simulated outcome recorded as ${outcomeLabel} for ${action.replaceAll("_", " ")}. No real payment was processed.`,
  };
}
