import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarRange, Vote, ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/elections/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Election ${params.id.slice(0, 6)} — GSU CS E-Voting` },
      { name: "description", content: "View positions, candidates, and election timeline." },
    ],
  }),
  component: ElectionDetail,
});

function ElectionDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["election", id],
    queryFn: async () => {
      const [{ data: election }, { data: positions }, { data: candidates }] = await Promise.all([
        supabase.from("elections").select("*").eq("id", id).maybeSingle(),
        supabase.from("positions").select("*").eq("election_id", id).order("display_order"),
        supabase.from("candidates").select("*, positions!inner(election_id)").eq("positions.election_id", id).eq("approved", true),
      ]);
      if (!election) throw notFound();
      return { election, positions: positions ?? [], candidates: candidates ?? [] };
    },
  });

  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const { election, positions, candidates } = data;

  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link to="/elections" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> All elections
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{election.title}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{election.description}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarRange className="h-4 w-4" />
              {format(new Date(election.starts_at), "PPp")} → {format(new Date(election.ends_at), "PPp")}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge>{election.status}</Badge>
            {election.status === "active" && (
              <Button asChild>
                <Link to="/dashboard/vote/$electionId" params={{ electionId: election.id }}>
                  <Vote className="mr-2 h-4 w-4" /> Cast your vote
                </Link>
              </Button>
            )}
            {election.results_published && (
              <Button asChild variant="outline">
                <Link to="/results/$id" params={{ id: election.id }}>View Results</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-10 space-y-6">
          {positions.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {candidates.filter((c) => c.position_id === p.id).map((c) => (
                  <div key={c.id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-secondary-foreground font-semibold">
                        {c.full_name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{c.full_name}</div>
                        <div className="text-xs text-muted-foreground">Candidate</div>
                      </div>
                    </div>
                    {c.manifesto && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{c.manifesto}</p>}
                  </div>
                ))}
                {candidates.filter((c) => c.position_id === p.id).length === 0 && (
                  <p className="text-sm text-muted-foreground">No approved candidates yet.</p>
                )}
              </CardContent>
            </Card>
          ))}
          {positions.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No positions configured.</CardContent></Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
