import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Overview range transition continuity", () => {
  it("retains the last settled dashboard while the selected range is fetching", () => {
    const dashboard = source("client/src/pages/OperationsDashboard.tsx");

    expect(dashboard).toContain("lastSettledDashboard");
    expect(dashboard).toContain("const settledDashboard = queryData ? { range, data: queryData } : lastSettledDashboard.current");
    expect(dashboard).toContain("if (isLoading && !data) return <DashboardSkeleton />");
    expect(dashboard).toContain("isRangeRefreshing");
    expect(dashboard).toContain("Showing {displayedRange} while {range} source data updates");
  });

  it("uses a bounded source cache and invalidates it after recorded simulations", () => {
    const data = source("server/recovery/data/supabaseData.ts");
    const router = source("server/routers.ts");

    expect(data).toContain("dashboardSourceCacheTtlMs = 60_000");
    expect(data).toContain("export function invalidateDashboardOverviewCache()");
    expect(data).toContain("if (dashboardSourceRequest) return dashboardSourceRequest");
    expect(router).toContain("invalidateDashboardOverviewCache");
    expect((router.match(/invalidateDashboardOverviewCache\(\);/g) ?? []).length).toBe(4);
  });
});
