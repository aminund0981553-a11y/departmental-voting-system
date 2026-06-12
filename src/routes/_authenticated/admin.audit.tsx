import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: () => {
    const { data } = useQuery({
      queryKey: ["admin-audit"],
      queryFn: async () => {
        const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
        return data ?? [];
      },
      refetchInterval: 10000,
    });
    return (
      <AppShell variant="admin">
        <h1 className="mb-6 text-2xl font-bold">Audit log</h1>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase">
                <tr><th className="p-3">When</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Metadata</th></tr>
              </thead>
              <tbody>
                {(data ?? []).map((a) => (
                  <tr key={a.id} className="border-t align-top">
                    <td className="p-3 text-muted-foreground">{format(new Date(a.created_at), "PP p")}</td>
                    <td className="p-3 font-mono text-xs">{a.user_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-3 font-medium">{a.action}</td>
                    <td className="p-3"><code className="text-xs text-muted-foreground">{JSON.stringify(a.metadata)}</code></td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No activity yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </AppShell>
    );
  },
});
