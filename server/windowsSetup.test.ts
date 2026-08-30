import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  readFileSync(resolve(projectRoot, "package.json"), "utf8"),
) as {
  scripts: Record<string, string>;
  engines?: { node?: string };
};
const windowsHelper = readFileSync(
  resolve(projectRoot, "scripts", "setup-windows.ps1"),
  "utf8",
);

describe("Windows local setup contract", () => {
  it("uses cross-platform runtime scripts and provides a guarded PowerShell helper", () => {
    expect(packageJson.engines?.node).toContain("22");
    expect(packageJson.scripts.dev).toMatch(/^cross-env NODE_ENV=development /);
    expect(packageJson.scripts.start).toMatch(/^cross-env NODE_ENV=production /);
    expect(packageJson.scripts["setup:windows"]).toContain("setup-windows.ps1");

    expect(windowsHelper).toContain("SUPABASE_URL");
    expect(windowsHelper).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(windowsHelper).toContain("pnpm install");
    expect(windowsHelper).toContain("pnpm dev");
    expect(windowsHelper).toContain("Do not add LOCAL_DATABASE_URL");
  });
});
