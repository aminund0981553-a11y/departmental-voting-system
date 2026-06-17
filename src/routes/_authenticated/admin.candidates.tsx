import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Eye, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { parseCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/admin/candidates")({
  component: AdminCandidates,
});

function AdminCandidates() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-candidates"],
    queryFn: async () => {
      const [{ data: elections }, { data: positions }, { data: candidates }] = await Promise.all([
        supabase.from("elections").select("id,title").order("created_at", { ascending: false }),
        supabase.from("positions").select("*").order("display_order"),
        supabase.from("candidates").select("*"),
      ]);
      return { elections: elections ?? [], positions: positions ?? [], candidates: candidates ?? [] };
    },
  });

  const [open, setOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [electionId, setElectionId] = useState<string>("");

  const createPos = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("positions").insert({
        election_id: form.election_id, title: form.title, description: form.description,
        display_order: parseInt(form.display_order || "0", 10),
      });
      if (error) throw error;
    },
    onSuccess: () => { setPosOpen(false); qc.invalidateQueries(); toast.success("Position added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createCand = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("candidates").insert({
        position_id: form.position_id, full_name: form.full_name,
        manifesto: form.manifesto, approved: true, status: "approved",
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); qc.invalidateQueries(); toast.success("Candidate added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveNomination = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidates").update({ approved: true, status: "approved", reject_reason: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Nomination approved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectNomination = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from("candidates").update({ approved: false, status: "rejected", reject_reason: reason }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Nomination rejected"); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleApproval = useMutation({
    mutationFn: async ({ id, approved }: any) => {
      const { error } = await supabase.from("candidates").update({ approved, status: approved ? "approved" : "pending" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
  const delCand = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("candidates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Removed"); },
  });
  const delPos = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("positions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Position removed"); },
  });

  const elections = data?.elections ?? [];
  const filteredPositions = (data?.positions ?? []).filter((p) => !electionId || p.election_id === electionId);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCsvImport(file: File) {
    if (!electionId) { toast.error("Choose an election first to import into."); return; }
    try {
      const rows = await parseCSV<{ position_title?: string; full_name?: string; manifesto?: string }>(file);
      const positionsForElection = (data?.positions ?? []).filter((p) => p.election_id === electionId);
      const toInsert: { position_id: string; full_name: string; manifesto: string | null; approved: boolean }[] = [];
      const unknown: string[] = [];
      for (const r of rows) {
        const title = (r.position_title ?? "").trim();
        const name = (r.full_name ?? "").trim();
        if (!title || !name) continue;
        const pos = positionsForElection.find((p) => p.title.toLowerCase() === title.toLowerCase());
        if (!pos) { unknown.push(title); continue; }
        toInsert.push({ position_id: pos.id, full_name: name, manifesto: r.manifesto?.trim() || null, approved: true });
      }
      if (!toInsert.length) { toast.error("No valid rows found."); return; }
      const { error } = await supabase.from("candidates").insert(toInsert);
      if (error) throw error;
      qc.invalidateQueries();
      toast.success(`Imported ${toInsert.length} candidate(s)${unknown.length ? `; skipped unknown positions: ${[...new Set(unknown)].join(", ")}` : ""}`);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  }

  return (
    <AppShell variant="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Positions & Candidates</h1>
        <div className="flex flex-wrap gap-2">
          <div className="w-64">
            <Select value={electionId || "all"} onValueChange={(v) => setElectionId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Filter by election" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All elections</SelectItem>
                {elections.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={posOpen} onOpenChange={setPosOpen}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="mr-2 h-4 w-4" />Position</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add position</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); createPos.mutate(Object.fromEntries(f.entries())); }} className="grid gap-3">
                <div className="space-y-2">
                  <Label>Election</Label>
                  <select name="election_id" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {elections.map((el) => <option key={el.id} value={el.id}>{el.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label>Title</Label><Input name="title" required /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea name="description" /></div>
                <div className="space-y-2"><Label>Display order</Label><Input name="display_order" type="number" defaultValue="0" /></div>
                <DialogFooter><Button type="submit">Add</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Candidate</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add candidate</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); createCand.mutate(Object.fromEntries(f.entries())); }} className="grid gap-3">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <select name="position_id" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {(data?.positions ?? []).map((p) => {
                      const el = elections.find((e) => e.id === p.election_id);
                      return <option key={p.id} value={p.id}>{el?.title} — {p.title}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-2"><Label>Full name</Label><Input name="full_name" required /></div>
                <div className="space-y-2"><Label>Manifesto</Label><Textarea name="manifesto" rows={4} /></div>
                <DialogFooter><Button type="submit">Add</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => fileRef.current?.click()} title="CSV with columns: position_title, full_name, manifesto">
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.target.value = ""; }} />
        </div>
      </div>

      {(() => {
        const pending = (data?.candidates ?? []).filter((c) =>
          c.status === "pending" &&
          (!electionId || (data?.positions ?? []).find((p) => p.id === c.position_id)?.election_id === electionId)
        );
        if (pending.length === 0) return null;
        return (
          <Card className="mb-6 border-amber-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pending nominations <Badge variant="secondary">{pending.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.map((c) => {
                const pos = (data?.positions ?? []).find((p) => p.id === c.position_id);
                const el = elections.find((e) => e.id === pos?.election_id);
                return (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{c.full_name}</div>
                        <div className="text-xs text-muted-foreground">{el?.title} — {pos?.title}</div>
                        {c.manifesto && <p className="mt-2 text-sm">{c.manifesto}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveNomination.mutate(c.id)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const reason = prompt("Reason for rejection (shown to applicant):") ?? "";
                          if (reason.trim()) rejectNomination.mutate({ id: c.id, reason: reason.trim() });
                        }}>Reject</Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete nomination?")) delCand.mutate(c.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      <div className="space-y-6">
        {filteredPositions.map((p) => {
          const el = elections.find((e) => e.id === p.election_id);
          const cands = (data?.candidates ?? []).filter((c) => c.position_id === p.id && c.status !== "pending");
          return (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{p.title}</CardTitle>
                    <div className="text-xs text-muted-foreground">{el?.title}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete position?")) delPos.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {cands.length === 0 && <p className="text-sm text-muted-foreground">No candidates.</p>}
                {cands.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{c.full_name}</div>
                      {c.manifesto && <div className="text-xs text-muted-foreground line-clamp-2">{c.manifesto}</div>}
                      <Badge variant={c.approved ? "default" : "secondary"} className="mt-2">
                        {c.approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => toggleApproval.mutate({ id: c.id, approved: !c.approved })}>
                        {c.approved ? "Unapprove" : "Approve"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove candidate?")) delCand.mutate(c.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
        {filteredPositions.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No positions yet. Create one above.</CardContent></Card>}
      </div>
    </AppShell>
  );
}
