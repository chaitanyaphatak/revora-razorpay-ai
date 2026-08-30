import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const controlCenterSource = () => readFileSync(resolve(process.cwd(), "client/src/pages/ControlCenter.tsx"), "utf8");

describe("Control Center list keys", () => {
  it("uses stable source identifiers for each rendered operational list", () => {
    const source = controlCenterSource();

    expect(source).toContain('key={`${item.paymentId}-${item.executedAt}`}');
    expect(source).toContain('key={playbook.action}');
    expect(source).toContain('key={item.caseId}');
    expect(source).toContain('key={item.id}');
  });
});

