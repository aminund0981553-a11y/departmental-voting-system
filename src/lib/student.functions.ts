import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export const getStudentDashboardData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const [{ data: elections, error: electionsError }, { data: myVotes, error: myVotesError }, { data: profile, error: profileError }, { data: nominations, error: nominationsError }, { data: positions, error: positionsError }] =
      await Promise.all([
        supabaseAdmin.from("elections").select("*").in("status", ["active", "scheduled"]).order("starts_at"),
        supabaseAdmin.from("votes").select("election_id").eq("voter_id", userId),
        supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("candidates").select("*").eq("user_id", userId).in("status", ["approved", "rejected"]),
        supabaseAdmin.from("positions").select("id,title,election_id"),
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
    const userId = context.userId;
    const [{ data: elections, error: electionsError }, { data: positions, error: positionsError }, { data: mine, error: mineError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabaseAdmin.from("elections").select("id,title,status,starts_at,ends_at").in("status", ["scheduled", "active"]).order("starts_at"),
        supabaseAdmin.from("positions").select("id,title,election_id,description").order("display_order"),
        supabaseAdmin.from("candidates").select("*").eq("user_id", userId).order("submitted_at", { ascending: false }),
        supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
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
    const userId = context.userId;
    const { position_id, full_name, manifesto, photo_url } = data as unknown as {
      position_id: string;
      full_name: string;
      manifesto: string;
      photo_url: string | null;
    };

    const { error } = await supabaseAdmin.from("candidates").insert({
      user_id: userId,
      position_id,
      full_name,
      manifesto,
      photo_url,
      status: "pending",
      approved: false,
    });
    if (error) {
      if (error.code === "23505") throw new Error("You already have a nomination for this position.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const withdrawNomination = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    const { id } = data as unknown as { id: string };
    const { error } = await supabaseAdmin.from("candidates").delete().eq("id", id).eq("user_id", userId).eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getVoteBallotData = createServerFn({ method: "POST" })
  .inputValidator((data: { electionId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    const { electionId } = data as unknown as { electionId: string };

    const [{ data: election, error: electionError }, { data: positions, error: positionsError }, { data: candidates, error: candidatesError }, { data: existing, error: existingError }] =
      await Promise.all([
        supabaseAdmin.from("elections").select("*").eq("id", electionId).maybeSingle(),
        supabaseAdmin.from("positions").select("*").eq("election_id", electionId).order("display_order"),
        supabaseAdmin.from("candidates").select("*, positions!inner(election_id)").eq("positions.election_id", electionId).eq("approved", true),
        supabaseAdmin.from("votes").select("position_id").eq("voter_id", userId).eq("election_id", electionId),
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
      votedPositions: new Set((existing ?? []).map((v: any) => v.position_id)),
    };
  });

export const submitVote = createServerFn({ method: "POST" })
  .inputValidator((data: { electionId: string; rows: Array<{ election_id: string; position_id: string; candidate_id: string; voter_id: string }> }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    const { electionId, rows } = data as unknown as { electionId: string; rows: Array<{ election_id: string; position_id: string; candidate_id: string; voter_id: string }> };
    const normalizedRows = rows.map((row) => ({ ...row, voter_id: userId, election_id: electionId }));
    const { data: inserted, error } = await supabaseAdmin.from("votes").insert(normalizedRows).select("receipt");
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("log_audit", {
      _action: "vote_cast",
      _metadata: { election_id: electionId, count: normalizedRows.length },
    });
    return { receipts: inserted?.map((row) => row.receipt) ?? [] };
  });
