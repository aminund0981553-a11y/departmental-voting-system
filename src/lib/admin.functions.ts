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

const checkAdminAccess = async (supabaseAdmin: any, userId: string) => {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if ((count ?? 0) === 0) throw new Error("Unauthorized: admin access required.");
};

export const createPosition = createServerFn({ method: "POST" })
  .validator((data: { election_id: string; title: string; description?: string; display_order?: number }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await checkAdminAccess(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("positions").insert({
      election_id: data.election_id,
      title: data.title,
      description: data.description || null,
      display_order: data.display_order || 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCandidate = createServerFn({ method: "POST" })
  .validator((data: { position_id: string; full_name: string; manifesto?: string; approved?: boolean }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await checkAdminAccess(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("candidates").insert({
      position_id: data.position_id,
      full_name: data.full_name,
      manifesto: data.manifesto || null,
      approved: data.approved ?? true,
      status: data.approved ?? true ? "approved" : "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCandidate = createServerFn({ method: "POST" })
  .validator((data: { id: string; approved?: boolean; reject_reason?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await checkAdminAccess(supabaseAdmin, context.userId);
    const updateData: any = {};
    if (data.approved !== undefined) {
      updateData.approved = data.approved;
      updateData.status = data.approved ? "approved" : "rejected";
    }
    if (data.reject_reason !== undefined) {
      updateData.reject_reason = data.reject_reason;
    }
    const { error } = await supabaseAdmin.from("candidates").update(updateData).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCandidate = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await checkAdminAccess(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("candidates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePosition = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await checkAdminAccess(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("positions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCandidatesBatch = createServerFn({ method: "POST" })
  .validator((data: { candidates: Array<{ position_id: string; full_name: string; manifesto: string | null; approved: boolean }> }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await checkAdminAccess(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("candidates").insert(
      data.candidates.map((c) => ({
        position_id: c.position_id,
        full_name: c.full_name,
        manifesto: c.manifesto,
        approved: c.approved,
        status: c.approved ? "approved" : "pending",
      }))
    );
    if (error) throw new Error(error.message);
    return { ok: true, count: data.candidates.length };
  });
