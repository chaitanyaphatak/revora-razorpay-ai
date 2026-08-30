import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import handler from "../api/[...path]";

let server: ReturnType<typeof createServer>;
let origin = "";

beforeAll(async () => {
  server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("Vercel serverless adapter", () => {
  it("exports a request handler with a non-sensitive health endpoint", async () => {
    expect(handler).toBeTypeOf("function");
    const response = await fetch(`${origin}/api/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      application: "ReVora",
      mode: "simulation_only",
    });
  });
});
