/**
 * Server-Sent Events (SSE) global emitter for ReVora.
 *
 * Allows any server-side code to broadcast events to all connected
 * merchant dashboard clients — including across different devices/browsers.
 */

import type { Response } from "express";

type SSEClient = {
  id: string;
  res: Response;
};

// In-memory registry of all active SSE connections (merchant dashboards)
const clients = new Map<string, SSEClient>();

/** Register a new SSE client connection */
export function addSSEClient(id: string, res: Response): void {
  clients.set(id, { id, res });
}

/** Remove a disconnected SSE client */
export function removeSSEClient(id: string): void {
  clients.delete(id);
}

/** Broadcast an event to ALL connected merchant dashboards */
export function broadcastSSEEvent(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, client] of clients) {
    try {
      client.res.write(payload);
    } catch {
      // Client disconnected mid-write — clean up
      clients.delete(id);
    }
  }
}

export function getSSEClientCount(): number {
  return clients.size;
}
