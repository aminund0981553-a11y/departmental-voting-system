import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  component: () => {
    const { user } = useAuth();
    const { data } = useQuery({
      queryKey: ["my-votes", user?.id],
      enabled: !!user,
      queryFn: async () => {
        const { data } = await supabase
          .from("votes")
          .select("id,receipt,created_at,candidates(full_name),positions(title),elections(title)")
          .eq("voter_id", user!.id)
          .order("created_at", { ascending: false });
        return data ?? [];
      },
    });
    return (
      <AppShell variant="student">
        <h1 className="mb-6 text-2xl font-bold">My voting history</h1>
        <Card>
          <CardHeader><CardTitle>Receipts</CardTitle></CardHeader>
          <CardContent>
            {(data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't cast any votes yet.</p>
            ) : (
              <div className="space-y-3">
                {(data ?? []).map((v: any) => (
                  <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                    <div>
                      <div className="font-medium">{v.elections?.title} · {v.positions?.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Chose <strong>{v.candidates?.full_name}</strong> · {format(new Date(v.created_at), "PPp")}
                      </div>
                    </div>
                    <code className="rounded bg-muted px-2 py-1 text-xs">{v.receipt}</code>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AppShell>
    );
  },
});
