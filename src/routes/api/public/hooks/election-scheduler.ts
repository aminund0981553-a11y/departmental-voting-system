import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/hooks/election-scheduler")({
  server: {
    handlers: {
      POST: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
          return new Response(JSON.stringify({ error: "missing env" }), { status: 500 });
        }
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const nowIso = new Date().toISOString();

        // Auto-start: scheduled elections whose start time has passed
        const { data: started, error: startErr } = await supabase
          .from("elections")
          .update({ status: "active" })
          .eq("status", "scheduled")
          .lte("starts_at", nowIso)
          .gt("ends_at", nowIso)
          .select("id");

        // Auto-end: active elections whose end time has passed
        const { data: ended, error: endErr } = await supabase
          .from("elections")
          .update({ status: "ended" })
          .in("status", ["active", "paused", "scheduled"])
          .lte("ends_at", nowIso)
          .select("id");

        return Response.json({
          ok: true,
          startedCount: started?.length ?? 0,
          endedCount: ended?.length ?? 0,
          startErr: startErr?.message,
          endErr: endErr?.message,
          at: nowIso,
        });
      },
    },
  },
});
