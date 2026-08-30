import { describe, expect, it } from "vitest";
import { simulateAutomationRecovery, simulateOverdueInvoiceAutomation } from "./automationSimulation";
import type { NormalizedPayment } from "../data/supabaseData";

const retryablePayment: NormalizedPayment = {
  id: "P-AUTOMATION", customerId: "C-AUTOMATION", amount: 1499, currency: "INR", paymentMethod: "upi", gateway: "test", status: "failed", failureReason: "gateway_timeout", attemptNumber: 1, previousFailures: 0, recoveryProbability: 0.9, recoveryConfidence: 0.9, recoverable: true, recoveryStatus: "pending", timestamp: "2026-08-27T00:00:00Z", merchantCategory: "retail", customerTenure: 720, deviceType: "mobile", country: "IN", isRecurring: false, daysSinceLastSuccess: 2, customerSuccessHistory: 0.92,
};

describe("Automation simulation contract", () => {
  it("returns deterministic, simulation-only recovery progress and a bounded result", () => {
    const first = simulateAutomationRecovery(retryablePayment, "retry_payment");
    const second = simulateAutomationRecovery(retryablePayment, "retry_payment");

    expect(first).toEqual(second);
    expect(first.progressSteps).toContain("Preparing simulated customer notification — nothing is sent");
    expect(first.progressSteps.join(" ")).toContain("no provider is contacted");
    expect(first.simulation.message).toContain("No real payment was processed.");
    expect(first.simulatedDurationSeconds).toBeGreaterThanOrEqual(10);
    expect(first.simulatedDurationSeconds).toBeLessThanOrEqual(30);
  });

  it("represents policy-gated retries as blocked or exhausted instead of performing an action", () => {
    const exhausted = simulateAutomationRecovery({ ...retryablePayment, attemptNumber: 2 }, "retry_payment");

    expect(exhausted.simulation.executionStatus).toBe("blocked");
    expect(exhausted.resultState).toBe("exhausted");
    expect(exhausted.simulation.amountRecovered).toBe(0);
  });

  it("maps an overdue automation to the established receivables simulator without a collection action", () => {
    const overdue = simulateOverdueInvoiceAutomation({ invoiceId: "INV-AUTOMATION", amount: 1499, amountPaid: 0, dueDate: "2026-08-01", status: "open" }, "retry_payment");

    expect(overdue.executedAction).toBe("follow_up");
    expect(overdue.progressSteps).toContain("Overdue invoice detected");
    expect(overdue.progressSteps.join(" ")).toContain("no collection channel is contacted");
    expect(overdue.simulation.message).toContain("No real message or payment was processed.");
  });
});
