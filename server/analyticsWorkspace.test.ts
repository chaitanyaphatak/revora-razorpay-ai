import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("ReVora Analytics workspace", () => {
  it("registers a discoverable analytics route in the application, sidebar, and command palette", () => {
    expect(source("client/src/App.tsx")).toContain('path={"/analytics"}');
    expect(source("client/src/components/DashboardLayout.tsx")).toContain('label: "Analytics", path: "/analytics"');
    expect(source("client/src/components/recoverai/GlobalCommandPalette.tsx")).toContain('label: "Analytics"');
  });

  it("renders source-backed exposure, policy, propensity, receivables, and action-performance analysis with clear boundaries", () => {
    const page = source("client/src/pages/AnalyticsWorkspace.tsx");
    const router = source("server/routers.ts");

    expect(router).toContain("analytics: router");
    expect(router).toContain("getAnalyticsOverview");
    expect(source("client/src/App.tsx")).toContain("<Suspense fallback={<WorkspaceLoading />}>");
    ["Risk-weighted value through time", "Decision governance mix", "Propensity segmentation", "Receivables aging", "Intervention portfolio", "Observed simulation evidence"].forEach(label => expect(page).toContain(label));
  });
});
