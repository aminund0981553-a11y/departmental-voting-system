import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Play, Pause, Square, Trash2, Eye, ListPlus, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const DEFAULT_POSITIONS = ["President", "Vice President", "Secretary", "Treasurer", "PRO", "Welfare Director", "Academic Director"];

export const Route = createFileRoute("/_authenticated/admin/elections")({
  component: AdminElections,
});

function AdminElections() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-elections"],
    queryFn: async () => {
      const [{ data: elections }, { data: positions }] = await Promise.all([
        supabase.from("elections").select("*").order("created_at", { ascending: false }),
        supabase.from("positions").select("*"),
      ]);
      return { elections: elections ?? [], positions: positions ?? [] };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, results_published }: any) => {
      const { error } = await supabase.from("elections").update({
        ...(status && { status }),
        ...(results_published !== undefined && { results_published }),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("elections").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addPosition = useMutation({
    mutationFn: async ({ election_id, title }: { election_id: string; title: string }) => {
      const t = title.trim();
      if (!t) throw new Error("Position title is required");
      const existing = (data?.positions ?? []).filter((p) => p.election_id === election_id).length;
      const { error } = await supabase.from("positions").insert({ election_id, title: t, display_order: existing });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Position added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const delPosition = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("positions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Position removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const seedDefaults = useMutation({
    mutationFn: async (election_id: string) => {
      const existing = (data?.positions ?? []).filter((p) => p.election_id === election_id).length;
      const rows = DEFAULT_POSITIONS.map((title, i) => ({ election_id, title, display_order: existing + i }));
      const { error } = await supabase.from("positions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Default positions added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: async (form: any) => {
      const { data: e, error } = await supabase.from("elections").insert({
        title: form.title, description: form.description,
        starts_at: form.starts_at, ends_at: form.ends_at,
        status: "scheduled", created_by: user!.id,
      }).select().single();
      if (error) throw error;
      if (form.seed_default_positions) {
        await supabase.from("positions").insert(
          DEFAULT_POSITIONS.map((title, i) => ({ election_id: e.id, title, display_order: i }))
        );
      }
      return e;
    },
    onSuccess: () => { setOpen(false); qc.invalidateQueries(); toast.success("Election created"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell variant="admin">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Elections</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Election</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create election</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              create.mutate({
                title: f.get("title"), description: f.get("description"),
                starts_at: f.get("starts_at"), ends_at: f.get("ends_at"),
                seed_default_positions: f.get("seed") === "on",
              });
            }} className="grid gap-3">
              <div className="space-y-2"><Label>Title</Label><Input name="title" required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Starts</Label><Input name="starts_at" type="datetime-local" required /></div>
                <div className="space-y-2"><Label>Ends</Label><Input name="ends_at" type="datetime-local" required /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="seed" defaultChecked /> Seed default positions (President, VP, Secretary, Treasurer, PRO, Welfare, Academic)
              </label>
              <DialogFooter><Button type="submit" disabled={create.isPending}>Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {(data?.elections ?? []).map((e) => {
          const positions = (data?.positions ?? []).filter((p) => p.election_id === e.id);
          return (
            <Card key={e.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.starts_at), "PP p")} → {format(new Date(e.ends_at), "PP p")} · {positions.length} positions
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{e.status}</Badge>
                    {e.results_published && <Badge variant="outline" className="border-success text-success">Results public</Badge>}
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: e.id, status: "active" })}><Play className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: e.id, status: "paused" })}><Pause className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: e.id, status: "ended" })}><Square className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: e.id, results_published: !e.results_published })}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this election? Votes will be removed.")) del.mutate(e.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium">Positions</div>
                    {positions.length === 0 && (
                      <Button size="sm" variant="outline" onClick={() => seedDefaults.mutate(e.id)} disabled={seedDefaults.isPending}>
                        <ListPlus className="mr-1 h-3.5 w-3.5" /> Seed defaults
                      </Button>
                    )}
                  </div>
                  {positions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No positions yet. Candidates can't nominate until you add some.</p>
                  ) : (
                    <ul className="mb-2 flex flex-wrap gap-2">
                      {positions.map((p) => (
                        <li key={p.id} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs">
                          {p.title}
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm(`Remove position "${p.title}"?`)) delPosition.mutate(p.id); }}
                            aria-label={`Remove ${p.title}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      const fd = new FormData(ev.currentTarget);
                      const title = String(fd.get("title") ?? "");
                      addPosition.mutate({ election_id: e.id, title }, {
                        onSuccess: () => { (ev.target as HTMLFormElement).reset(); },
                      });
                    }}
                    className="flex gap-2"
                  >
                    <Input name="title" placeholder="Add a position (e.g. President)" className="h-8" />
                    <Button type="submit" size="sm" disabled={addPosition.isPending}>Add</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(data?.elections ?? []).length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No elections yet.</CardContent></Card>}
      </div>
    </AppShell>
  );
}
