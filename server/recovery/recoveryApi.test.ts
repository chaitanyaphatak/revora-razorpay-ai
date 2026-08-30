import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as geminiRecommendation from "./ai/geminiRecommendation";
import * as geminiMerchantAssistant from "./ai/geminiMerchantAssistant";
import * as invoiceData from "./data/invoiceData";
import * as invoiceSimulationStore from "./data/invoiceSimulationStore";
import * as geminiInvoiceRecommendation from "./ai/geminiInvoiceRecommendation";
import * as supabaseData from "./data/supabaseData";
import * as simulationStore from "./data/simulationStore";
import { buildInvoiceRecoveryIntelligence } from "./domain/invoiceRecoveryEngine";
import type { NormalizedPayment } from "./data/supabaseData";

function authenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "revora-test-operator",
      name: "ReVora Test Operator",
      email: "operator@example.com",
      loginMethod: "local",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("recovery intelligence API", () => {
  it("returns a model-backed recovery probability through the protected procedure", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    const intelligence = await caller.recovery.intelligence({ paymentId: "P00272" });

    expect(intelligence?.model.name).toBe("logisticRegression");
    expect(intelligence?.recoveryProbability).toBeGreaterThan(0);
    expect(intelligence?.recoveryProbability).toBeLessThan(1);
    expect(intelligence?.candidates.length).toBe(5);
  }, 15_000);

  it("returns a deterministic What-If preview without persisting a simulated action", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    const preview = await caller.recovery.whatIf({ paymentId: "P00272", action: "retry_payment", amount: 3000, recoveryProbability: 0.82, attemptNumber: 1 });
    expect(preview?.scenario.amount).toBe(3000);
    expect(preview?.preview.action).toBe("retry_payment");
    expect(preview?.preview.simulationSeed).toContain("P00272");
  }, 15_000);

  it("routes Gemini explanation generation through a protected procedure without changing deterministic recommendation authority", async () => {
    const spy = vi.spyOn(geminiRecommendation, "generateGeminiRecoveryExplanation").mockResolvedValue({ provider: "gemini", model: "gemini-3.6-flash", diagnosisSummary: "Test diagnosis.", businessExplanation: "Test explanation.", riskNote: "Test note.", deterministicRecommendation: { action: "retry_payment", policyResult: "approved", ruleCode: "RETRY_APPROVED", reason: "Deterministic policy test." } });
    const caller = appRouter.createCaller(authenticatedContext());
    const result = await caller.recovery.geminiExplanation({ paymentId: "P00272" });
    expect(result.deterministicRecommendation.action).toBe("retry_payment");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  }, 15_000);

  it("routes merchant questions through the read-only Gemini assistant contract without simulating an action", async () => {
    const spy = vi.spyOn(geminiMerchantAssistant, "generateGeminiMerchantAssistantAnswer").mockResolvedValue({ provider: "gemini", model: "gemini-3.6-flash", answer: "The selected payment is governed by deterministic policy.", sources: ["payment", "recovery_policy"], safetyNotice: "Read-only assistant: no payment or recovery action was executed.", paymentContextUsed: true });
    const caller = appRouter.createCaller(authenticatedContext());
    const result = await caller.recovery.merchantAssistant({ messages: [{ role: "user", content: "Why is this payment at risk?" }], paymentId: "P00272" });
    expect(result.paymentContextUsed).toBe(true);
    expect(result.sources).toContain("payment");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  }, 20_000);

  it("routes invoice Gemini analysis through the read-only contract without recording a receivables action", async () => {
    const invoice = { id: "INV-100", customerId: "C-100", customerName: null, amount: 12000, currency: "INR", issuedDate: "2026-07-01", dueDate: "2026-08-01", status: "open" as const, paymentTermsDays: 30, paymentReference: null, notes: null, amountRecovered: 0, outstandingAmount: 12000, daysOverdue: 26, recoveryProbability: 0.55, recoveryRisk: "medium" as const, recommendedAction: "follow_up" as const, activePromise: null };
    const intelligence = buildInvoiceRecoveryIntelligence({ invoiceId: invoice.id, amount: invoice.amount, amountPaid: 0, dueDate: invoice.dueDate, status: invoice.status });
    const detailSpy = vi.spyOn(invoiceData, "getInvoiceDetail").mockResolvedValue({ setupRequired: false, message: undefined, invoice, intelligence, promises: [], policyDecisions: [], actions: [], auditTimeline: [] } as never);
    const explanationSpy = vi.spyOn(geminiInvoiceRecommendation, "generateGeminiInvoiceExplanation").mockResolvedValue({ provider: "gemini", model: "gemini-3.6-flash", diagnosisSummary: "Invoice is overdue.", businessExplanation: "Policy selected a follow-up.", riskNote: "Simulation only.", operatorNextStep: "Review the queue.", deterministicRecommendation: { action: intelligence.recommendedAction, policyResult: "approved", ruleCode: "FOLLOW_UP_ALLOWED", reason: "Test." } });
    const persistSpy = vi.spyOn(invoiceSimulationStore, "recordInvoiceSimulation");
    const caller = appRouter.createCaller(authenticatedContext());
    const result = await caller.invoices.geminiAnalysis({ invoiceId: "INV-100" });
    expect(result.deterministicRecommendation.action).toBe(intelligence.recommendedAction);
    expect(explanationSpy).toHaveBeenCalledOnce();
    expect(persistSpy).not.toHaveBeenCalled();
    detailSpy.mockRestore(); explanationSpy.mockRestore(); persistSpy.mockRestore();
  });

  it("validates invoice simulation input and persists only an explicit policy-governed simulation", async () => {
    const dueDate = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const input = { invoiceId: "INV-200", amount: 12000, amountPaid: 0, dueDate, status: "open" as const, activePromise: null };
    const invoice = { id: "INV-200", customerId: "C-200", customerName: null, amount: 12000, currency: "INR", issuedDate: "2026-07-01", dueDate, status: "open" as const, paymentTermsDays: 30, paymentReference: null, notes: null, amountRecovered: 0, outstandingAmount: 12000, daysOverdue: 10, recoveryProbability: 0.5, recoveryRisk: "medium" as const, recommendedAction: "follow_up" as const, activePromise: null };
    const inputSpy = vi.spyOn(invoiceData, "getInvoiceRiskInput").mockResolvedValue({ input, invoice });
    const persistSpy = vi.spyOn(invoiceSimulationStore, "recordInvoiceSimulation").mockResolvedValue({ policyDecision: null, recoveryAction: null, promise: null, simulatedAction: "follow_up" });
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.invoices.simulate({ invoiceId: "invalid id!", action: "follow_up" })).rejects.toThrow();
    const result = await caller.invoices.simulate({ invoiceId: "INV-200", action: "follow_up" });
    expect(result.simulation.action).toBe("follow_up");
    expect(persistSpy).toHaveBeenCalledOnce();
    inputSpy.mockRestore(); persistSpy.mockRestore();
  });

  it("records only a policy-approved manual payment simulation with a bounded operator note", async () => {
    const payment: NormalizedPayment = { id: "P-MANUAL", customerId: "C-MANUAL", amount: 2499, currency: "INR", paymentMethod: "upi", gateway: "test", status: "failed", failureReason: "gateway_timeout", attemptNumber: 1, previousFailures: 0, recoveryProbability: 0.9, recoveryConfidence: 0.9, recoverable: true, recoveryStatus: "pending", timestamp: "2026-08-27T00:00:00Z", merchantCategory: "retail", customerTenure: 720, deviceType: "mobile", country: "IN", isRecurring: false, daysSinceLastSuccess: 3, customerSuccessHistory: 0.92 };
    const detailSpy = vi.spyOn(supabaseData, "getPaymentDetail").mockResolvedValue({ payment, recoveryCase: null, policyDecisions: [], auditEvents: [], customerContext: null } as never);
    const persistSpy = vi.spyOn(simulationStore, "recordSimulation").mockResolvedValue({ policyDecision: null, recoveryAction: null });
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.recovery.manualSimulate({ paymentId: "P-MANUAL", action: "retry_payment", outcome: "escalated" })).rejects.toThrow();
    const result = await caller.recovery.manualSimulate({ paymentId: "P-MANUAL", action: "retry_payment", outcome: "recovered", operatorNote: "Reviewed before simulation." });
    expect(result.simulation).toMatchObject({ simulationMode: "manual", executionStatus: "success", amountRecovered: 2499 });
    expect(persistSpy).toHaveBeenCalledWith(expect.objectContaining({ simulationMode: "manual" }), expect.objectContaining({ executionMode: "manual", operatorNote: "Reviewed before simulation." }));
    detailSpy.mockRestore(); persistSpy.mockRestore();
  });

  it("records an Automation test run as explicitly labelled synthetic evidence", async () => {
    const payment: NormalizedPayment = { id: "P-AUTOMATION", customerId: "C-AUTOMATION", amount: 1499, currency: "INR", paymentMethod: "upi", gateway: "test", status: "failed", failureReason: "gateway_timeout", attemptNumber: 1, previousFailures: 0, recoveryProbability: 0.9, recoveryConfidence: 0.9, recoverable: true, recoveryStatus: "pending", timestamp: "2026-08-27T00:00:00Z", merchantCategory: "retail", customerTenure: 720, deviceType: "mobile", country: "IN", isRecurring: false, daysSinceLastSuccess: 3, customerSuccessHistory: 0.92 };
    const detailSpy = vi.spyOn(supabaseData, "getPaymentDetail").mockResolvedValue({ payment, recoveryCase: null, policyDecisions: [], auditEvents: [], customerContext: null } as never);
    const persistSpy = vi.spyOn(simulationStore, "recordSimulation").mockResolvedValue({ policyDecision: null, recoveryAction: null });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.recovery.automationSimulate({ automationId: "invalid", automationName: "Failed payment recovery", paymentId: "P-AUTOMATION", action: "retry_payment" })).rejects.toThrow();
    const result = await caller.recovery.automationSimulate({ automationId: "auto_failed_payment", automationName: "Failed payment recovery", paymentId: "P-AUTOMATION", action: "retry_payment" });

    expect(result.automation.progressSteps).toContain("Recording synthetic policy and audit evidence");
    expect(persistSpy).toHaveBeenCalledWith(expect.objectContaining({ paymentId: "P-AUTOMATION" }), expect.objectContaining({ executionMode: "automation", automationName: "Failed payment recovery" }));
    detailSpy.mockRestore(); persistSpy.mockRestore();
  });

  it("routes overdue Automation tests through the existing receivables simulator", async () => {
    const invoice = { id: "INV-AUTOMATION", customerId: "C-AUTOMATION", customerName: null, amount: 1499, currency: "INR", issuedDate: "2026-07-01", dueDate: "2026-08-01", status: "open" as const, paymentTermsDays: 30, paymentReference: null, notes: null, amountRecovered: 0, outstandingAmount: 1499, daysOverdue: 26, recoveryProbability: 0.68, recoveryRisk: "medium" as const, recommendedAction: "follow_up" as const, activePromise: null };
    const inputSpy = vi.spyOn(invoiceData, "getInvoiceRiskInput").mockResolvedValue({ input: { invoiceId: invoice.id, amount: invoice.amount, amountPaid: 0, dueDate: invoice.dueDate, status: invoice.status }, invoice });
    const persistSpy = vi.spyOn(invoiceSimulationStore, "recordInvoiceSimulation").mockResolvedValue({ policyDecision: null, recoveryAction: null, promise: null, simulatedAction: "follow_up" });
    const caller = appRouter.createCaller(authenticatedContext());
    const result = await caller.recovery.automationInvoiceSimulate({ automationId: "auto_overdue_invoice", automationName: "Overdue receivables recovery", invoiceId: invoice.id, action: "retry_payment" });

    expect(result.automation.executedAction).toBe("follow_up");
    expect(persistSpy).toHaveBeenCalledWith(expect.objectContaining({ invoiceId: invoice.id }), expect.objectContaining({ executionMode: "automation", automationName: "Overdue receivables recovery" }));
    inputSpy.mockRestore(); persistSpy.mockRestore();
  });
});
