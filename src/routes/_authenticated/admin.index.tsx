import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Vote, Users, Trophy, CalendarRange } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — GSU CS E-Voting" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [el, ca, vo, pr] = await Promise.all([
        supabase.from("elections").select("status"),
        supabase.from("candidates").select("id", { count: "exact", head: true }),
        supabase.from("votes").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        elections: el.data?.length ?? 0,
        active: el.data?.filter((e) => e.status === "active").length ?? 0,
        candidates: ca.count ?? 0,
        votes: vo.count ?? 0,
        voters: pr.count ?? 0,
      };
    },
  });
  return (
    <AppShell variant="admin">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">Manage elections, candidates and voters from one place.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total elections", value: data?.elections ?? 0, icon: CalendarRange },
          { label: "Active now", value: data?.active ?? 0, icon: Vote },
          { label: "Candidates", value: data?.candidates ?? 0, icon: Trophy },
          { label: "Registered voters", value: data?.voters ?? 0, icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="grid h-10 w-10 place-items-center rounded-md gradient-navy text-primary-foreground"><s.icon className="h-5 w-5" /></div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full"><Link to="/admin/elections">Manage elections</Link></Button>
            <Button asChild variant="outline" className="w-full"><Link to="/admin/candidates">Manage candidates</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total ballots</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold">{data?.votes ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Audit & monitoring</CardTitle></CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full"><Link to="/admin/audit">View audit log</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
