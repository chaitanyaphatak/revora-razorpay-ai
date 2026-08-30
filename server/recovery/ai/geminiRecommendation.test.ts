import { afterEach, describe, expect, it, vi } from "vitest";
import { generateGeminiRecoveryExplanation } from "./geminiRecommendation";
import { buildRecoveryIntelligence } from "../domain/recoveryEngine";

const payment = { id: "P-TEST", customerId: "C-TEST", amount: 2800, currency: "INR", paymentMethod: "upi", gateway: "gateway", status: "failed", failureReason: "gateway_timeout", attemptNumber: 1, previousFailures: 0, customerSuccessHistory: 0.8, timestamp: new Date("2026-01-01"), merchantCategory: "test", customerTenure: 20, deviceType: "mobile", country: "IN", hourOfDay: 10, isRecurring: false, daysSinceLastSuccess: 2, recoverable: true, recoveryProbability: 0.81, recoveryStatus: "pending" };

describe("Gemini recovery explanation", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  afterEach(() => { process.env.GEMINI_API_KEY = originalKey; vi.unstubAllGlobals(); });

  it("returns only concise explanation fields while preserving the deterministic recommendation", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ diagnosisSummary: "Temporary gateway interruption.", businessExplanation: "The payment has a strong recovery signal under the current scenario.", riskNote: "A simulated outcome is not a payment execution." }) }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const intelligence = buildRecoveryIntelligence(payment, 0.81);
    const result = await generateGeminiRecoveryExplanation(payment, intelligence);
    expect(result.diagnosisSummary).toContain("gateway");
    expect(result.deterministicRecommendation.action).toBe(intelligence.recommendedAction);
    expect(result.deterministicRecommendation.policyResult).toBe(intelligence.candidates.find(candidate => candidate.action === intelligence.recommendedAction)?.policy.result);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("gemini-3.6-flash:generateContent");
  });
});
