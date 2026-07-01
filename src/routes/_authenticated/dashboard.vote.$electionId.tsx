import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, ArrowLeft, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { getVoteBallotData, submitVote } from "@/lib/student.functions";
import { downloadCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/dashboard/vote/$electionId")({
  component: VoteFlow,
});

function VoteFlow() {
  const { electionId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipts, setReceipts] = useState<string[] | null>(null);
  const getBallotData = useServerFn(getVoteBallotData);
  const submitVoteFn = useServerFn(submitVote);

  const { data, isLoading } = useQuery({
    queryKey: ["vote-ballot", electionId, user?.id],
    queryFn: async () => await getBallotData({ data: { electionId } }),
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(selections).map(([position_id, candidate_id]) => ({
        election_id: electionId, position_id, candidate_id, voter_id: user!.id,
      }));
      const { receipts } = await submitVoteFn({ data: { electionId, rows } });
      return receipts;
    },
    onSuccess: (r) => {
      setReceipts(r);
      setConfirmOpen(false);
      qc.invalidateQueries();
      toast.success("Vote recorded.");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not submit vote."),
  });

  if (isLoading || !data) return <AppShell variant="student"><div>Loading ballot…</div></AppShell>;
  const { election, positions, candidates, votedPositions } = data as {
    election: { id: string; title: string; status: string };
    positions: Array<{ id: string; title: string }>;
    candidates: Array<{ id: string; full_name: string; manifesto?: string | null; position_id: string }>;
    votedPositions: Set<string> | string[];
  };

  if (!election) return <AppShell variant="student"><p>Election not found.</p></AppShell>;
  if (election.status !== "active") {
    return (
      <AppShell variant="student">
        <Card><CardContent className="p-6">This election is not currently open for voting.</CardContent></Card>
      </AppShell>
    );
  }

  const votedSet = votedPositions instanceof Set ? votedPositions : new Set<string>(votedPositions as string[]);
  const openPositions = positions.filter((p) => !votedSet.has(p.id));
  const allChosen = openPositions.every((p) => selections[p.id]);

  if (receipts) {
    return (
      <AppShell variant="student">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CheckCircle2 className="h-10 w-10 text-success" />
            <CardTitle className="mt-2">Your vote was recorded</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Keep these receipts to verify your vote:</p>
            <div className="mt-3 space-y-3">
              {receipts.map((r) => (
                <div key={r} className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
                  <div className="rounded bg-background p-1">
                    <QRCodeSVG value={r} size={64} />
                  </div>
                  <code className="break-all text-xs">{r}</code>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>
              <Button
                variant="outline"
                onClick={() => downloadCSV(`vote-receipts-${electionId}.csv`, receipts.map((r) => ({ receipt: r, election_id: electionId })))}
              >
                <Download className="mr-1 h-4 w-4" /> Download receipts
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell variant="student">
      <button onClick={() => navigate({ to: "/dashboard" })} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{election.title}</h1>
        <p className="text-muted-foreground">Select one candidate per position. You cannot change your vote after submission.</p>
      </div>

      {openPositions.length === 0 && (
        <Card><CardContent className="p-6 text-muted-foreground">You have already voted in every position of this election.</CardContent></Card>
      )}

      <div className="space-y-6">
        {openPositions.map((p) => (
          <Card key={p.id}>
            <CardHeader><CardTitle>{p.title}</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={selections[p.id] ?? ""} onValueChange={(v) => setSelections((s) => ({ ...s, [p.id]: v }))}>
                <div className="grid gap-3 md:grid-cols-2">
                  {candidates.filter((c) => c.position_id === p.id).map((c) => (
                    <Label key={c.id} htmlFor={c.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <RadioGroupItem id={c.id} value={c.id} className="mt-1" />
                      <div>
                        <div className="font-medium">{c.full_name}</div>
                        {c.manifesto && <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{c.manifesto}</div>}
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      {openPositions.length > 0 && (
        <div className="mt-8 flex items-center justify-between rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Your selections are encrypted before submission.
          </div>
          <Button disabled={!allChosen} onClick={() => setConfirmOpen(true)}>Review & confirm</Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your vote</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {openPositions.map((p) => {
              const c = candidates.find((c) => c.id === selections[p.id]);
              return (
                <li key={p.id} className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{p.title}</span>
                  <span className="font-medium">{c?.full_name}</span>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
