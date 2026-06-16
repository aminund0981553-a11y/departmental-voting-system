import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, FileDown, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadCSV, downloadResultsPDF } from "@/lib/export-utils";

export const Route = createFileRoute("/results/$id")({
  head: () => ({
    meta: [{ title: "Election Results — GSU CS E-Voting" }],
  }),
  component: ResultsPage,
});

const COLORS = ["#0B2545", "#13315C", "#3a6ea5", "#8DA9C4", "#6c5ce7"];

function ResultsPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["results", id],
    queryFn: async () => {
      const [{ data: election }, { data: positions }, { data: candidates }, { data: tallies }] = await Promise.all([
        supabase.from("elections").select("*").eq("id", id).maybeSingle(),
        supabase.from("positions").select("*").eq("election_id", id).order("display_order"),
        supabase.from("candidates").select("*, positions!inner(election_id)").eq("positions.election_id", id).eq("approved", true),
        supabase.rpc("get_election_tallies", { _election_id: id }),
      ]);
      if (!election) throw notFound();
      const counts = new Map<string, number>();
      let total = 0;
      for (const t of (tallies as any[]) ?? []) {
        counts.set(t.candidate_id, Number(t.vote_count));
        total += Number(t.vote_count);
      }
      return { election, positions: positions ?? [], candidates: candidates ?? [], counts, totalVotes: total };
    },
    refetchInterval: 5000,
  });

  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const { election, positions, candidates, counts, totalVotes } = data;
  const voteCount = (cid: string) => counts.get(cid) ?? 0;

  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link to="/results" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> All results
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{election.title}</h1>
            <p className="mt-1 text-muted-foreground">Total ballots cast: <strong>{totalVotes}</strong></p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{election.results_published ? "Published" : election.status}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows = positions.flatMap((p) =>
                  candidates.filter((c) => c.position_id === p.id).map((c) => ({
                    position: p.title,
                    candidate: c.full_name,
                    votes: voteCount(c.id),
                  })),
                );
                downloadCSV(`results-${election.title.replace(/\s+/g, "_")}.csv`, rows);
              }}
            >
              <FileSpreadsheet className="mr-1 h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadResultsPDF({
                filename: `results-${election.title.replace(/\s+/g, "_")}.pdf`,
                title: election.title,
                subtitle: "Departmental Election Results",
                totalVotes: totalVotes,
                sections: positions.map((p) => ({
                  position: p.title,
                  rows: candidates.filter((c) => c.position_id === p.id).map((c) => ({
                    name: c.full_name,
                    votes: voteCount(c.id),
                  })).sort((a, b) => b.votes - a.votes),
                })),
              })}
            >
              <FileDown className="mr-1 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {positions.map((p) => {
            const posCandidates = candidates.filter((c) => c.position_id === p.id);
            const rows = posCandidates.map((c) => ({
              name: c.full_name,
              votes: voteCount(c.id),
            })).sort((a, b) => b.votes - a.votes);
            const winner = rows[0];
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{p.title}</CardTitle>
                    {winner && winner.votes > 0 && (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <Trophy className="h-4 w-4" /> Leading: <strong>{winner.name}</strong>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <BarChart data={rows} layout="vertical" margin={{ left: 16 }}>
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={140} />
                        <Tooltip />
                        <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                          {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
