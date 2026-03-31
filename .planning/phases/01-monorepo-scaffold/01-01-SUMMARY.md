---
phase: 01-monorepo-scaffold
plan: 01
subsystem: infra
tags: [bun, turborepo, tanstack-start, cloudflare-workers, vite, monorepo, tailwindcss]

# Dependency graph
requires: []
provides:
  - "Bun workspaces monorepo with 5 apps + 7 shared packages"
  - "TanStack Start SSR with server function on Cloudflare Workers (FOUND-04)"
  - "turbo build pipeline for all workspaces"
  - "Shared tsconfig base for all apps"
affects: [02-supabase-ssr, 03-design-system, all-future-phases]

# Tech tracking
tech-stack:
  added: ["@tanstack/react-start@1.167.12", "@tanstack/react-router@1.168.0", "react@19.2.4", "vite@7.3.1", "@cloudflare/vite-plugin@1.30.2", "@tailwindcss/vite@4.2.2", "tailwindcss@4.2.2", "@vitejs/plugin-react@5.2.0", "typescript@6.0.2", "turbo@2.9.1", "@biomejs/biome@2.4.10", "wrangler@4.77.0", "@supabase/ssr@0.9.0", "@supabase/supabase-js@2.100.1"]
  patterns: ["Vite plugin order: cloudflare -> tailwindcss -> tanstackStart -> viteReact", "TanStack Start route generator auto-injects createFileRoute import", "tsconfig extends via relative path (not workspace protocol)", "Root route with html lang=ar dir=rtl"]

key-files:
  created: ["package.json", "turbo.json", "biome.json", "tsconfig.json", "apps/website/vite.config.ts", "apps/website/src/routes/index.tsx", "apps/website/wrangler.jsonc", "apps/driver/vite.config.ts", "apps/driver/index.html", "packages/tsconfig/base.json"]
  modified: []

key-decisions:
  - "tsconfig extends uses relative path (../../packages/tsconfig/base.json) instead of workspace protocol -- Vite esbuild cannot resolve workspace package paths for tsconfig extends"
  - "Route files omit explicit createFileRoute import -- TanStack route generator auto-injects it during build/dev"
  - "Biome configured with tab indentation, single quotes, no semicolons"

patterns-established:
  - "TanStack Start app template: vite.config.ts with 4 plugins in strict order, wrangler.jsonc with nodejs_compat, router.tsx with getRouter(), __root.tsx with RTL html"
  - "Driver app is plain Vite SPA (no cloudflare, no tanstackStart) -- separate from TanStack Start apps"
  - "Shared packages use exports field with ./src/index.ts entry point"
  - "Dev port assignment: website:3000, portal:3001, internal:3002, ceo:3003, driver:3004"

requirements-completed: [FOUND-01, FOUND-04]

# Metrics
duration: 6min
completed: 2026-03-31
---

# Phase 01 Plan 01: Monorepo Scaffold Summary

**Bun workspaces monorepo with 5 apps (4 TanStack Start + 1 Vite SPA) and 7 shared packages, all building via turbo with server function SSR validated on Cloudflare Workers**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T12:10:49Z
- **Completed:** 2026-03-31T12:16:56Z
- **Tasks:** 3
- **Files modified:** 59

## Accomplishments
- Complete monorepo scaffold: 5 apps + 7 shared packages, all 12 workspaces resolved by Bun
- TanStack Start SSR with createServerFn validated -- website builds with client + server output (FOUND-04)
- All 5 apps build successfully via `turbo build` (5/5 tasks, 7.4s)
- Driver app correctly configured as plain Vite SPA without cloudflare/tanstackStart plugins

## Task Commits

Each task was committed atomically:

1. **Task 1: Create monorepo root config + all 12 workspace stubs** - `c429273` (feat)
2. **Task 2: Add server function to website and validate SSR on Workers** - `f363df0` (feat)
3. **Task 3: Verify all 5 app dev servers build successfully** - `cc6b79f` (feat)

## Files Created/Modified
- `package.json` - Root monorepo config with Bun workspaces
- `turbo.json` - Turborepo task pipeline (build, dev, lint, typecheck)
- `biome.json` - Formatter + linter config (tabs, single quotes, no semicolons)
- `tsconfig.json` - Root TypeScript config
- `packages/tsconfig/base.json` - Shared tsconfig base for all apps
- `apps/website/vite.config.ts` - TanStack Start + Cloudflare Workers config (4-plugin order)
- `apps/website/src/routes/index.tsx` - Index route with createServerFn + loader pattern
- `apps/website/wrangler.jsonc` - Cloudflare Workers config with nodejs_compat
- `apps/driver/vite.config.ts` - Plain Vite SPA config (no cloudflare/tanstackStart)
- `apps/driver/index.html` - SPA entry point
- 6 package stubs (ui, types, auth, i18n, forms, tables) with exports field

## Decisions Made
- **tsconfig extends via relative path:** Vite's esbuild transform cannot resolve `@hyperquote/tsconfig/base.json` via workspace protocol. Used `../../packages/tsconfig/base.json` instead.
- **Route files omit createFileRoute import:** TanStack Start's route generator auto-injects `import { createFileRoute } from '@tanstack/react-router'` during build/dev. Including it manually causes duplicate declaration errors.
- **Biome formatting:** Tab indentation, single quotes, no semicolons -- matches biome.json config.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed tsconfig extends resolution for Vite esbuild**
- **Found during:** Task 2 (website build)
- **Issue:** `"extends": "@hyperquote/tsconfig/base.json"` fails -- Vite esbuild cannot resolve workspace package paths
- **Fix:** Changed all 5 app tsconfigs to use relative path `../../packages/tsconfig/base.json`
- **Files modified:** apps/website/tsconfig.json, apps/portal/tsconfig.json, apps/internal/tsconfig.json, apps/ceo/tsconfig.json, apps/driver/tsconfig.json
- **Verification:** Website build succeeds
- **Committed in:** f363df0 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed duplicate createFileRoute import in route files**
- **Found during:** Task 2 (website build)
- **Issue:** TanStack Start route generator auto-prepends `import { createFileRoute }` -- having it in source causes `Identifier has already been declared` error
- **Fix:** Removed explicit createFileRoute import from all route index files; only kept non-auto-generated imports (createServerFn)
- **Files modified:** apps/website/src/routes/index.tsx, apps/portal/src/routes/index.tsx, apps/internal/src/routes/index.tsx, apps/ceo/src/routes/index.tsx
- **Verification:** All 5 apps build successfully
- **Committed in:** f363df0 + cc6b79f (Tasks 2 and 3)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both fixes necessary for builds to succeed. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `packages/ui/src/index.ts` - Empty export placeholder (populated in Phase 3)
- `packages/types/src/index.ts` - Empty export placeholder (populated in Phase 2+)
- `packages/auth/src/index.ts` - Empty export placeholder (populated in Plan 01-02)
- `packages/i18n/src/index.ts` - Empty export placeholder (populated in Phase 3)
- `packages/forms/src/index.ts` - Empty export placeholder (populated in Phase 3)
- `packages/tables/src/index.ts` - Empty export placeholder (populated in Phase 3)

All stubs are intentional -- packages are scaffolded as placeholders for future phases. Plan objective (monorepo scaffold) is fully achieved.

## Next Phase Readiness
- Monorepo builds end-to-end, ready for Plan 01-02 (Supabase SSR validation)
- All TanStack Start apps have correct plugin order and wrangler.jsonc with nodejs_compat
- Shared packages ready to receive real code in future phases

## Self-Check: PASSED

- All key files verified present (9/9)
- All commits verified in git log (3/3: c429273, f363df0, cc6b79f)
- Metadata commit: 87decdf

---
*Phase: 01-monorepo-scaffold*
*Completed: 2026-03-31*
