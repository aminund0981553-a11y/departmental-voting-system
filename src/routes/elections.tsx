import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarRange, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/elections")({
  head: () => ({
    meta: [
      { title: "Elections — GSU CS E-Voting" },
      { name: "description", content: "Browse upcoming, active, and past departmental elections." },
    ],
  }),
  component: ElectionsPage,
});

function statusVariant(s: string) {
  if (s === "active") return "default";
  if (s === "scheduled") return "secondary";
  if (s === "ended" || s === "published") return "outline";
  return "secondary";
}

function ElectionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-elections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elections")
        .select("*")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold md:text-4xl">Elections</h1>
          <p className="mt-2 text-muted-foreground">
            All departmental elections — past, present and upcoming.
          </p>
        </header>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            No elections have been published yet. Check back soon.
          </CardContent></Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{e.title}</CardTitle>
                  <Badge variant={statusVariant(e.status) as any}>{e.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarRange className="h-4 w-4" />
                  {format(new Date(e.starts_at), "PPp")} → {format(new Date(e.ends_at), "PPp")}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/elections/$id" params={{ id: e.id }}>View details <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                  {e.results_published && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/results/$id" params={{ id: e.id }}>Results</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
