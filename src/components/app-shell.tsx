import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard, Vote, History, User, LogOut, Settings,
  ShieldCheck, Users, CalendarRange, Trophy, ScrollText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const studentNav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/elections", label: "Vote", icon: Vote },
  { to: "/dashboard/history", label: "My Votes", icon: History },
  { to: "/dashboard/profile", label: "Profile", icon: User },
] as const;

const adminNav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/elections", label: "Elections", icon: CalendarRange },
  { to: "/admin/candidates", label: "Candidates", icon: Trophy },
  { to: "/admin/voters", label: "Voters", icon: Users },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
] as const;

export function AppShell({ children, variant }: { children: ReactNode; variant: "student" | "admin" }) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const nav = variant === "admin" ? adminNav : studentNav;

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border/50 px-5 font-semibold">
          {variant === "admin" ? <ShieldCheck className="h-5 w-5" /> : <Vote className="h-5 w-5" />}
          <span className="text-sm">{variant === "admin" ? "Admin Console" : "Student Portal"}</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              activeOptions={{ exact: n.to === "/dashboard" || n.to === "/admin" }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          {variant === "student" && isAdmin && (
            <Link
              to="/admin"
              className="mt-4 flex items-center gap-3 rounded-md border border-sidebar-border/50 px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
            >
              <ShieldCheck className="h-4 w-4" /> Switch to Admin
            </Link>
          )}
          {variant === "admin" && (
            <Link
              to="/dashboard"
              className="mt-4 flex items-center gap-3 rounded-md border border-sidebar-border/50 px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
            >
              <Vote className="h-4 w-4" /> Student View
            </Link>
          )}
        </nav>
        <div className="border-t border-sidebar-border/50 p-3">
          <div className="mb-2 truncate px-2 text-xs text-sidebar-foreground/60">
            {user?.email}
          </div>
          <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-8">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">← Back to site</Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="md:hidden">
              <Link to="/dashboard/profile"><Settings className="h-4 w-4" /></Link>
            </Button>
            <Button onClick={signOut} variant="outline" size="sm" className="md:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
