import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers.js";
import { createVercelPublicContext } from "./vercelContext.js";
import { addSSEClient, removeSSEClient } from "./sseEmitter.js";

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

  // Permissive CORS for cross-origin deployment (e.g. Vercel frontend -> Render backend)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-trpc-source");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      application: "ReVora",
      mode: "simulation_only",
    });
  });

  /**
   * SSE endpoint — merchant dashboard connects here via EventSource.
   * Broadcasts real-time payment recovery events to ALL connected merchant sessions,
   * regardless of which device/browser the customer used.
   */
  app.get("/api/sse/notifications", (req, res) => {
    const clientId = `sse_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx/Render buffering
    res.flushHeaders();

    // Send initial connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, ts: new Date().toISOString() })}\n\n`);

    // Register this merchant dashboard connection
    addSSEClient(clientId, res);

    // Heartbeat every 20s to keep connection alive through proxies
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 20_000);

    // Cleanup on client disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      removeSSEClient(clientId);
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
