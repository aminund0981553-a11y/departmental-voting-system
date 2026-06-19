import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getPublicStats = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [elections, candidates, votes] = await Promise.all([
    supabase.from("elections").select("id,status", { count: "exact", head: false }),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("approved", true),
    supabase.from("votes").select("id", { count: "exact", head: true }),
  ]);

  if (elections.error || candidates.error || votes.error) {
    throw new Error(
      elections.error?.message || candidates.error?.message || votes.error?.message || "Failed to load public stats."
    );
  }

  return {
    elections: elections.data?.length ?? 0,
    active: elections.data?.filter((e) => e.status === "active").length ?? 0,
    candidates: candidates.count ?? 0,
    votes: votes.count ?? 0,
  };
});
