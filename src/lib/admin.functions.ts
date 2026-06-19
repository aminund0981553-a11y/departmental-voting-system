import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Self-promote to admin ONLY if no admin exists yet.
 * Safe bootstrap so the first registered user can manage the system.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      return { ok: false, message: "An admin already exists." };
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true, message: "You are now the administrator." };
  });

export const getAdminCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("role", "admin");

    if (roleError) throw new Error(roleError.message);
    if ((count ?? 0) === 0) {
      throw new Error("Unauthorized: admin access required.");
    }

    const [{ data: elections, error: electionsError }, { data: positions, error: positionsError }, { data: candidates, error: candidatesError }] =
      await Promise.all([
        supabaseAdmin.from("elections").select("id,title").order("created_at", { ascending: false }),
        supabaseAdmin.from("positions").select("*").order("display_order"),
        supabaseAdmin.from("candidates").select("*").order("submitted_at", { ascending: false, nullsFirst: false }),
      ]);

    if (electionsError || positionsError || candidatesError) {
      throw new Error(electionsError?.message || positionsError?.message || candidatesError?.message || "Failed to load admin candidate data.");
    }

    const userIds = Array.from(new Set((candidates ?? []).map((c: any) => c.user_id).filter(Boolean)));
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id,full_name,reg_number,department,level,gender,phone")
        .in("id", userIds);
      if (profileError) throw new Error(profileError.message);
      profiles = profileData ?? [];
    }

    return {
      elections: elections ?? [],
      positions: positions ?? [],
      candidates: candidates ?? [],
      profiles,
    };
  });
