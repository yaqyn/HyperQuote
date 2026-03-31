# Phase 1: Monorepo Scaffold - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Converted from existing phase-01-context.md (infrastructure phase)

<domain>
## Phase Boundary

Every app and package builds and runs from a single monorepo, with Supabase SSR on Workers validated as feasible. Pure infrastructure scaffolding — no user-facing behavior.

**Requirements:** FOUND-01, FOUND-03, FOUND-04

**Success Criteria:**
1. `bun install` succeeds at monorepo root and all workspaces resolve
2. `bun run dev --filter=website` starts TanStack Start and renders a page with server function data
3. Supabase SSR auth creates and reads a session cookie on Cloudflare Workers (with `nodejs_compat`)
4. Each of the 5 apps has a working dev server (4 TanStack Start + 1 plain Vite for driver)

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Key constraints from spec:

- **Monorepo tool:** Bun workspaces + Turborepo 2.8.21 (non-negotiable)
- **Plugin order:** cloudflare -> tailwindcss -> tanstackStart -> react (critical)
- **TanStack Start:** v1.167.12+, NOT `@tanstack/start` (frozen), NO vinxi
- **Driver app:** Plain Vite + React SPA + Capacitor (NOT TanStack Start)
- **Source directory:** `src/` default, NEVER override with `srcDirectory: 'app'`
- **Colors:** `:root {}` only, NEVER `@theme` (Tailwind v4 collision)
- **Dual auth pool:** external (website/portal/driver) + internal (internal/ceo)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
None — this is the first phase, greenfield project.

### Established Patterns
None yet — this phase establishes them.

### Integration Points
None yet — this phase creates the foundation.

### Architecture Reference
```
Monorepo (Bun workspaces + Turborepo)
├── apps/website        TanStack Start, SSG+SSR, Cloudflare Workers
├── apps/portal         TanStack Start, SSR, Cloudflare Workers
├── apps/internal       TanStack Start, SPA, Cloudflare Workers
├── apps/ceo            TanStack Start, SPA/PWA, Cloudflare Workers
├── apps/driver         Vite + React SPA + Capacitor (NOT TanStack Start)
├── packages/ui         GlassWindow, StatusBadge, Toast, Skeleton, etc.
├── packages/types      TypeScript types from database enums
├── packages/auth       Supabase SSR + SSO cookie
├── packages/i18n       react-i18next config + AR/EN translations
├── packages/forms      React Hook Form + Zod + React Aria
├── packages/tables     TanStack Table + React Aria
└── supabase/           Migrations from BACKEND.md
```

### Critical Dependencies
```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@tanstack/react-start": "^1.167.12",
    "@tanstack/react-router": "^1.168.0",
    "@cloudflare/vite-plugin": "^1.30.2",
    "@tailwindcss/vite": "^4.2.2",
    "tailwindcss": "^4.2.2",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.100.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.2.0",
    "vite": "^7.3.1",
    "typescript": "^6.0.2",
    "@biomejs/biome": "^2.4.8",
    "wrangler": "^4.77.0",
    "lefthook": "^2.1.4"
  }
}
```

</code_context>

<specifics>
## Specific Ideas

### Vite Config Template (4 TanStack Start apps)
```tsx
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
})
```

### TanStack Start Entry Points
| File | Purpose | Required? |
|------|---------|-----------|
| `router.tsx` | Exports `getRouter()` (internally calls `createRouter`) | Yes |
| `client.tsx` | `<StrictMode><StartClient /></StrictMode>` (no props) | Optional |
| `server.ts` | Custom server entry (fetch handler) | Optional |
| `routes/__root.tsx` | Root route with `<HeadContent />` + `<Scripts />` | Yes |

### Known Risks
1. **HIGHEST:** Supabase SSR on Workers — `stream` module dependency. Enable `nodejs_compat` and test Day 1. Fallback: manual cookie wrapper.
2. **HIGH:** Vite 8 NOT compatible — stay on 7.3.1
3. **HIGH:** Plugin order matters — wrong order causes silent failures
4. **MEDIUM:** React Aria I18nProvider SSR hydration bug — pass locale explicitly

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase, everything is in scope.

</deferred>
