import { describe, expect, it } from "vitest";

describe("Supabase connection", () => {
  it("authenticates to the Supabase health endpoint with server-side credentials", async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(supabaseUrl).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey!}`,
      },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
