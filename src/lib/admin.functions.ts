import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Self-promote to admin ONLY if no admin exists yet.
 * Safe bootstrap so the first registered user can manage the system.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin" as any);
    if (error) throw new Error(error.message);
    return data as { ok: boolean; message: string };
  });

export const getAdminCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await checkAdminAccess(context.supabase, context.userId);

    const [{ data: elections, error: electionsError }, { data: positions, error: positionsError }, { data: candidates, error: candidatesError }] =
      await Promise.all([
        context.supabase.from("elections").select("id,title").order("created_at", { ascending: false }),
        context.supabase.from("positions").select("*").order("display_order"),
        context.supabase.rpc("get_admin_candidates" as any),
      ]);

    if (electionsError || positionsError || candidatesError) {
      throw new Error(electionsError?.message || positionsError?.message || candidatesError?.message || "Failed to load admin candidate data.");
    }

    const candidateRows = (candidates ?? []) as any[];
    const userIds = Array.from(new Set(candidateRows.map((c: any) => c.user_id).filter(Boolean))) as string[];
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: profileData, error: profileError } = await context.supabase
        .from("profiles")
        .select("id,full_name,reg_number,department,level,gender,phone")
        .in("id", userIds);
      if (profileError) throw new Error(profileError.message);
      profiles = profileData ?? [];
    }

    return {
      elections: elections ?? [],
      positions: positions ?? [],
      candidates: candidateRows,
      profiles,
    };
  });

const checkAdminAccess = async (supabaseClient: any, userId: string) => {
  const { count, error } = await supabaseClient
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if ((count ?? 0) === 0) throw new Error("Unauthorized: admin access required.");
};

export const createPosition = createServerFn({ method: "POST" })
  .inputValidator((data: { election_id: string; title: string; description?: string; display_order?: number }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await checkAdminAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("positions").insert({
      election_id: data.election_id,
      title: data.title,
      description: data.description || null,
      display_order: data.display_order || 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCandidate = createServerFn({ method: "POST" })
  .inputValidator((data: { position_id: string; full_name: string; manifesto?: string; approved?: boolean }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await checkAdminAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("candidates").insert({
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
  .inputValidator((data: { id: string; approved?: boolean; reject_reason?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    if (data.approved !== undefined) {
      const { error } = await context.supabase.rpc("admin_update_candidate_status" as any, {
        _candidate_id: data.id,
        _approved: data.approved,
        _reject_reason: data.reject_reason ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCandidate = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_delete_candidate" as any, { _candidate_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePosition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await checkAdminAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("positions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCandidatesBatch = createServerFn({ method: "POST" })
  .inputValidator((data: { candidates: Array<{ position_id: string; full_name: string; manifesto: string | null; approved: boolean }> }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await checkAdminAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("candidates").insert(
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
