import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Vote, CheckCircle2, Clock, History, X } from "lucide-react";
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

  const { data } = useQuery<any, any>({
    queryKey: ["student-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: elections }, { data: myVotes }, { data: profile }, { data: nominations }, { data: positions }] = await Promise.all([
        supabase.from("elections").select("*").in("status", ["active", "scheduled"]).order("starts_at"),
        supabase.from("votes").select("election_id").eq("voter_id", user!.id),
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("candidates").select("*").eq("user_id", user!.id).in("status", ["approved", "rejected"]),
        supabase.from("positions").select("id,title,election_id"),
      ]);
      return { elections: elections ?? [], myVotes: myVotes ?? [], profile, nominations: nominations ?? [], positions: positions ?? [] };
    },
    onError: (e: any) => {
      if (e?.status === 403) {
        toast.error("Unable to load your nominations — access denied. Check your Supabase RLS policy or sign in again.");
      } else {
        toast.error(`Unable to load dashboard data. ${e?.message ?? "Please try again."}`);
      }
    },
  } as any);

  const nominations = (data?.nominations ?? []) as any[];
  const positions = (data?.positions ?? []) as any[];
  const elections = (data?.elections ?? []) as any[];
  const myVotedElections = new Set((data?.myVotes ?? []).map((v: any) => v.election_id));

  const formatDate = (value?: string | null) => {
    if (!value) return "TBD";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "TBD" : format(date, "PP p");
  };

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`nom-seen-${user?.id}`);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {}
  }, [user?.id]);
  const dismiss = (id: string) => {
    const next = new Set(dismissed); next.add(id);
    setDismissed(next);
    try { localStorage.setItem(`nom-seen-${user?.id}`, JSON.stringify([...next])); } catch {}
  };
  const visibleNominations = nominations.filter((n: any) => !dismissed.has(n.id));

  return (
    <AppShell variant="student">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back{data?.profile?.full_name ? `, ${data.profile.full_name}` : ""}</h1>
        <p className="text-muted-foreground">Here's what's happening in your department.</p>
      </div>

      {visibleNominations.length > 0 && (
        <div className="mb-6 space-y-3">
          {visibleNominations.map((n: any) => {
            const pos = positions.find((p: any) => p.id === n.position_id);
            const approved = n.status === "approved";
            return (
              <Card key={n.id} className={approved ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {approved ? "🎉 Your nomination was approved" : "Your nomination was not approved"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pos?.title ?? "Position"}
                    </div>
                    {!approved && n.reject_reason && (
                      <p className="mt-1 text-sm"><span className="font-medium">Reason:</span> {n.reject_reason}</p>
                    )}
                    {approved && <p className="mt-1 text-sm">You'll appear on the ballot when voting opens.</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => dismiss(n.id)} aria-label="Dismiss">
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}



      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active elections", value: elections.filter((e: any) => e.status === "active").length, icon: Clock },
          { label: "Scheduled", value: elections.filter((e: any) => e.status === "scheduled").length, icon: Vote },
          { label: "My votes cast", value: (data?.myVotes ?? []).length ?? 0, icon: CheckCircle2 },
        ].map((s: any) => (
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
            {elections.map((e: any) => {
              const voted = myVotedElections.has(e.id);
              return (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(e.starts_at)} → {formatDate(e.ends_at)}
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
