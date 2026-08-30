import { describe, expect, it } from "vitest";
import { generateGeminiMerchantAssistantAnswer } from "./geminiMerchantAssistant";

const describeLive = process.env.RUN_GEMINI_LIVE_TESTS === "true" ? describe : describe.skip;

describeLive("Gemini live merchant assistant", () => {
  it("returns a concise read-only answer to a general RecoverAI question", async () => {
    const result = await generateGeminiMerchantAssistantAnswer([{ role: "user", content: "Does RecoverAI process real payments?" }]);
    expect(result.provider).toBe("gemini");
    expect(result.answer.length).toBeGreaterThan(10);
    expect(result.answer.length).toBeLessThanOrEqual(550);
    expect(result.sources).toContain("recoverai_product");
    expect(result.safetyNotice).toMatch(/read-only/i);
  }, 30_000);
});
