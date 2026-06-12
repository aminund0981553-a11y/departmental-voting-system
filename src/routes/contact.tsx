import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — GSU CS E-Voting" }] }),
  component: () => (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold">Contact the Electoral Committee</h1>
        <p className="mt-3 text-muted-foreground">For technical issues, complaints or election enquiries.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Mail, t: "Email", v: "electoral@gsu.edu.ng" },
            { icon: Phone, t: "Phone", v: "+234 800 000 0000" },
            { icon: MapPin, t: "Office", v: "Dept. of Computer Science, Gombe State University" },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border bg-card p-6">
              <c.icon className="h-6 w-6 text-primary" />
              <div className="mt-3 text-sm font-medium">{c.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.v}</div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});
