import { describe, expect, it } from "vitest";
import { getOperationsCenter } from "./operationsData";

describe("RecoverAI operations center", () => {
  it("calculates playbooks, safety-bound autopilot candidates, escalations, and audit records from Supabase data", async () => {
    const operations = await getOperationsCenter();
    expect(operations.playbooks.length).toBeGreaterThan(0);
    expect(operations.autopilot.maxAmount).toBe(5_000);
    expect(operations.auditEvents.length).toBeGreaterThan(0);
    expect(operations.auditEvents.length).toBeGreaterThan(80);
    expect(operations.escalationQueue.every(item => item.amount > 5_000 || item.probability < 0.5 || item.caseStatus.toUpperCase().includes("REVIEW") || item.caseStatus.toUpperCase().includes("HUMAN"))).toBe(true);
  }, 20_000);
});
