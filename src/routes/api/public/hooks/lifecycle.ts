import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { db2Admin } from "@/server/db/clients.server";

/** Daily subscription check: warns, suspends expired, stops after grace period. */
export const Route = createFileRoute("/api/public/hooks/lifecycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { error } = await db2Admin.rpc("run_subscription_lifecycle");
        if (error) {
          console.error("lifecycle failed", error);
          return Response.json({ ok: false }, { status: 500 });
        }
        const { probeAll } = await import("@/lib/health.server");
        const origin = (process.env["VITE_APP_URL"] ?? "").replace(/\/$/, "") || new URL(request.url).origin;
        const { createMultiDbRuntime } = await import("@/lib/widget.server");
        const health = await probeAll(createMultiDbRuntime(), origin);
        return Response.json({ ok: true, ranAt: new Date().toISOString(), healthChecked: health.length });
      },
    },
  },
});
