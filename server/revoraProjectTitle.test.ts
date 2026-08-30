import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("ReVora application title configuration", () => {
  it("uses the configured public ReVora title and reports the same public application identity from health", async () => {
    expect(process.env.VITE_APP_TITLE).toBe("ReVora");

    const health = await fetch(`http://127.0.0.1:3000/api/health?application=${encodeURIComponent(process.env.VITE_APP_TITLE ?? "")}`);
    expect(health.ok).toBe(true);
    await expect(health.json()).resolves.toMatchObject({ application: "ReVora" });
  });

  it("uses ReVora across the primary public product, metadata, and setup surfaces", async () => {
    const [document, shell, assistant, manualSimulation, readme, databaseManifest, packageManifest] = await Promise.all([
      readFile("client/index.html", "utf8"),
      readFile("client/src/components/DashboardLayout.tsx", "utf8"),
      readFile("client/src/pages/MerchantAssistant.tsx", "utf8"),
      readFile("client/src/pages/ManualExecutionSimulation.tsx", "utf8"),
      readFile("README.md", "utf8"),
      readFile("database/README.md", "utf8"),
      readFile("package.json", "utf8"),
    ]);

    [document, assistant, manualSimulation, readme, databaseManifest].forEach(source => {
      expect(source).toContain("ReVora");
      expect(source).not.toContain("RecoverAI");
    });
    expect(shell).toContain('>Re<span className="text-teal-600">Vora</span>');
    expect(shell).not.toContain("RecoverAI");
    expect(shell).toContain("revora:manual-simulation-recorded");
    expect(manualSimulation).toContain("revora:manual-simulation-recorded");
    expect(packageManifest).toContain('"name": "revora"');
  });

  it("preserves the historic policy-version value as a stored-data compatibility contract", async () => {
    const recoveryEngine = await readFile("server/recovery/domain/recoveryEngine.ts", "utf8");

    expect(recoveryEngine).toContain('policyVersion: "recoverai-v1"');
  });
});
