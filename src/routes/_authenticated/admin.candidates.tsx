import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
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
import { getAdminCandidates, createPosition, createCandidate, updateCandidate, deleteCandidate, deletePosition, createCandidatesBatch } from "@/lib/admin.functions";
import { parseCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/admin/candidates")({
  component: AdminCandidates,
});

function AdminCandidates() {
  const qc = useQueryClient();
  const fetchAdminCandidates = useServerFn(getAdminCandidates);
  const createPosFn = useServerFn(createPosition);
  const createCandFn = useServerFn(createCandidate);
  const updateCandFn = useServerFn(updateCandidate);
  const deleteCandFn = useServerFn(deleteCandidate);
  const deletePosFn = useServerFn(deletePosition);
  const createCandidatesBatchFn = useServerFn(createCandidatesBatch);
  
  const { data, error } = useQuery<{
    elections: any[];
    positions: any[];
    candidates: any[];
    profiles: any[];
  }, any>({
    queryKey: ["admin-candidates"],
    queryFn: async () => await fetchAdminCandidates(),
  });

  useEffect(() => {
    if (!error) return;
    if (error?.status === 403 || error?.message?.includes("Unauthorized")) {
      toast.error("Access denied when loading candidates. Are you signed in as an administrator?");
    } else {
      toast.error(error?.message ?? "Failed to load candidates");
    }
  }, [error]);

  const [viewing, setViewing] = useState<any | null>(null);

  const [open, setOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [electionId, setElectionId] = useState<string>("");

  const createPos = useMutation({
    mutationFn: async (form: any) => {
      await createPosFn({
        data: {
          election_id: form.election_id,
          title: form.title,
          description: form.description,
          display_order: parseInt(form.display_order || "0", 10),
        },
      });
    },
    onSuccess: () => { setPosOpen(false); qc.invalidateQueries(); toast.success("Position added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createCand = useMutation({
    mutationFn: async (form: any) => {
      await createCandFn({
        data: {
          position_id: form.position_id,
          full_name: form.full_name,
          manifesto: form.manifesto,
          approved: true,
        },
      });
    },
    onSuccess: () => { setOpen(false); qc.invalidateQueries(); toast.success("Candidate added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveNomination = useMutation({
    mutationFn: async (id: string) => {
      await updateCandFn({
        data: { id, approved: true },
      });
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Nomination approved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectNomination = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await updateCandFn({
        data: { id, approved: false, reject_reason: reason },
      });
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Nomination rejected"); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleApproval = useMutation({
    mutationFn: async ({ id, approved }: any) => {
      await updateCandFn({
        data: { id, approved },
      });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
  const delCand = useMutation({
    mutationFn: async (id: string) => {
      await deleteCandFn({ data: { id } });
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Removed"); },
  });
  const delPos = useMutation({
    mutationFn: async (id: string) => {
      await deletePosFn({ data: { id } });
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Position removed"); },
  });

  const elections = (data?.elections ?? []) as any[];
  const positions = (data?.positions ?? []) as any[];
  const candidates = (data?.candidates ?? []) as any[];
  const profiles = (data?.profiles ?? []) as any[];
  const filteredPositions = positions.filter((p: any) => !electionId || p.election_id === electionId);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCsvImport(file: File) {
    if (!electionId) { toast.error("Choose an election first to import into."); return; }
    try {
      const rows = await parseCSV<{ position_title?: string; full_name?: string; manifesto?: string }>(file);
      const positionsForElection = positions.filter((p: any) => p.election_id === electionId);
      const toInsert: { position_id: string; full_name: string; manifesto: string | null; approved: boolean }[] = [];
      const unknown: string[] = [];
      for (const r of rows) {
        const title = (r.position_title ?? "").trim();
        const name = (r.full_name ?? "").trim();
        if (!title || !name) continue;
        const pos = positionsForElection.find((p: any) => p.title.toLowerCase() === title.toLowerCase());
        if (!pos) { unknown.push(title); continue; }
        toInsert.push({ position_id: pos.id, full_name: name, manifesto: r.manifesto?.trim() || null, approved: true });
      }
      if (!toInsert.length) { toast.error("No valid rows found."); return; }
      await createCandidatesBatchFn({ data: { candidates: toInsert } });
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
                    {elections.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
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
                    {positions.map((p: any) => {
                          const el = elections.find((e: any) => e.id === p.election_id);
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
        const pending = candidates.filter((c: any) =>
          c.status === "pending" &&
          (!electionId || positions.find((p: any) => p.id === c.position_id)?.election_id === electionId)
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
                const pos = positions.find((p: any) => p.id === c.position_id);
                const el = elections.find((e: any) => e.id === pos?.election_id);
                const prof = profiles.find((p: any) => p.id === c.user_id);
                return (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.full_name} className="h-16 w-16 rounded-md object-cover border" />
                        ) : (
                          <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium">{c.full_name}</div>
                          <div className="text-xs text-muted-foreground">{el?.title} — {pos?.title}</div>
                          {prof && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {prof.reg_number ? `Reg: ${prof.reg_number} · ` : ""}{prof.department ?? ""}{prof.level ? ` · L${prof.level}` : ""}
                            </div>
                          )}
                          {c.submitted_at && <div className="text-xs text-muted-foreground">Submitted {new Date(c.submitted_at).toLocaleString()}</div>}
                          {c.manifesto && <p className="mt-2 text-sm line-clamp-3">{c.manifesto}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewing(c)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        <Button size="sm" onClick={() => approveNomination.mutate(c.id)}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const reason = prompt("Reason for rejection (shown to applicant):") ?? "";
                          if (reason.trim()) rejectNomination.mutate({ id: c.id, reason: reason.trim() });
                        }}>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
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
          const cands = candidates.filter((c: any) => c.position_id === p.id && c.status !== "pending");
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
                {cands.map((c: any) => (
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

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nomination details</DialogTitle></DialogHeader>
          {viewing && (() => {
            const pos = positions.find((p: any) => p.id === viewing.position_id);
            const el = elections.find((e: any) => e.id === pos?.election_id);
            const prof = profiles.find((p: any) => p.id === viewing.user_id);
            return (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {viewing.photo_url ? (
                    <img src={viewing.photo_url} alt={viewing.full_name} className="h-32 w-32 rounded-md object-cover border" />
                  ) : (
                    <div className="h-32 w-32 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="text-lg font-semibold">{viewing.full_name}</div>
                    <div className="text-sm text-muted-foreground">{el?.title} — {pos?.title}</div>
                    <Badge variant={viewing.status === "approved" ? "default" : viewing.status === "rejected" ? "destructive" : "secondary"}>{viewing.status}</Badge>
                    {viewing.submitted_at && <div className="text-xs text-muted-foreground">Submitted {new Date(viewing.submitted_at).toLocaleString()}</div>}
                  </div>
                </div>
                {prof && (
                  <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
                    <div><span className="text-muted-foreground">Reg number:</span> {prof.reg_number ?? "—"}</div>
                    <div><span className="text-muted-foreground">Department:</span> {prof.department ?? "—"}</div>
                    <div><span className="text-muted-foreground">Level:</span> {prof.level ?? "—"}</div>
                    <div><span className="text-muted-foreground">Gender:</span> {prof.gender ?? "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Phone:</span> {prof.phone ?? "—"}</div>
                  </div>
                )}
                {viewing.manifesto && (
                  <div>
                    <div className="mb-1 text-sm font-medium">Manifesto</div>
                    <p className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{viewing.manifesto}</p>
                  </div>
                )}
                {viewing.reject_reason && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <div className="font-medium text-destructive">Rejection reason</div>
                    <div>{viewing.reject_reason}</div>
                  </div>
                )}
                {viewing.status === "pending" && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      const reason = prompt("Reason for rejection (shown to applicant):") ?? "";
                      if (reason.trim()) { rejectNomination.mutate({ id: viewing.id, reason: reason.trim() }); setViewing(null); }
                    }}>
                      <XCircle className="mr-1 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => { approveNomination.mutate(viewing.id); setViewing(null); }}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  </DialogFooter>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
