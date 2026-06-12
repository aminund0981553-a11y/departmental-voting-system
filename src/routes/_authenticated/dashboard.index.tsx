import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Vote, CheckCircle2, Clock, History } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — GSU CS E-Voting" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["student-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: elections }, { data: myVotes }, { data: profile }] = await Promise.all([
        supabase.from("elections").select("*").in("status", ["active", "scheduled"]).order("starts_at"),
        supabase.from("votes").select("election_id").eq("voter_id", user!.id),
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      ]);
      return { elections: elections ?? [], myVotes: myVotes ?? [], profile };
    },
  });

  const elections = data?.elections ?? [];
  const myVotedElections = new Set((data?.myVotes ?? []).map((v) => v.election_id));

  return (
    <AppShell variant="student">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back{data?.profile?.full_name ? `, ${data.profile.full_name}` : ""}</h1>
        <p className="text-muted-foreground">Here's what's happening in your department.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active elections", value: elections.filter((e) => e.status === "active").length, icon: Clock },
          { label: "Scheduled", value: elections.filter((e) => e.status === "scheduled").length, icon: Vote },
          { label: "My votes cast", value: data?.myVotes.length ?? 0, icon: CheckCircle2 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="grid h-12 w-12 place-items-center rounded-lg gradient-navy text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open elections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {elections.length === 0 && <p className="text-sm text-muted-foreground">No active or scheduled elections right now.</p>}
            {elections.map((e) => {
              const voted = myVotedElections.has(e.id);
              return (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.starts_at), "PP p")} → {format(new Date(e.ends_at), "PP p")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
                    {voted ? (
                      <Badge variant="outline" className="text-success border-success">Voted</Badge>
                    ) : e.status === "active" ? (
                      <Button asChild size="sm">
                        <Link to="/dashboard/vote/$electionId" params={{ electionId: e.id }}>Vote</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" />Quick links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="ghost" className="w-full justify-start"><Link to="/dashboard/elections">All elections</Link></Button>
            <Button asChild variant="ghost" className="w-full justify-start"><Link to="/dashboard/history">My voting history</Link></Button>
            <Button asChild variant="ghost" className="w-full justify-start"><Link to="/dashboard/profile">Edit profile</Link></Button>
            <Button asChild variant="ghost" className="w-full justify-start"><Link to="/results">Public results</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
