import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../drizzle/schema";

/**
 * Minimal public request context for the standalone Vercel Function.
 * It deliberately avoids importing the managed SDK or OAuth implementation.
 */
export type VercelPublicContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export function createVercelPublicContext(
  opts: CreateExpressContextOptions,
): VercelPublicContext {
  return { req: opts.req, res: opts.res, user: null };
}
