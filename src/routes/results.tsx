import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Published Results — GSU CS E-Voting" },
      { name: "description", content: "Officially published election results." },
    ],
  }),
  component: () => {
    const { data } = useQuery({
      queryKey: ["public-results-list"],
      queryFn: async () => {
        const { data } = await supabase
          .from("elections")
          .select("*")
          .eq("results_published", true)
          .order("ends_at", { ascending: false });
        return data ?? [];
      },
    });
    return (
      <div>
        <SiteNav />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <h1 className="text-3xl font-bold md:text-4xl">Published Results</h1>
          <p className="mt-2 text-muted-foreground">Official results released by the Electoral Committee.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {(data ?? []).map((e) => (
              <Card key={e.id}>
                <CardHeader><CardTitle>{e.title}</CardTitle></CardHeader>
                <CardContent>
                  <Button asChild><Link to="/results/$id" params={{ id: e.id }}>View results</Link></Button>
                </CardContent>
              </Card>
            ))}
            {(data ?? []).length === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No results published yet.</CardContent></Card>
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  },
});
