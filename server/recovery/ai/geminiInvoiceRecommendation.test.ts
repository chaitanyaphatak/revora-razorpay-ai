import { afterEach, describe, expect, it, vi } from "vitest";
import { generateGeminiInvoiceExplanation } from "./geminiInvoiceRecommendation";
import { buildInvoiceRecoveryIntelligence } from "../domain/invoiceRecoveryEngine";

const riskInput = { invoiceId: "INV-100", amount: 12000, amountPaid: 0, dueDate: "2020-01-15", status: "open" } as const;
const intelligence = buildInvoiceRecoveryIntelligence(riskInput);
const invoice = { id: "INV-100", customerId: "C_PRIVATE", customerName: "Private Buyer", amount: 12000, currency: "INR", issuedDate: "2020-01-01", dueDate: "2020-01-15", status: "open" as const, paymentTermsDays: 14, paymentReference: "SECRET-PO", notes: "PRIVATE NOTE", amountRecovered: 0, outstandingAmount: 12000, daysOverdue: intelligence.daysOverdue, recoveryProbability: intelligence.recoveryProbability, recoveryRisk: intelligence.recoveryRisk, recommendedAction: intelligence.recommendedAction, activePromise: null };

afterEach(() => vi.restoreAllMocks());

describe("Gemini invoice explanation", () => {
  it("fails closed without a server-side Gemini key", async () => {
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try { await expect(generateGeminiInvoiceExplanation(invoice, intelligence)).rejects.toThrow("GEMINI_API_KEY"); } finally { if (original === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original; }
  });

  it("sends only allowlisted invoice context and preserves the deterministic recommendation", async () => {
    const original = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ diagnosisSummary: "The invoice is overdue.", businessExplanation: "The due date has passed and policy selected a follow-up.", riskNote: "This is a simulation estimate.", operatorNextStep: "Review the policy-approved workflow." }) }] } }] }) } as Response);
    try {
      const result = await generateGeminiInvoiceExplanation(invoice, intelligence);
      const body = String(fetchSpy.mock.calls[0]?.[1]?.body);
      expect(body).toContain("INV-100");
      expect(body).toContain("12000");
      expect(body).not.toContain("C_PRIVATE");
      expect(body).not.toContain("Private Buyer");
      expect(body).not.toContain("SECRET-PO");
      expect(body).not.toContain("PRIVATE NOTE");
      expect(result.deterministicRecommendation.action).toBe(intelligence.recommendedAction);
    } finally { if (original === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original; }
  });
});
