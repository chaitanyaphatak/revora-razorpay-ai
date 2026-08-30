import { describe, expect, it } from "vitest";
import { buildRecoveryIntelligence, isManualSimulationOutcomeAllowed, recoveryActions, simulateManualRecovery, simulateRecovery, evaluatePolicy } from "./recoveryEngine";
import { predictPaymentRecoveryProbability } from "./model/modelPredictor";
import type { NormalizedPayment } from "../data/supabaseData";

const retryablePayment: NormalizedPayment = {
  id: "P-DEMO-APPROVED",
  customerId: "C-DEMO",
  amount: 2499,
  currency: "INR",
  paymentMethod: "upi",
  gateway: "razorcore",
  status: "failed",
  failureReason: "gateway_timeout",
  attemptNumber: 1,
  previousFailures: 0,
  recoveryProbability: 0.91,
  recoveryConfidence: 0.94,
  recoverable: true,
  recoveryStatus: "pending",
  timestamp: "2026-08-27T00:00:00Z",
  merchantCategory: "retail",
  customerTenure: 720,
  deviceType: "mobile",
  country: "IN",
  isRecurring: false,
  daysSinceLastSuccess: 3,
  customerSuccessHistory: 0.92,
};

describe("RecoverAI deterministic policy", () => {
  it("approves a low-risk retry only when all retry conditions are met", () => {
    const policy = evaluatePolicy(retryablePayment, "retry_payment");
    expect(policy).toMatchObject({ result: "approved", ruleCode: "RETRY_APPROVED" });
  });

  it("blocks a retry after the maximum retry boundary", () => {
    const policy = evaluatePolicy({ ...retryablePayment, attemptNumber: 2 }, "retry_payment");
    expect(policy).toMatchObject({ result: "blocked", ruleCode: "RETRY_LIMIT_REACHED" });
  });

  it("requires human review for high-value recovery actions", () => {
    const policy = evaluatePolicy({ ...retryablePayment, amount: 7500 }, "retry_payment");
    expect(policy).toMatchObject({ result: "human_review_required", ruleCode: "HIGH_VALUE_REVIEW" });
  });
});

describe("RecoverAI action ranking and simulation", () => {
  it("ranks a safe retry as the preferred recovery action for a gateway timeout", () => {
    const intelligence = buildRecoveryIntelligence(retryablePayment);
    expect(intelligence.recommendedAction).toBe("retry_payment");
    expect(intelligence.expectedRecoveryValue).toBeGreaterThan(0);
  });

  it("produces a bounded deterministic probability from the portable selected model", () => {
    const first = predictPaymentRecoveryProbability(retryablePayment);
    const second = predictPaymentRecoveryProbability(retryablePayment);
    expect(first).toBe(second);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
  });

  it("returns the exact same result for the same simulated payment state", () => {
    const first = simulateRecovery(retryablePayment, "retry_payment");
    const second = simulateRecovery(retryablePayment, "retry_payment");
    expect(first).toEqual(second);
    expect(first.message).toContain("No real payment was processed.");
  });

  it("does not execute a simulated payment action when the policy requires review", () => {
    const result = simulateRecovery({ ...retryablePayment, amount: 9000 }, "retry_payment");
    expect(result.executionStatus).toBe("blocked");
    expect(result.amountRecovered).toBe(0);
  });

  it("handles every allowlisted action as a bounded simulated workflow", () => {
    const results = recoveryActions.map((action) => simulateRecovery(retryablePayment, action));
    expect(results.map((result) => result.action)).toEqual(recoveryActions);
    expect(results.every((result) => result.message.toLowerCase().includes("simulated") || result.executionStatus === "skipped")).toBe(true);
    expect(results.find((result) => result.action === "escalate_to_human")?.executionStatus).toBe("escalated");
    expect(results.find((result) => result.action === "do_nothing")?.executionStatus).toBe("skipped");
  });

  it("records an operator-selected manual outcome only after deterministic policy approval", () => {
    const success = simulateManualRecovery(retryablePayment, "retry_payment", "recovered");
    const blocked = simulateManualRecovery({ ...retryablePayment, amount: 9000 }, "retry_payment", "recovered");
    expect(success).toMatchObject({ simulationMode: "manual", selectedOutcome: "recovered", executionStatus: "success", amountRecovered: retryablePayment.amount });
    expect(success.message).toContain("No real payment was processed.");
    expect(blocked).toMatchObject({ simulationMode: "manual", executionStatus: "blocked", amountRecovered: 0 });
    expect(blocked.message).toContain("not recorded");
  });

  it("allows only outcome choices that make sense for the selected manual action", () => {
    expect(isManualSimulationOutcomeAllowed("retry_payment", "recovered")).toBe(true);
    expect(isManualSimulationOutcomeAllowed("retry_payment", "escalated")).toBe(false);
    expect(isManualSimulationOutcomeAllowed("escalate_to_human", "escalated")).toBe(true);
    expect(isManualSimulationOutcomeAllowed("do_nothing", "skipped")).toBe(true);
  });
});
