import { describe, expect, it } from "vitest";
import { generateGeminiRecoveryExplanation } from "./geminiRecommendation";
import { buildRecoveryIntelligence } from "../domain/recoveryEngine";
import { getPaymentById } from "../data/supabaseData";

const describeLive = process.env.RUN_GEMINI_LIVE_TESTS === "true" ? describe : describe.skip;

describeLive("Gemini live structured recovery explanation", () => {
  it("returns a concise structured brief while retaining the deterministic policy recommendation", async () => {
    const payment = await getPaymentById("P00272");
    expect(payment).toBeTruthy();
    const intelligence = buildRecoveryIntelligence(payment!);
    const result = await generateGeminiRecoveryExplanation(payment!, intelligence);
    expect(result.provider).toBe("gemini");
    expect(result.diagnosisSummary.length).toBeGreaterThan(10);
    expect(result.businessExplanation.length).toBeGreaterThan(20);
    expect(result.deterministicRecommendation.action).toBe(intelligence.recommendedAction);
    expect(result.deterministicRecommendation.ruleCode).toBe(intelligence.candidates.find(candidate => candidate.action === intelligence.recommendedAction)?.policy.ruleCode);
  }, 30_000);
});
