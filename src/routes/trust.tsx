import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust, Security & Privacy — GSU CS E-Voting" },
      { name: "description", content: "How we keep the GSU Computer Science e-voting platform secure, private, and trustworthy." },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="container mx-auto max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold">Trust, Security & Privacy</h1>
        <p className="mt-2 text-muted-foreground">Last updated: June 2026</p>

        <section className="prose prose-sm dark:prose-invert mt-8 max-w-none space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Account security</h2>
            <p>Accounts are protected by email + password authentication. Sessions use signed tokens stored in your browser, and only you can view or modify your own profile, nominations, and votes.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Ballot privacy</h2>
            <p>Each voter sees only their own votes. Administrators can audit aggregate participation and counts to certify results, but ballots are tied to your account record so we can prevent double-voting — consistent with departmental election practice.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Data we collect</h2>
            <ul className="list-disc pl-5">
              <li>Profile: name, matric/reg number, department, level, gender, phone.</li>
              <li>Nominations you submit (manifesto, candidate photo).</li>
              <li>Votes you cast (election, position, candidate, timestamp).</li>
              <li>Audit log entries for sensitive actions like casting a vote.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Access controls</h2>
            <ul className="list-disc pl-5">
              <li>Row-Level Security restricts every table to the rightful owner.</li>
              <li>Candidate rejection reasons are visible only to the candidate and admins.</li>
              <li>Candidate photo uploads are served via short-lived signed URLs.</li>
              <li>Privileged operations are guarded by a role check, not client-side flags.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Reporting an issue</h2>
            <p>If you discover a security or privacy concern, please reach out via the Contact page. We take responsible disclosure seriously and will respond as quickly as possible.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
