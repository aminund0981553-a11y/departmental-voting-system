import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/elections")({
  component: () => {
    const { user } = useAuth();
    const { data } = useQuery({
      queryKey: ["dash-elections", user?.id],
      enabled: !!user,
      queryFn: async () => {
        const [{ data: elections }, { data: voted }] = await Promise.all([
          supabase.from("elections").select("*").neq("status", "draft").order("starts_at", { ascending: false }),
          supabase.from("votes").select("election_id").eq("voter_id", user!.id),
        ]);
        return { elections: elections ?? [], voted: new Set((voted ?? []).map((v) => v.election_id)) };
      },
    });
    return (
      <AppShell variant="student">
        <h1 className="mb-6 text-2xl font-bold">Elections</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {(data?.elections ?? []).map((e) => (
            <Card key={e.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.starts_at), "PP p")} → {format(new Date(e.ends_at), "PP p")}
                    </div>
                  </div>
                  <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                <div className="mt-4 flex gap-2">
                  {e.status === "active" && !data?.voted.has(e.id) && (
                    <Button asChild size="sm"><Link to="/dashboard/vote/$electionId" params={{ electionId: e.id }}>Vote now</Link></Button>
                  )}
                  {data?.voted.has(e.id) && <Badge variant="outline" className="text-success border-success">You voted</Badge>}
                  <Button asChild size="sm" variant="outline"><Link to="/elections/$id" params={{ id: e.id }}>Details</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppShell>
    );
  },
});
