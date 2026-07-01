import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getPublicStats = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return { elections: 0, active: 0, candidates: 0, votes: 0 };
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [elections, candidates, votes] = await Promise.all([
    supabase.from("elections").select("id,status"),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("approved", true),
    supabase.from("votes").select("id", { count: "exact", head: true }),
  ]);

  return {
    elections: elections.data?.length ?? 0,
    active: elections.data?.filter((e) => e.status === "active").length ?? 0,
    candidates: candidates.count ?? 0,
    votes: votes.count ?? 0,
  };
});
