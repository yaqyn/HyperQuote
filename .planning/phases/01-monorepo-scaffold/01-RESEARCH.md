# Phase 1: Monorepo Scaffold - Research

**Researched:** 2026-03-31
**Domain:** Monorepo infrastructure (Bun workspaces + Turborepo + TanStack Start + Cloudflare Workers + Supabase SSR)
**Confidence:** HIGH

## Summary

Phase 1 is pure greenfield infrastructure: scaffold a Bun workspaces monorepo with Turborepo, create 5 app shells (4 TanStack Start + 1 plain Vite), and validate that Supabase SSR auth works on Cloudflare Workers. No user-facing features.

The stack is well-documented with an official TanStack Start + Cloudflare example maintained in the TanStack/router repo. The highest risk is `@supabase/ssr` on Workers -- the `stream` module dynamic require issue (#37592) was closed as inactive with `nodejs_compat` as the presumed fix but never explicitly confirmed by the reporter. This validation is the go/no-go gate for Phase 1.

**Primary recommendation:** Scaffold monorepo structure first (root config + empty app shells), then validate Supabase SSR on Workers immediately in the `website` app before fleshing out remaining apps.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion -- pure infrastructure phase. Key constraints from spec:

- **Monorepo tool:** Bun workspaces + Turborepo 2.8.21 (non-negotiable)
- **Plugin order:** cloudflare -> tailwindcss -> tanstackStart -> react (critical)
- **TanStack Start:** v1.167.12+, NOT `@tanstack/start` (frozen), NO vinxi
- **Driver app:** Plain Vite + React SPA + Capacitor (NOT TanStack Start)
- **Source directory:** `src/` default, NEVER override with `srcDirectory: 'app'`
- **Colors:** `:root {}` only, NEVER `@theme` (Tailwind v4 collision)
- **Dual auth pool:** external (website/portal/driver) + internal (internal/ceo)

### Claude's Discretion
All implementation choices are at Claude's discretion -- pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None -- infrastructure phase, everything is in scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Monorepo scaffold with 5 apps + 7 shared packages builds and runs (`bun install` + `bun run dev`) | Bun workspaces + Turborepo setup, turbo.json task config, workspace package linking |
| FOUND-03 | Supabase SSR auth works on Cloudflare Workers (go/no-go validation with `nodejs_compat`) | `@supabase/ssr` createServerClient cookie pattern, `nodejs_compat` flag in wrangler.jsonc, fallback manual cookie wrapper |
| FOUND-04 | TanStack Start SSR renders a page with server function data on Cloudflare Workers | Official TanStack Start + Cloudflare example, vite.config.ts plugin order, wrangler.jsonc entry point, server function pattern |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture:** TanStack Start (NOT Next.js). React Aria (NOT shadcn). Motion v12 (NOT framer-motion). Bun (NOT npm). Cloudflare Workers (NOT Vercel).
- **Code:** `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`. `ClientOnly` for maps. `isKeyboardDismissDisabled` on Dialogs.
- **Vite 7 only:** Vite 8 exists (8.0.3 on npm) but TanStack Start has unresolved issues with it. Stay on 7.3.1.
- **No vinxi:** Removed since TanStack Start v1.121.0. Use `vite dev`/`vite build` directly.
- **No `@tanstack/start`:** Frozen at 1.120.20. Use `@tanstack/react-start` only.

## Standard Stack

### Core (Phase 1 only -- what gets installed)

| Package | Verified Version | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| `@tanstack/react-start` | 1.167.16 (latest) | Full-stack React framework | Official Cloudflare Workers support, pure Vite plugin |
| `@tanstack/react-router` | 1.168.10 (latest) | File-based routing | Paired with TanStack Start, type-safe search params |
| `react` | 19.2.4 | UI library | Spec requirement |
| `react-dom` | 19.2.4 | DOM renderer | Required by React |
| `vite` | 7.3.1 (pin, NOT 8.x) | Build tool | Vite 8.0.3 is latest but TanStack Start has issues. `@vitejs/plugin-react@5.2.0` is last version supporting Vite 7 |
| `@vitejs/plugin-react` | 5.2.0 (pin, NOT 6.x) | React Vite plugin | v6.0.1 requires Vite 8 (`peerDependencies: vite ^8.0.0`) |
| `@cloudflare/vite-plugin` | 1.30.3 (latest) | Cloudflare Workers integration | Official first-party plugin |
| `tailwindcss` | 4.2.2 | CSS framework | Spec requirement |
| `@tailwindcss/vite` | 4.2.2 | Tailwind Vite plugin | Required for Tailwind v4 in Vite |
| `@supabase/ssr` | 0.10.0 (latest) | Server-side auth | Cookie-based auth for SSR. Spec says ^0.9.0, 0.10.0 is current |
| `@supabase/supabase-js` | 2.101.0 (latest) | Supabase client | Required by @supabase/ssr |
| `typescript` | 6.0.2 | Type checking | Spec requirement, latest stable |
| `turbo` | 2.9.1 (latest) | Task runner/caching | Package name is `turbo` not `turborepo`. Spec says 2.8.21 but 2.9.1 is current |
| `@biomejs/biome` | 2.4.10 (latest) | Formatting + linting | 15-25x faster than Prettier+ESLint |
| `wrangler` | 4.79.0 (latest) | Cloudflare CLI | Deploy, typegen, preview. 4.78.0 installed globally |
| `lefthook` | 2.1.4 | Git hooks | Go binary, parallel execution |

### Version Pinning Notes

- **Vite:** MUST pin to `~7.3.1` (tilde). `^7.3.1` is safe since no 8.x would match, but `^` on latest npm resolves to 8.0.3 by default. Use explicit `"vite": "~7.3.1"` to be safe.
- **@vitejs/plugin-react:** MUST pin to `~5.2.0`. v6.x has `peerDependencies: { vite: "^8.0.0" }`.
- **turbo:** Spec says 2.8.21 but npm latest is 2.9.1. Use `^2.8.21` to get 2.9.1 (minor bump, safe).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Turborepo | Nx | Turborepo is simpler, Bun-native. Nx is more powerful but heavier |
| Bun workspaces | pnpm workspaces | Bun is the spec requirement. pnpm would add a second runtime |
| TanStack Start | Next.js | Explicitly forbidden in CLAUDE.md |

## Architecture Patterns

### Recommended Project Structure

```
hyperquote/
├── apps/
│   ├── website/           # TanStack Start, SSG+SSR, Cloudflare Workers
│   │   ├── src/
│   │   │   ├── router.tsx          # getRouter() with createRouter
│   │   │   ├── routes/
│   │   │   │   └── __root.tsx      # Root route: HeadContent + Scripts + Outlet
│   │   │   └── routeTree.gen.ts    # Auto-generated
│   │   ├── vite.config.ts
│   │   ├── wrangler.jsonc
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── portal/            # TanStack Start, SSR, Cloudflare Workers
│   ├── internal/          # TanStack Start, SPA, Cloudflare Workers
│   ├── ceo/               # TanStack Start, SPA/PWA, Cloudflare Workers
│   └── driver/            # Plain Vite + React SPA (NOT TanStack Start)
│       ├── src/
│       │   ├── main.tsx
│       │   └── App.tsx
│       ├── vite.config.ts          # No cloudflare or tanstackStart plugins
│       └── package.json
├── packages/
│   ├── ui/                # Shared UI components (Phase 3)
│   ├── types/             # TypeScript types from DB enums (Phase 2+)
│   ├── auth/              # Supabase SSR + SSO cookie (Phase 1 starts this)
│   ├── i18n/              # i18next config (Phase 3)
│   ├── forms/             # React Hook Form + Zod (Phase 3)
│   ├── tables/            # TanStack Table (Phase 3)
│   └── tsconfig/          # Shared tsconfig base (convenience)
├── supabase/              # Migrations (Phase 2+)
├── turbo.json
├── biome.json
├── package.json           # Root: workspaces, turbo scripts
├── bun.lock
└── tsconfig.json          # Root: references only
```

### Pattern 1: TanStack Start App Shell (4 apps)

**What:** Minimal TanStack Start app that renders on Cloudflare Workers.
**When to use:** Every app except driver.

```typescript
// vite.config.ts — Plugin order per CONTEXT.md decisions
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 3000 }, // Each app gets a different port
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
```

Note: The official TanStack example puts `tailwindcss()` before `cloudflare()`. The CONTEXT.md specifies `cloudflare -> tailwindcss -> tanstackStart -> react`. Follow the CONTEXT.md order as locked decision. If issues arise, the official order is the fallback.

```typescript
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
  return router
}
```

```typescript
// src/routes/__root.tsx
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
```

```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hyperquote-website",
  "compatibility_date": "2026-03-31",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry"
}
```

### Pattern 2: Server Function with Data

**What:** Validates FOUND-04 -- server function returns data rendered in SSR.

```typescript
// src/routes/index.tsx
import { createFileRoute, createServerFn } from '@tanstack/react-start'

const getHello = createServerFn().handler(async () => {
  return { message: 'HyperQuote is running on Workers', timestamp: Date.now() }
})

export const Route = createFileRoute('/')({
  loader: () => getHello(),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  return (
    <div>
      <h1>{data.message}</h1>
      <p>{data.timestamp}</p>
    </div>
  )
}
```

### Pattern 3: Supabase SSR Auth on Workers

**What:** Validates FOUND-03 -- createServerClient with cookie handling on Workers.

```typescript
// packages/auth/src/server.ts
import { createServerClient, parseCookieHeader } from '@supabase/ssr'

export function createSupabaseServerClient(request: Request) {
  const cookies = new Map<string, string>()

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const header = request.headers.get('cookie') ?? ''
          return parseCookieHeader(header)
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            cookies.set(name, value)
          })
        },
      },
    },
  )
}
```

Critical: Always create the Supabase client inside the request handler, never at module level. Cloudflare Workers are long-lived -- module-level state leaks between requests.

### Pattern 4: Root package.json (Bun Workspaces)

```json
{
  "name": "hyperquote",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "format": "biome format --write .",
    "check": "biome check --write ."
  },
  "devDependencies": {
    "turbo": "^2.8.21",
    "@biomejs/biome": "^2.4.8"
  },
  "packageManager": "bun@1.3.11"
}
```

### Pattern 5: turbo.json

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".output/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Pattern 6: Driver App (Plain Vite SPA)

```typescript
// apps/driver/vite.config.ts — NO cloudflare, NO tanstackStart
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 3004 },
  plugins: [
    tailwindcss(),
    viteReact(),
  ],
})
```

### Anti-Patterns to Avoid

- **`@tanstack/start`:** Frozen at 1.120.20. Always use `@tanstack/react-start`.
- **`vinxi`:** Removed since v1.121.0. Do not install.
- **`srcDirectory: 'app'`:** Never override. `src/` is the default.
- **`@theme` for colors:** Collides with Tailwind built-in utilities. Use `:root {}`.
- **Module-level Supabase client:** Workers are long-lived. Create client per-request.
- **`ssr.tsx`:** Obsolete. TanStack Start uses default server entry.
- **`@vitejs/plugin-react@6`:** Requires Vite 8. Stay on 5.2.0.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monorepo task orchestration | Custom shell scripts | Turborepo `turbo.json` | Dependency graph, caching, parallelization |
| Workspace linking | Manual symlinks | Bun workspaces (`workspace:*` protocol) | Automatic resolution, hoisting |
| Cookie-based auth | Manual cookie parsing | `@supabase/ssr` `createServerClient` | Handles token refresh, chunked cookies, PKCE |
| Cloudflare Workers entry | Custom worker script | `@tanstack/react-start/server-entry` | Auto-generated, handles SSR hydration |
| Type generation for Workers | Manual type defs | `wrangler types` (`cf-typegen` script) | Auto-generates from wrangler.jsonc bindings |

## Common Pitfalls

### Pitfall 1: Vite 8 Sneaking In
**What goes wrong:** `bun add vite` installs 8.0.3 (now latest). TanStack Start breaks.
**Why it happens:** Default resolution picks latest. `^7.3.1` would NOT resolve to 8.x, but auto-completion or fresh installs might.
**How to avoid:** Pin `"vite": "~7.3.1"` in every app. Pin `"@vitejs/plugin-react": "~5.2.0"`.
**Warning signs:** Build errors mentioning Vite 8 API changes, plugin compatibility warnings.

### Pitfall 2: Plugin Order in vite.config.ts
**What goes wrong:** Silent failures -- SSR doesn't work, Tailwind classes missing, or build fails.
**Why it happens:** Vite plugins execute in order. Cloudflare needs to intercept before others.
**How to avoid:** Always: `cloudflare -> tailwindcss -> tanstackStart -> react` (per CONTEXT.md).
**Warning signs:** Blank pages, missing styles, "module not found" in worker runtime.

### Pitfall 3: @supabase/ssr `stream` Module Error
**What goes wrong:** `dynamic require of "stream" is not supported` at runtime.
**Why it happens:** `@supabase/ssr` (via `@supabase/node-fetch`) uses Node.js `stream` module.
**How to avoid:** Set `"compatibility_flags": ["nodejs_compat"]` in wrangler.jsonc with a 2025+ `compatibility_date`.
**Warning signs:** Runtime error on first Supabase client creation. Test this Day 1.

### Pitfall 4: Module-Level State in Workers
**What goes wrong:** Auth tokens leak between requests. User A sees User B's session.
**Why it happens:** Cloudflare Workers are long-lived isolates. Module-level variables persist.
**How to avoid:** Always create Supabase client inside the request handler. Never cache user-specific state.
**Warning signs:** Intermittent auth issues in production, works fine in dev.

### Pitfall 5: Missing `type: "module"` in package.json
**What goes wrong:** ESM imports fail with cryptic errors.
**Why it happens:** Node/Bun default to CJS without this field.
**How to avoid:** Every `package.json` in the monorepo gets `"type": "module"`.
**Warning signs:** `SyntaxError: Cannot use import statement outside a module`.

### Pitfall 6: Workspace Package Resolution
**What goes wrong:** `bun install` can't find `@hyperquote/auth` or similar workspace packages.
**Why it happens:** Missing `"exports"` field in the package, or wrong workspace glob.
**How to avoid:** Every package needs `"exports": { ".": "./src/index.ts" }` and root workspaces must include `"packages/*"`.
**Warning signs:** `Module not found: @hyperquote/...`.

### Pitfall 7: tsconfig paths vs Vite resolve
**What goes wrong:** `~/` alias works in editor but fails at build time, or vice versa.
**Why it happens:** TypeScript and Vite have separate path resolution.
**How to avoid:** Set `"paths": { "~/*": ["./src/*"] }` in tsconfig.json AND `resolve: { tsconfigPaths: true }` in vite.config.ts (or use `vite-tsconfig-paths` plugin). The official example uses `tsconfigPaths: true`.
**Warning signs:** Editor finds types but build fails, or build works but editor shows errors.

## Code Examples

### Minimal wrangler.jsonc for Each App

```jsonc
// apps/website/wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hyperquote-website",
  "compatibility_date": "2026-03-31",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry"
}
```

### Supabase SSR Validation Server Function

```typescript
// In apps/website — validates FOUND-03
import { createServerFn } from '@tanstack/react-start'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'

const validateAuth = createServerFn()
  .handler(async ({ request }) => {
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(request.headers.get('cookie') ?? '')
          },
          setAll(cookies) {
            // In validation, we just need to confirm no crash
          },
        },
      },
    )

    // This is the go/no-go test: does createServerClient work on Workers?
    const { data, error } = await supabase.auth.getSession()
    return { works: !error, error: error?.message ?? null }
  })
```

### Workspace Package Template

```json
// packages/auth/package.json
{
  "name": "@hyperquote/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./client": "./src/client.ts"
  },
  "dependencies": {
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.100.1"
  }
}
```

### App package.json Referencing Workspace Packages

```json
// apps/website/package.json
{
  "name": "@hyperquote/website",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vite build && wrangler deploy",
    "cf-typegen": "wrangler types"
  },
  "dependencies": {
    "@hyperquote/auth": "workspace:*",
    "@tanstack/react-start": "^1.167.12",
    "@tanstack/react-router": "^1.168.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@cloudflare/vite-plugin": "^1.30.2",
    "@tailwindcss/vite": "^4.2.2",
    "@vitejs/plugin-react": "~5.2.0",
    "tailwindcss": "^4.2.2",
    "typescript": "^6.0.2",
    "vite": "~7.3.1",
    "wrangler": "^4.77.0"
  }
}
```

### Dev Port Assignments

| App | Port | Rationale |
|-----|------|-----------|
| website | 3000 | Primary dev target |
| portal | 3001 | Customer-facing |
| internal | 3002 | Internal platform |
| ceo | 3003 | CEO app |
| driver | 3004 | Driver app (plain Vite) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/start` + vinxi | `@tanstack/react-start` + pure Vite | v1.121.0 (2025) | No vinxi dependency, simpler config |
| `tailwind.config.js` | CSS-first `@theme` + `tokens.css` | Tailwind v4 (2025) | No JS config file needed |
| `@supabase/auth-helpers-*` | `@supabase/ssr` | 2024 | Unified SSR package, framework-agnostic |
| `createRouter` export | `getRouter()` wrapping `createRouter` | TanStack Start v1.121.0+ | Convention for router factory |
| `StartClient router={router}` | `StartClient` (no props) | TanStack Start v1.121.0+ | Router auto-resolved |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management, scripts | Yes | 1.3.11 | -- |
| Node.js | Some tooling | Yes | 25.8.0 | -- |
| Wrangler | Cloudflare Workers CLI | Yes (global) | 4.78.0 | Also installed as devDep |
| Turbo | Task runner | No (not global) | -- | `bunx turbo` or devDep |
| Git | Version control | Yes | (repo exists) | -- |
| Supabase CLI | Type generation (Phase 2+) | Not checked | -- | Not needed Phase 1 |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- Turbo not globally installed. Will be a devDependency -- run via `bunx turbo` or `bun run` scripts.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (not installed yet -- Phase 1 is infrastructure) |
| Config file | None -- Wave 0 creates it |
| Quick run command | `bun run test` (delegates to turbo) |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `bun install` succeeds, all workspaces resolve | smoke | `bun install && bun run build` | No -- Wave 0 |
| FOUND-03 | Supabase SSR creates/reads session cookie on Workers | integration | `bun run --filter=website preview` + curl test | No -- Wave 0 |
| FOUND-04 | TanStack Start SSR renders page with server function data | smoke | `bun run --filter=website dev` + curl test | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun install` (ensures no broken workspace links)
- **Per wave merge:** `bun run build` (all apps build successfully)
- **Phase gate:** All 4 success criteria pass manually

### Wave 0 Gaps
- [ ] No test infrastructure yet (greenfield). Phase 1 validates via manual smoke tests (dev server starts, page renders, auth works).
- [ ] Vitest setup deferred to Phase 3 (shared packages with testable logic). Phase 1 has no unit-testable code.

## Open Questions

1. **Plugin order discrepancy**
   - What we know: CONTEXT.md says `cloudflare -> tailwindcss -> tanstackStart -> react`. Official TanStack example puts `tailwindcss -> cloudflare -> tanstackStart -> react`.
   - What's unclear: Whether the order difference causes issues. Both sources are authoritative.
   - Recommendation: Follow CONTEXT.md (locked decision). If issues arise during validation, try the official example order as fallback.

2. **Supabase SSR on Workers -- fallback scope**
   - What we know: `nodejs_compat` flag should resolve the `stream` error. Issue #37592 was closed as inactive (never confirmed).
   - What's unclear: Whether `nodejs_compat` fully resolves it or if a manual cookie wrapper is needed.
   - Recommendation: Test Day 1. If `nodejs_compat` works, proceed. If not, the fallback is a manual cookie wrapper using `createBrowserClient` patterns adapted for Workers (2-4 hours of work per STATE.md estimate).

3. **Shared packages in Phase 1 scope**
   - What we know: FOUND-01 says "7 shared packages." Phase 1 context shows 7 package directories.
   - What's unclear: Whether all 7 need real code or just `package.json` stubs.
   - Recommendation: Create all 7 as stubs (`package.json` + `src/index.ts` exporting a placeholder). Only `@hyperquote/auth` needs real code for FOUND-03 validation. Others get fleshed out in Phase 3.

## Sources

### Primary (HIGH confidence)
- [TanStack/router GitHub example](https://github.com/TanStack/router/tree/main/examples/react/start-basic-cloudflare) -- Official Cloudflare example with vite.config, wrangler.jsonc, router.tsx, __root.tsx
- [Cloudflare Workers TanStack Start docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) -- Official setup guide, wrangler.jsonc config, deployment
- [Supabase SSR creating a client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- createServerClient pattern with cookie handling
- npm registry -- All versions verified 2026-03-31 via `npm view`

### Secondary (MEDIUM confidence)
- [Supabase issue #37592](https://github.com/supabase/supabase/issues/37592) -- `stream` error on Workers. Closed inactive. `nodejs_compat` suggested but unconfirmed.
- [Turborepo structuring docs](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) -- turbo.json format, workspace conventions

### Tertiary (LOW confidence)
- Plugin order: CONTEXT.md order differs from official TanStack example. Both may work. Needs validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry, official examples reviewed
- Architecture: HIGH -- official TanStack Start + Cloudflare example provides exact pattern
- Pitfalls: HIGH -- known issues documented in STACK-DECISION.md with mitigations, Vite 8/plugin-react 6 trap verified

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable ecosystem, pinned versions)
