import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("public preview router", () => {
  it("allows recovery discovery without a session and no longer exposes a logout endpoint", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const result = await caller.recovery.payments({ page: 1, pageSize: 1, sort: "newest" });

    expect(result.total).toBeGreaterThanOrEqual(10_000);
    expect(result.payments).toHaveLength(1);
    expect("auth" in appRouter._def.record).toBe(false);
  });
});
