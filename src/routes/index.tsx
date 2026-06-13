import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Vote, Eye, Clock, Trophy, Users,
  CheckCircle2, Lock, Fingerprint, Smartphone, BarChart3,
} from "lucide-react";
import heroImg from "@/assets/hero-voting.jpg";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Departmental E-Voting System | Computer Science, GSU" },
      { name: "description", content: "A secure, transparent online voting platform for departmental elections at Gombe State University's Department of Computer Science." },
      { property: "og:title", content: "Departmental E-Voting System | Computer Science, GSU" },
      { property: "og:description", content: "Vote securely from anywhere. Live results, encrypted ballots, full audit trail." },
    ],
  }),
  component: Landing,
});

function useStats() {
  return useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const [el, ca, vo] = await Promise.all([
        supabase.from("elections").select("id,status", { count: "exact", head: false }),
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("approved", true),
        supabase.from("votes").select("id", { count: "exact", head: true }),
      ]);
      return {
        elections: el.data?.length ?? 0,
        active: el.data?.filter((e) => e.status === "active").length ?? 0,
        candidates: ca.count ?? 0,
        votes: vo.count ?? 0,
      };
    },
  });
}

function Landing() {
  const { data: stats } = useStats();

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-navy" />
        <div className="absolute inset-0 -z-10 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.78 0.05 245 / 0.4), transparent 50%), radial-gradient(circle at 80% 60%, oklch(0.55 0.1 230 / 0.3), transparent 50%)" }} />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 text-primary-foreground md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-5 w-fit bg-white/10 text-primary-foreground hover:bg-white/15">
              Gombe State University · Computer Science
            </Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Secure Online Voting for Departmental Elections
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
              Cast your vote from anywhere, in seconds. Encrypted ballots, real-time
              results, full audit trail — built for the Department of Computer Science.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth" search={{ mode: "signup" }}>Register to Vote</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">

                <Link to="/elections">View Elections</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> End-to-end secured</span>
              <span className="flex items-center gap-2"><Fingerprint className="h-4 w-4" /> One voter, one vote</span>
              <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Public results</span>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="Digital ballot box illustration"
              width={1600}
              height={1024}
              className="rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto -mt-12 max-w-6xl px-4">
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-xl md:grid-cols-4">
          {[
            { label: "Elections", value: stats?.elections ?? 0, icon: Vote },
            { label: "Active Now", value: stats?.active ?? 0, icon: Clock },
            { label: "Candidates", value: stats?.candidates ?? 0, icon: Trophy },
            { label: "Votes Cast", value: stats?.votes ?? 0, icon: Users },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-lg gradient-navy text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">About the System</h2>
            <p className="mt-4 text-muted-foreground">
              The GSU CS E-Voting System replaces paper ballots with a modern,
              auditable digital process. Registered students authenticate with
              their email, see only active elections for their department, and
              cast a verifiable encrypted ballot. The Electoral Committee runs
              the entire election lifecycle from one dashboard.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Verified student registration with matric numbers",
                "One-vote-per-position enforced by the database",
                "Live results dashboard with charts and turnout",
                "Tamper-evident audit log of every important action",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, t: "Role-based access", d: "Admins, students and candidates each see only what they should." },
              { icon: Lock, t: "Encrypted ballots", d: "Votes are stored anonymously with cryptographic receipts." },
              { icon: BarChart3, t: "Real-time results", d: "Live charts update as votes come in." },
              { icon: Smartphone, t: "Mobile-first", d: "Works on any device — vote from your phone." },
            ].map((f) => (
              <Card key={f.t}>
                <CardHeader>
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-3 text-base">{f.t}</CardTitle>
                </CardHeader>
                <CardContent className="-mt-2 text-sm text-muted-foreground">{f.d}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">How it Works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Four simple steps from registration to receipt.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { n: "01", t: "Register", d: "Sign up with your matric number and student email." },
              { n: "02", t: "Verify", d: "Log in securely. Active elections appear in your dashboard." },
              { n: "03", t: "Vote", d: "Choose one candidate per position. Review and confirm." },
              { n: "04", t: "Receipt", d: "Get a cryptographic receipt to verify your vote was recorded." },
            ].map((s) => (
              <Card key={s.n} className="relative overflow-hidden">
                <div className="absolute -right-2 -top-4 text-7xl font-black text-primary/15 dark:text-primary/25">{s.n}</div>
                <CardHeader><CardTitle className="text-lg">{s.t}</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">{s.d}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faqs" className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="mt-8">
          {[
            { q: "Who can vote?", a: "Every registered student of the Department of Computer Science with a valid matric number." },
            { q: "Can I vote more than once?", a: "No. The system enforces one vote per position per voter at the database level." },
            { q: "Is my vote anonymous?", a: "Your ballot is stored separately from your identity references in published results. Only auditors can investigate disputes." },
            { q: "What if I lose my receipt?", a: "You can view your voting receipts anytime from your dashboard under My Votes." },
            { q: "When are results released?", a: "Results are visible live to admins and become public once the Electoral Committee publishes them." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section id="contact" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-2xl gradient-navy p-10 text-primary-foreground md:p-14">
          <div className="grid items-center gap-6 md:grid-cols-[2fr_1fr]">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">Ready to make your voice count?</h2>
              <p className="mt-3 text-primary-foreground/80">
                Register today and cast your ballot in the next departmental election.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth" search={{ mode: "signup" }}>Create account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
                <Link to="/elections">Browse elections</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
