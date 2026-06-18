import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/admin/votes")({
  component: AdminVotes,
});

function AdminVotes() {
  const [electionId, setElectionId] = useState<string>("");
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-votes"],
    queryFn: async () => {
      const [{ data: votes }, { data: elections }, { data: positions }, { data: candidates }] = await Promise.all([
        supabase.from("votes").select("*").order("created_at", { ascending: false }),
        supabase.from("elections").select("id,title").order("created_at", { ascending: false }),
        supabase.from("positions").select("id,title,election_id"),
        supabase.from("candidates").select("id,full_name"),
      ]);
      const voterIds = Array.from(new Set((votes ?? []).map((v: any) => v.voter_id).filter(Boolean)));
      let profiles: any[] = [];
      if (voterIds.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id,full_name,reg_number,department,level,phone")
          .in("id", voterIds);
        profiles = ps ?? [];
      }
      return { votes: votes ?? [], elections: elections ?? [], positions: positions ?? [], candidates: candidates ?? [], profiles };
    },
  });

  const elections = data?.elections ?? [];
  const filtered = useMemo(() => {
    const positions = data?.positions ?? [];
    let rows = (data?.votes ?? []).map((v: any) => {
      const prof = (data?.profiles ?? []).find((p: any) => p.id === v.voter_id);
      const pos = positions.find((p: any) => p.id === v.position_id);
      const cand = (data?.candidates ?? []).find((c: any) => c.id === v.candidate_id);
      const el = elections.find((e: any) => e.id === v.election_id);
      return { ...v, prof, pos, cand, el };
    });
    if (electionId) rows = rows.filter((r) => r.election_id === electionId);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((r) =>
        [r.prof?.full_name, r.prof?.reg_number, r.prof?.department, r.cand?.full_name, r.pos?.title, r.el?.title]
          .filter(Boolean).join(" ").toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [data, electionId, q, elections]);

  const uniqueVoters = useMemo(() => new Set(filtered.map((r: any) => r.voter_id)).size, [filtered]);

  return (
    <AppShell variant="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Votes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} vote(s) cast by {uniqueVoters} voter(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-56">
            <Select value={electionId || "all"} onValueChange={(v) => setElectionId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="All elections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All elections</SelectItem>
                {elections.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Search voter / candidate…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV("votes.csv", filtered.map((r: any) => ({
              when: r.created_at,
              election: r.el?.title,
              position: r.pos?.title,
              candidate: r.cand?.full_name,
              voter_name: r.prof?.full_name,
              reg_number: r.prof?.reg_number,
              department: r.prof?.department,
              level: r.prof?.level,
              phone: r.prof?.phone,
            })))}
          >
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">Voter</th>
                  <th className="p-3">Matric</th>
                  <th className="p-3">Dept · Level</th>
                  <th className="p-3">Election</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Choice</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), "PP p")}</td>
                    <td className="p-3 font-medium">{r.prof?.full_name ?? "—"}</td>
                    <td className="p-3">{r.prof?.reg_number ?? "—"}</td>
                    <td className="p-3">{r.prof?.department ?? "—"}{r.prof?.level ? ` · L${r.prof.level}` : ""}</td>
                    <td className="p-3">{r.el?.title ?? "—"}</td>
                    <td className="p-3">{r.pos?.title ?? "—"}</td>
                    <td className="p-3 font-medium">{r.cand?.full_name ?? "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No votes match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
