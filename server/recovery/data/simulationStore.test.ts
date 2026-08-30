import { afterEach, describe, expect, it, vi } from "vitest";
import { recoveryActions } from "../domain/recoveryEngine";
import { recordSimulation } from "./simulationStore";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("simulated recovery persistence", () => {
  it("writes only simulated action and audit records with no real-payment instruction", async () => {
    const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
    global.fetch = vi.fn(async (input, init) => {
      requests.push({
        path: String(input),
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
      });
      return new Response(JSON.stringify([{ id: requests.length }]), { status: 201 });
    }) as typeof fetch;

    await recordSimulation({
      paymentId: "P00272",
      action: "retry_payment",
      policy: { action: "retry_payment", result: "approved", ruleCode: "RETRY_APPROVED", reason: "Safe deterministic retry.", policyVersion: "recoverai-v1" },
      executionStatus: "success",
      amountRecovered: 2810,
      deterministicRoll: 0.2,
      simulationSeed: "recoverai-v1|P00272|retry_payment|1|0.8143",
      message: "Simulated retry succeeded. No real payment was processed.",
    }, { recoveryProbability: 0.8143, attemptNumber: 1 });

    expect(requests).toHaveLength(3);
    expect(requests[0]?.path).toContain("/policy_decisions");
    expect(requests[0]?.body).toMatchObject({ policy_result: "APPROVED", rule_code: "RETRY_APPROVED", simulation_only: true });
    expect(requests[1]?.path).toContain("/recovery_actions");
    expect(requests[1]?.body.message).toContain("[SIMULATED]");
    expect(requests[2]?.path).toContain("/audit_logs");
    expect(requests[2]?.body.reason).toContain("[SIMULATED]");
    expect(JSON.stringify(requests)).toContain("No real payment was processed.");
  });

  it("preserves every allowlisted action in simulated action and audit payloads", async () => {
    const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
    global.fetch = vi.fn(async (input, init) => {
      requests.push({
        path: String(input),
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
      });
      return new Response(JSON.stringify([{ id: requests.length }]), { status: 201 });
    }) as typeof fetch;

    for (const action of recoveryActions) {
      await recordSimulation({
        paymentId: "P-ACTION-COVERAGE",
        action,
        policy: { action, result: "approved", ruleCode: "TEST_APPROVED", reason: "Test-only simulated policy.", policyVersion: "recoverai-v1" },
        executionStatus: action === "escalate_to_human" ? "escalated" : action === "do_nothing" ? "skipped" : "success",
        amountRecovered: action === "retry_payment" ? 1000 : 0,
        deterministicRoll: 0.2,
        simulationSeed: `test-${action}`,
        message: `Simulated ${action}. No real payment was processed.`,
      }, { recoveryProbability: 0.8, attemptNumber: 1 });
    }

    expect(requests).toHaveLength(recoveryActions.length * 3);
    for (const action of recoveryActions) {
      const policyRequest = requests.find((request) => request.path.includes("/policy_decisions") && request.body.action === action);
      const actionRequest = requests.find((request) => request.path.includes("/recovery_actions") && request.body.action_type === action);
      const auditRequest = requests.find((request) => request.path.includes("/audit_logs") && request.body.action === action);
      expect(policyRequest?.body).toMatchObject({ policy_result: "APPROVED", rule_code: "TEST_APPROVED", simulation_only: true });
      expect(actionRequest?.body.message).toContain("[SIMULATED]");
      expect(auditRequest?.body.policy_result).toBe("APPROVED");
      expect(auditRequest?.body.reason).toContain("[SIMULATED]");
      expect(auditRequest?.body.reason).toContain("TEST_APPROVED");
    }
  });

  it("labels manual simulations and persists only a bounded operator note", async () => {
    const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
    global.fetch = vi.fn(async (input, init) => {
      requests.push({ path: String(input), body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> });
      return new Response(JSON.stringify([{ id: requests.length }]), { status: 201 });
    }) as typeof fetch;

    await recordSimulation({
      paymentId: "P-MANUAL", action: "send_recovery_reminder", policy: { action: "send_recovery_reminder", result: "approved", ruleCode: "SAFE_ACTION_APPROVED", reason: "Allowlisted test action.", policyVersion: "recoverai-v1" }, executionStatus: "failed", amountRecovered: 0, deterministicRoll: 0.1, simulationSeed: "manual-test", message: "Operator-selected simulated outcome recorded as not recovered. No real payment was processed.",
    }, { recoveryProbability: 0.75, attemptNumber: 1, executionMode: "manual", operatorNote: "Reviewed queue before simulation." });

    expect(requests).toHaveLength(3);
    expect(requests[0]?.body.actor).toBe("manual_simulation_operator");
    expect(requests[1]?.body.message).toContain("[SIMULATED MANUAL]");
    expect(requests[1]?.body.message).toContain("Reviewed queue before simulation.");
    expect(requests[2]?.body.diagnosis).toBe("manual_recovery_simulation");
    expect(JSON.stringify(requests)).not.toContain("http://");
  });

  it("labels Automation runs as simulated and does not represent them as provider activity", async () => {
    const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
    global.fetch = vi.fn(async (input, init) => {
      requests.push({ path: String(input), body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> });
      return new Response(JSON.stringify([{ id: requests.length }]), { status: 201 });
    }) as typeof fetch;

    await recordSimulation({ paymentId: "P-AUTOMATION", action: "retry_payment", policy: { action: "retry_payment", result: "approved", ruleCode: "RETRY_APPROVED", reason: "Test-only automation run.", policyVersion: "recoverai-v1" }, executionStatus: "success", amountRecovered: 1499, deterministicRoll: 0.2, simulationSeed: "automation-test", message: "Simulated retry succeeded. No real payment was processed." }, { recoveryProbability: 0.9, attemptNumber: 1, executionMode: "automation", automationName: "Failed payment recovery" });

    expect(requests[0]?.body.actor).toBe("automation_simulator");
    expect(requests[1]?.body.message).toContain("[SIMULATED AUTOMATION]");
    expect(requests[1]?.body.message).toContain("Automation: Failed payment recovery.");
    expect(requests[2]?.body.diagnosis).toBe("automation_recovery_simulation");
    expect(JSON.stringify(requests)).toContain("No real payment was processed.");
  });
});
