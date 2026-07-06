# Developer Guide

Everything you need to work on the E-Voting System codebase.

## Prerequisites

- Bun 1.1+ (or Node 20+)
- Access to the Lovable project

## Setup

```bash
bun install
cp .env.example .env   # fill in SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY
bun dev
```

App runs at `http://localhost:8080`.

## Scripts

| Command             | Purpose                        |
| ------------------- | ------------------------------ |
| `bun dev`           | Vite dev server with HMR       |
| `bun run build`     | Production build               |
| `bun run build:dev` | Build with dev flags (SSR test)|
| `bun run lint`      | ESLint                         |
| `bun run format`    | Prettier write                 |

## Tech Overview

- **TanStack Start v1** — file-based routing under `src/routes/`.
- **`createServerFn`** — typed RPC for client → server calls. Files
  named `*.functions.ts` live in `src/lib/`.
- **TanStack Query** — data fetching. Prefer
  `context.queryClient.ensureQueryData(...)` in a loader, then
  `useSuspenseQuery(...)` in the component.
- **Tailwind v4** — configured via `src/styles.css` (no
  `tailwind.config.js`). Use design tokens defined in `styles.css`,
  never hardcoded color utilities.
- **shadcn/ui** — components under `src/components/ui/`.

## Backend Access Patterns

Three clients (see `src/integrations/supabase/`):

| Client                                       | Use for                                        |
| -------------------------------------------- | ---------------------------------------------- |
| `supabase` (browser)                         | Auth flows, realtime, session listeners        |
| `context.supabase` (via `requireSupabaseAuth`) | Auth-scoped server queries under RLS         |
| `supabaseAdmin` (server only, `.server.ts`)  | Verified webhooks/admin maintenance only       |

**Rule:** Never import `supabaseAdmin` in a `*.functions.ts` file.
Instead call a `SECURITY DEFINER` RPC.

## Adding a New Server Function

```ts
// src/lib/foo.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const doThing = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("things")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
```

## Adding a New Route

```tsx
// src/routes/hello.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hello")({
  head: () => ({
    meta: [
      { title: "Hello — DEVS" },
      { name: "description", content: "Sample page." },
    ],
  }),
  component: () => <h1>Hello</h1>,
});
```

The Vite plugin auto-regenerates `routeTree.gen.ts`. **Never edit
`routeTree.gen.ts` by hand.**

## Adding a Database Migration

Migrations live in `supabase/migrations/`. Naming: `YYYYMMDDHHMMSS_slug.sql`.
Rules:

- Every `CREATE TABLE public.X` **must** be followed by `GRANT` statements
  in the same migration, then `ENABLE ROW LEVEL SECURITY`, then `CREATE POLICY`.
- Never touch `auth`, `storage`, `realtime`, `supabase_functions`, or
  `vault` schemas.
- Prefer `SECURITY DEFINER` functions over service-role writes.

Example skeleton:

```sql
CREATE TABLE public.things (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.things TO authenticated;
GRANT ALL ON public.things TO service_role;

ALTER TABLE public.things ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read" ON public.things
  FOR SELECT TO authenticated USING (true);
```

## Coding Standards

- TypeScript strict mode is on. Every import must resolve.
- Small components, one concern each.
- Use semantic tokens (`bg-background`, `text-foreground`) — no
  `text-white`, `bg-[#...]`.
- Format with Prettier before committing.

## Testing Locally

- Manual QA via the browser at `http://localhost:8080`.
- Use the seeded first-admin account to test admin flows.
- Reset your local DB via the Lovable Cloud console when needed.
