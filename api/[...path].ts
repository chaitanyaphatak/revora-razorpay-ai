import { createRevoraApiApp } from "../server/app.js";

// Vercel discovers this catch-all API module and runs the existing Express/tRPC
// application as a Node serverless function. Static Vite files are served by
// Vercel separately from dist/public.
export default createRevoraApiApp();
