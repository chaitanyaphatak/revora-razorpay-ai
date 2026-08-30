import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers.js";
import { createVercelPublicContext } from "./vercelContext.js";

/**
 * Portable ReVora API application.
 *
 * This app exposes only the public, simulation-only health and tRPC routes.
 * It intentionally does not mount managed OAuth or storage-proxy routes,
 * so it can run in a standard Node serverless environment such as Vercel.
 */
export function createRevoraApiApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      application: "ReVora",
      mode: "simulation_only",
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: createVercelPublicContext,
    }),
  );

  return app;
}
