import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/admin/voters")({
  component: () => {
    const [q, setQ] = useState("");
    const { data } = useQuery({
      queryKey: ["admin-voters"],
      queryFn: async () => {
        const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
        return data ?? [];
      },
    });
    const filtered = (data ?? []).filter((p) =>
      !q || (p.full_name + " " + p.reg_number + " " + p.department).toLowerCase().includes(q.toLowerCase())
    );
    return (
      <AppShell variant="admin">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Registered voters ({data?.length ?? 0})</h1>
          <div className="flex gap-2">
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCSV("voters.csv", filtered.map((p) => ({
                full_name: p.full_name, reg_number: p.reg_number, department: p.department,
                level: p.level, phone: p.phone, joined: p.created_at,
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
                  <tr><th className="p-3">Name</th><th className="p-3">Matric</th><th className="p-3">Dept</th><th className="p-3">Level</th><th className="p-3">Phone</th><th className="p-3">Joined</th></tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">{p.full_name || "—"}</td>
                      <td className="p-3">{p.reg_number || "—"}</td>
                      <td className="p-3">{p.department}</td>
                      <td className="p-3">{p.level || "—"}</td>
                      <td className="p-3">{p.phone || "—"}</td>
                      <td className="p-3 text-muted-foreground">{format(new Date(p.created_at), "PP")}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No voters.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  },
});
