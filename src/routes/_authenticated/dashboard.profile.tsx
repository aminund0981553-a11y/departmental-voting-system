import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { claimFirstAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name, reg_number: form.reg_number,
        department: form.department, level: form.level,
        gender: form.gender, phone: form.phone,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const claim = useServerFn(claimFirstAdmin);

  return (
    <AppShell variant="student">
      <h1 className="mb-6 text-2xl font-bold">My profile</h1>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2"><Label>Full name</Label><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Matric No.</Label><Input value={form.reg_number ?? ""} onChange={(e) => setForm({ ...form, reg_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>Department</Label><Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div className="space-y-2"><Label>Level</Label><Input value={form.level ?? ""} onChange={(e) => setForm({ ...form, level: e.target.value })} /></div>
              <div className="space-y-2"><Label>Gender</Label><Input value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card className="mt-6 max-w-2xl">
          <CardHeader><CardTitle>Bootstrap administrator</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If no administrator has been assigned yet, you can claim the admin role to manage elections. This works only for the very first admin.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await claim();
                  if (res.ok) {
                    toast.success(res.message);
                    location.reload();
                  } else toast.error(res.message);
                } catch (e: any) { toast.error(e.message); }
              }}
            >
              Claim admin role
            </Button>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
