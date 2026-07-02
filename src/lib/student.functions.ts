import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getStudentDashboardData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: elections, error: electionsError }, { data: myVotes, error: myVotesError }, { data: profile, error: profileError }, { data: nominations, error: nominationsError }, { data: positions, error: positionsError }] =
      await Promise.all([
        supabase.from("elections").select("*").in("status", ["active", "scheduled"]).order("starts_at"),
        supabase.from("votes").select("election_id").eq("voter_id", userId),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("candidates").select("*").eq("user_id", userId).in("status", ["approved", "rejected"]),
        supabase.from("positions").select("id,title,election_id"),
      ]);

    if (electionsError || myVotesError || profileError || nominationsError || positionsError) {
      throw new Error(
        electionsError?.message || myVotesError?.message || profileError?.message || nominationsError?.message || positionsError?.message ||
          "Failed to load dashboard data."
      );
    }

    return {
      elections: elections ?? [],
      myVotes: myVotes ?? [],
      profile,
      nominations: nominations ?? [],
      positions: positions ?? [],
    };
  });

export const getNominatePageData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: elections, error: electionsError }, { data: positions, error: positionsError }, { data: mine, error: mineError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabase.from("elections").select("id,title,status,starts_at,ends_at").in("status", ["scheduled", "active"]).order("starts_at"),
        supabase.from("positions").select("id,title,election_id,description").order("display_order"),
        supabase.from("candidates").select("*").eq("user_id", userId).order("submitted_at", { ascending: false }),
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      ]);

    if (electionsError || positionsError || mineError || profileError) {
      throw new Error(
        electionsError?.message || positionsError?.message || mineError?.message || profileError?.message || "Failed to load nomination data."
      );
    }

    return {
      elections: elections ?? [],
      positions: positions ?? [],
      mine: mine ?? [],
      profile,
    };
  });

export const submitNomination = createServerFn({ method: "POST" })
  .inputValidator((data: { position_id: string; full_name: string; manifesto: string; photo_url: string | null }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("candidates").insert({
      user_id: userId,
      position_id: data.position_id,
      full_name: data.full_name,
      manifesto: data.manifesto,
      photo_url: data.photo_url,
      status: "pending",
      approved: false,
    });
    if (error) {
      if ((error as any).code === "23505") throw new Error("You already have a nomination for this position.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const withdrawNomination = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("candidates").delete().eq("id", data.id).eq("user_id", userId).eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getVoteBallotData = createServerFn({ method: "POST" })
  .inputValidator((data: { electionId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { electionId } = data;

    const [{ data: election, error: electionError }, { data: positions, error: positionsError }, { data: candidates, error: candidatesError }, { data: existing, error: existingError }] =
      await Promise.all([
        supabase.from("elections").select("*").eq("id", electionId).maybeSingle(),
        supabase.from("positions").select("*").eq("election_id", electionId).order("display_order"),
        supabase.from("candidates").select("*, positions!inner(election_id)").eq("positions.election_id", electionId).eq("approved", true),
        supabase.from("votes").select("position_id").eq("voter_id", userId).eq("election_id", electionId),
      ]);

    if (electionError || positionsError || candidatesError || existingError) {
      throw new Error(
        electionError?.message || positionsError?.message || candidatesError?.message || existingError?.message || "Failed to load ballot data."
      );
    }

    return {
      election,
      positions: positions ?? [],
      candidates: candidates ?? [],
      votedPositions: Array.from(new Set((existing ?? []).map((v: any) => v.position_id))),
    };
  });

export const submitVote = createServerFn({ method: "POST" })
  .inputValidator((data: { electionId: string; rows: Array<{ election_id: string; position_id: string; candidate_id: string; voter_id: string }> }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { electionId, rows } = data;
    const normalizedRows = rows.map((row) => ({ ...row, voter_id: userId, election_id: electionId }));
    const { data: inserted, error } = await supabase.from("votes").insert(normalizedRows).select("receipt");
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit" as any, {
      _action: "vote_cast",
      _metadata: { election_id: electionId, count: normalizedRows.length },
    });
    return { receipts: inserted?.map((row: any) => row.receipt) ?? [] };
  });
