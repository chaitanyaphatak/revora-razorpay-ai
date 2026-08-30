import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function operatorContext(): TrpcContext {
  return {
    user: { id: 1, openId: "recoverai-e2e-operator", name: "Recovery Operator", email: "operator@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("recovery operator workflow", () => {
  it("traverses dashboard, payment discovery, decision detail, What-If preview, policy ledger, and operations timeline through public APIs", async () => {
    const caller = appRouter.createCaller(operatorContext());
    const dashboard = await caller.recovery.dashboard({ range: "12M" });
    expect(dashboard.metrics.totalPayments).toBeGreaterThanOrEqual(10_000);

    const payments = await caller.recovery.payments({ page: 1, pageSize: 20, status: "FAILED", sort: "probability_desc" });
    expect(payments.payments.length).toBeGreaterThan(0);
    const paymentId = payments.payments[0]!.id;
    const customerId = payments.payments[0]!.customerId;
    const customerPayments = await caller.recovery.payments({ page: 1, pageSize: 20, customerId, sort: "newest" });
    expect(customerPayments.payments.length).toBeGreaterThan(0);
    expect(customerPayments.payments.every(payment => payment.customerId === customerId)).toBe(true);

    const detail = await caller.recovery.paymentDetail({ paymentId });
    expect(detail?.payment.id).toBe(paymentId);
    const intelligence = await caller.recovery.intelligence({ paymentId });
    expect(intelligence?.expectedRecoveryValue).toBeGreaterThanOrEqual(0);

    const whatIf = await caller.recovery.whatIf({ paymentId, action: "retry_payment", amount: detail!.payment.amount, recoveryProbability: intelligence!.recoveryProbability, attemptNumber: 1 });
    expect(whatIf?.preview.policy.policyVersion).toBe("recoverai-v1");
    expect(whatIf?.preview.message).toContain("No");

    const ledger = await caller.recovery.policyDecisions({ paymentId });
    expect(Array.isArray(ledger)).toBe(true);
    const operations = await caller.recovery.operationsCenter();
    expect(operations.auditEvents.length).toBeGreaterThan(80);
    expect(operations.playbooks.length).toBeGreaterThan(0);
  }, 30_000);
});
