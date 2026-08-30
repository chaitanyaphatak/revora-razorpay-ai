import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const publicContext = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
} as TrpcContext;

describe("public ReVora preview", () => {
  it("loads dashboard data and What-If intelligence without an authenticated user", async () => {
    const caller = appRouter.createCaller(publicContext);
    const dashboard = await caller.recovery.dashboard({ range: "12M" });
    expect(dashboard.metrics.totalPayments).toBeGreaterThanOrEqual(10_000);
    const preview = await caller.recovery.whatIf({ paymentId: "P00272", action: "retry_payment" });
    expect(preview?.preview.policy.policyVersion).toBe("recoverai-v1");
    const sevenDayDashboard = await caller.recovery.dashboard({ range: "7D" });
    expect(sevenDayDashboard.metrics.totalPayments).toBeLessThanOrEqual(dashboard.metrics.totalPayments);
  }, 20_000);
});
