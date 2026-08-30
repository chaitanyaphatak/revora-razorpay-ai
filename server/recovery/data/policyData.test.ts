import { describe, expect, it } from "vitest";
import { getPolicyDecisionsForPayment } from "./policyData";

describe("Supabase policy-decision ledger", () => {
  it("reads the applied policy-decision table without mutating source data", async () => {
    const decisions = await getPolicyDecisionsForPayment("P00272");
    expect(Array.isArray(decisions)).toBe(true);
    expect(decisions.every((decision) => decision.simulationOnly)).toBe(true);
  }, 15_000);
});
