import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Vote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — GSU CS E-Voting" },
      { name: "description", content: "Sign in or register to vote in departmental elections." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden gradient-navy text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Vote className="h-6 w-6" /> GSU CS E-Voting
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Every vote counts.<br />Every vote is secure.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Sign in to view active departmental elections and cast your encrypted ballot.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Department of Computer Science, Gombe State University
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Access your voting dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignInForm /></TabsContent>
              <TabsContent value="signup"><SignUpForm /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      // Provide a more actionable message for common sign-in failures
      const msg = error.status === 400
        ? `Sign-in failed: ${error.message}. Check email/password and try again.`
        : error.message;
      return toast.error(msg);
    }
    toast.success("Signed in");
    navigate({ to: "/dashboard" });
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

const signUpSchema = z.object({
  full_name: z.string().min(2).max(100),
  reg_number: z.string().min(3).max(40),
  email: z.string().email(),
  level: z.string().min(1).max(10),
  gender: z.string().min(1).max(20),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(72),
});

function SignUpForm() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    const parsed = signUpSchema.safeParse(raw);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const REDIRECT = (import.meta.env.VITE_SUPABASE_REDIRECT_URL as string | undefined) || window.location.origin;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: REDIRECT,
        data: {
          full_name: parsed.data.full_name,
          reg_number: parsed.data.reg_number,
          department: "Computer Science",
          level: parsed.data.level,
          gender: parsed.data.gender,
          phone: parsed.data.phone,
        },
      },
    });
    setBusy(false);
    if (error) {
      // 422 commonly indicates the redirect URL isn't allowed in Supabase settings
      if (error.status === 422) {
        return toast.error("Signup failed: redirect URL not allowed. Add your app URL to Supabase Auth redirect URLs.");
      }
      return toast.error(error.message);
    }
    toast.success("Account created — you're signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Full name</Label><Input name="full_name" required maxLength={100} /></div>
        <div className="space-y-2"><Label>Matric No.</Label><Input name="reg_number" required maxLength={40} /></div>
      </div>
      <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required /></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2"><Label>Level</Label><Input name="level" placeholder="300" required /></div>
        <div className="space-y-2"><Label>Gender</Label><Input name="gender" placeholder="Male" required /></div>
        <div className="space-y-2"><Label>Phone</Label><Input name="phone" required /></div>
      </div>
      <div className="space-y-2"><Label>Password</Label><Input name="password" type="password" minLength={8} required /></div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create account"}</Button>
    </form>
  );
}
