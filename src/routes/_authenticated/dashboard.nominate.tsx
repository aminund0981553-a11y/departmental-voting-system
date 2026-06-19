import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Clock, CheckCircle2, XCircle, Upload, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getNominatePageData, submitNomination, withdrawNomination } from "@/lib/student.functions";

export const Route = createFileRoute("/_authenticated/dashboard/nominate")({
  head: () => ({ meta: [{ title: "Run for Office — GSU CS E-Voting" }] }),
  component: NominatePage,
});

function NominatePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const getNominateData = useServerFn(getNominatePageData);
  const submitNominationFn = useServerFn(submitNomination);
  const withdrawNominationFn = useServerFn(withdrawNomination);

  const { data, error } = useQuery({
    queryKey: ["nominate-data", user?.id],
    queryFn: async () => await getNominateData(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!error) return;
    const message = error?.message ?? "Unable to load nominations.";
    const status = (error as any)?.status;
    if (status === 403 || message.includes("Unauthorized")) {
      toast.error("Unable to load nominations — access denied. Check your login state.");
    } else {
      toast.error(message);
    }
  }, [error]);

  const [electionId, setElectionId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [fullName, setFullName] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be 5 MB or smaller"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("candidate-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("candidate-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 years
      if (signErr) throw signErr;
      setPhotoUrl(signed.signedUrl);
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const elections = (data?.elections ?? []) as any[];
  const positions = (data?.positions ?? []) as any[];
  const positionsForElection = positions.filter((p: any) => p.election_id === electionId);
  const mine = (data?.mine ?? []) as any[];
  const profile = data?.profile as any | null;

  const submit = useMutation({
    mutationFn: async () => {
      if (!positionId) throw new Error("Choose a position");
      const name = fullName.trim() || profile?.full_name?.trim() || "";
      if (!name) throw new Error("Please add your full name");
      if (manifesto.trim().length < 20) throw new Error("Manifesto must be at least 20 characters");

      // Prevent duplicate submission for the same position
      const existing = mine.find((c: any) => c.position_id === positionId);
      if (existing) {
        if (existing.status === "pending") throw new Error("You already have a pending nomination for this position. Withdraw it before submitting a new one.");
        if (existing.status === "approved") throw new Error("You are already an approved candidate for this position.");
        if (existing.status === "rejected") throw new Error("Your previous nomination for this position was rejected. Please contact the electoral committee.");
      }

      await submitNominationFn({
        data: {
          position_id: positionId,
          full_name: name,
          manifesto: manifesto.trim(),
          photo_url: photoUrl.trim() || null,
        },
      });
      
    },

    onSuccess: () => {
      toast.success("Nomination submitted — awaiting admin review");
      setPositionId(""); setManifesto(""); setPhotoUrl("");
      qc.invalidateQueries({ queryKey: ["nominate-data"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit"),
  });

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      await withdrawNominationFn({ data: { id } });
    },
    onSuccess: () => { toast.success("Nomination withdrawn"); qc.invalidateQueries({ queryKey: ["nominate-data"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell variant="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><UserPlus className="h-6 w-6" /> Run for Office</h1>
        <p className="text-muted-foreground">Submit a nomination for an open position. The electoral committee will review and approve qualified candidates before voting begins.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>New nomination</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {elections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No elections are currently accepting nominations. Check back soon.</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Election</Label>
                  <Select value={electionId} onValueChange={(v) => { setElectionId(v); setPositionId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select an election" /></SelectTrigger>
                    <SelectContent>
                          {elections.map((e: any) => (
                            <SelectItem key={e.id} value={e.id}>{e.title} ({e.status})</SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={positionId} onValueChange={setPositionId} disabled={!electionId}>
                    <SelectTrigger><SelectValue placeholder={electionId ? "Select a position" : "Choose election first"} /></SelectTrigger>
                    <SelectContent>
                      {positionsForElection.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">No positions in this election yet.</div>}
                      {positionsForElection.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Full name (as it should appear on the ballot)</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={profile?.full_name || "Your full name"}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Candidate photo (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(f);
                      e.target.value = "";
                    }}
                  />
                  {photoUrl ? (
                    <div className="flex items-center gap-3 rounded-md border p-2">
                      <img src={photoUrl} alt="Candidate preview" className="h-16 w-16 rounded object-cover" />
                      <div className="flex-1 text-xs text-muted-foreground">Photo uploaded</div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPhotoUrl("")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload photo"}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">JPG/PNG up to 5 MB.</p>
                </div>

                <div className="space-y-2">
                  <Label>Manifesto</Label>
                  <Textarea
                    rows={6}
                    value={manifesto}
                    onChange={(e) => setManifesto(e.target.value)}
                    placeholder="Why you're running and what you'll do if elected (min 20 characters)."
                    maxLength={2000}
                  />
                  <div className="text-xs text-muted-foreground">{manifesto.length}/2000</div>
                </div>

                <Button type="submit" disabled={submit.isPending}>
                  {submit.isPending ? "Submitting..." : "Submit nomination"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>My nominations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mine.length === 0 && <p className="text-sm text-muted-foreground">You haven't submitted any nominations yet.</p>}
            {mine.map((c) => {
              const pos = positions.find((p: any) => p.id === c.position_id);
              const el = elections.find((e) => e.id === pos?.election_id);
              const Icon = c.status === "approved" ? CheckCircle2 : c.status === "rejected" ? XCircle : Clock;
              const variant: any = c.status === "approved" ? "default" : c.status === "rejected" ? "destructive" : "secondary";
              return (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{pos?.title ?? "Position"}</div>
                      <div className="text-xs text-muted-foreground truncate">{el?.title}</div>
                    </div>
                    <Badge variant={variant} className="flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {c.status}
                    </Badge>
                  </div>
                  {c.manifesto && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{c.manifesto}</p>}
                  {c.status === "rejected" && c.reject_reason && (
                    <p className="mt-2 text-xs text-destructive">Reason: {c.reject_reason}</p>
                  )}
                  {c.status === "pending" && (
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => { if (confirm("Withdraw this nomination?")) withdraw.mutate(c.id); }}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Withdraw
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
