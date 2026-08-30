import { describe, expect, it } from "vitest";

describe("Gemini server credential", () => {
  it("authenticates to the Gemini model catalog without exposing the API key", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey, "GEMINI_API_KEY must be configured server-side").toBeTruthy();

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": apiKey! },
    });

    expect(response.ok, `Gemini model catalog returned ${response.status}`).toBe(true);
    const payload = await response.json() as { models?: Array<{ name?: string }> };
    expect(payload.models?.some(model => model.name?.includes("gemini"))).toBe(true);
  }, 15_000);
});
