import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — GSU CS E-Voting" },
      { name: "description", content: "Learn how the Departmental E-Voting System works and the team behind it." },
    ],
  }),
  component: () => (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold">About the System</h1>
        <p className="mt-4 text-muted-foreground">
          The Departmental E-Voting System is a final-year project of the
          Department of Computer Science, Gombe State University. It modernises
          student elections by providing a secure, transparent, and auditable
          digital voting platform.
        </p>
        <h2 className="mt-10 text-2xl font-semibold">Goals</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Eliminate ballot tampering and miscounts</li>
          <li>Make voting accessible from any device</li>
          <li>Provide real-time, verifiable results</li>
          <li>Maintain a complete audit trail of every action</li>
        </ul>
        <h2 className="mt-10 text-2xl font-semibold">Technology</h2>
        <p className="mt-3 text-muted-foreground">
          Built with React + TypeScript on TanStack Start, secured by row-level
          access policies on a PostgreSQL database with JWT-based authentication.
        </p>
      </main>
      <SiteFooter />
    </div>
  ),
});
