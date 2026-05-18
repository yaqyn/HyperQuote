# HyperQuote Stack

This is the current source of truth for stack, backend, deploy, and verification.
`package.json` and `bun.lock` remain the live version authority.

## Active Apps

- `apps/website`: TanStack Start on Cloudflare Workers, EN + AR, light + dark.
- `apps/portal`: TanStack Start on Cloudflare Workers, EN + AR, light + dark.
- `apps/internal`: TanStack Start on Cloudflare Workers, EN, light + dark.
- `apps/driver`: Vite SPA + Capacitor, deployed as Worker assets, EN + AR,
  light + dark.

All deploy to Workers; production custom domains attach only to production
workers. Shared packages live under `packages/`.

## Backend Boundary

Supabase/Postgres is the selected production source of truth. Use separate
Supabase environments for local development, hosted staging
(`hyperquote-staged`), and hosted production (`hyperquote-production`).
Cloudflare Workers remain the app runtime and deploy target.

The checked-in `supabase/` directory is the real backend migration surface.
Staged and production projects must receive the same migrations, generated
types, storage policies, RPC contracts, and app code SHA.

- Keep frontend auth/session contracts when apps still import them.
- Use Supabase Auth for the three account pools:
  - `customer`: public signup, shared by website and portal.
  - `internal`: company-created only, role-based employee access.
  - `driver`: company-created only, driver app access.
- Suppliers do not have auth in v1. Supplier calls, prices, refill deals, and
  receiving issues are manually recorded by employees.
- `@supabase/supabase-js` remains where frontend clients need public auth,
  Realtime subscriptions, or typed browser access.
- `@supabase/ssr` remains in `packages/auth` for auth helpers.
- RLS is authoritative for data visibility. UI role gates are convenience only.
- Critical workflow transitions go through server-side functions/RPC backed by
  Postgres transactions, not direct client-side table updates.
- Required transactional flows include claim-next-order, confirm/reject order,
  reserve/release stock, record finance approval/payment, hand off to
  warehouse, assign dispatch/driver, and complete delivery with signature.
- Activity/history must be append-only and attached to the actor, role, entity,
  transition, timestamp, and request context where practical.
- Portal/internal realtime status should use Supabase Realtime where it keeps
  the UI current without replacing transactional writes.
- Delivery signatures and generated documents should use Supabase Storage
  unless a later scoped decision chooses a different object store.
- Do not introduce Convex, Cloudflare D1, Neon, Clerk, or a custom auth system
  as a replacement backend unless the user explicitly reopens architecture.
- Add migrations, run DB commands, generate DB types, or change DB scripts only
  inside explicitly scoped backend work.
- Do not point staged apps at production Supabase, and do not point production
  apps at staged Supabase.

## Core Pins

| Layer | Current package/range | Rule |
|---|---|---|
| Runtime | Bun `1.3.11` | Workspaces and scripts |
| Monorepo | Turborepo `^2.9.14` | Build/typecheck orchestration |
| Language | TypeScript `^6.0.3` | Standard across root, apps, packages |
| UI | React / React DOM `^19.2.6` | React 19 rules apply |
| Build | Vite `~7.3.3` | Stay on Vite 7; no Vite 8 yet |
| Framework | `@tanstack/react-start` `^1.168.6` | Use this package, not `@tanstack/start` |
| Router | `@tanstack/react-router` `^1.170.4` | URL state via validated search params |
| Server state | `@tanstack/react-query` `^5.100.10` | App-local where used |
| Styling | Tailwind CSS / `@tailwindcss/vite` `^4.3.0` | CSS-first Tailwind v4 |
| UI primitives | `react-aria-components` `^1.17.0` | Primary accessible primitive layer |
| Animation | `motion` `^12.38.0` | Import from `motion/react` |
| Forms | React Hook Form `^7.76.0` | Use `useWatch()`, not `watch()` |
| Validation | Zod `^4.4.3` | Keep schemas on Zod 4 |
| i18n | i18next `^26.2.0`, react-i18next `^17.0.8` | Shared singleton plus app-local namespaces |
| Maps | maplibre-gl `^5.24.0`, react-map-gl `^8.1.1` | Client-only wrappers for SSR |
| Driver native | Capacitor `^8.3.4` | Driver app only |
| Cloudflare | Wrangler `^4.92.0`, `@cloudflare/vite-plugin` `^1.37.1` | App-scoped deps, not root |
| Quality | Biome `^2.4.15`, Vitest `^4.1.6`, Knip `^6.14.1` | Use repo scripts first |

## Integration Rules

- Vite 8 is not allowed until a separate proof shows TanStack Start,
  Cloudflare, Tailwind, and all app builds work.
- TanStack Start exports `getRouter()`; do not export `createRouter` directly.
- `StartClient` takes no props.
- Do not set `srcDirectory: "app"`; this repo uses `src/`.
- `routeTree.gen.ts` files are ignored generated TanStack Router output. App
  `typecheck` scripts run `tsr generate` before `tsc --noEmit`; keep that
  invariant for clean CI checkouts.
- Server functions use `.inputValidator()`, not `.validator()`.
- Data crossing the server-function serialization boundary must be `JsonValue`
  or `JsonObject`, not loose `Record<string, unknown>`.
- Use `standardSchemaResolver`; do not use `zodResolver`.
- `isKeyboardDismissDisabled` belongs on `ModalOverlay`, `Modal`, or
  `Popover`, not on `Dialog`.
- Use CSS animations for React Aria Popover/Menu. Reserve Motion for Modal and
  view transitions.
- Initialize refs as `useRef<T | null>(null)`.
- Use `cubicBezier(...)` for Motion easing tuples.
- Type React elements with `ReactElement`, not global `JSX.Element`.
- Tailwind v4 requires `@tailwindcss/vite` in every Vite config.
- Keep color tokens in `:root {}`. Never put `--color-*` in `@theme`.
- Use the project dark variant:
  `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`.
- React Aria Tailwind plugin syntax is
  `@plugin 'tailwindcss-react-aria-components'`, not `@import`.
- Wrap MapLibre, Capacitor APIs, and anything touching `window` in `ClientOnly`.
- Pass locale explicitly to React Aria `I18nProvider`.
- Zustand persisted stores use `skipHydration: true` plus manual `rehydrate()`.
- Never use `cloudflare:workers` imports in middleware or client code.
- Supabase auth checks use `getUser()`, not `getSession()`.
- Supabase browser and server clients stay separate.
- Each app declares its own React/Node/Vite type dependencies and
  `compilerOptions.types`. Every `packages/*` workspace has its own
  `tsconfig.json`.
- Shared i18n namespaces live in `packages/i18n`; app-local namespaces live
  under the app and update the app's `src/types/i18n.d.ts` with runtime loading.

## Deploy

Deploys are GitHub-driven and promotion-based:

1. Feature branch -> PR checks / optional preview.
2. Merge to `main`.
3. `Deploy Staging Workers` runs quality gates, builds, scrubs generated
   `.dev.vars`, uploads sanitized artifacts, and deploys Workers.dev staging:
   `hyperquote-website-staging`, `hyperquote-portal-staging`,
   `hyperquote-internal-staging`, and `hyperquote-driver-staging`.
4. Test staging.
5. Manually run `Deploy Production Workers` with a full 40-character
   `source_sha` and `target_app`: `website`, `portal`, `internal`, `driver`,
   or `all`.
6. Production verifies successful staging for that exact SHA, checks out the
   SHA, reruns critical verification, rebuilds selected app(s), scrubs
   `.dev.vars`, deploys production workers, and attaches production custom
   domains.

Deploy jobs must set up Node `22` before invoking Wrangler. Sanitized staging
artifacts download under `apps/`; deploy steps run from `apps/<app>` and expect
`dist/server/wrangler.json` for Start apps or `wrangler.jsonc` for driver.

Production custom domains attach only to production workers. Do not add
canary/percentage rollout until observability and rollback policy are strong
enough.

Root `deploy:*` scripts are explicit local admin tools only. Do not bypass the
GitHub staging/promotion path with local Wrangler/Infisical deploys unless the
user explicitly asks.

## Verification Gates

For broad cleanup, dependency, architecture, or deploy-workflow changes, use
`bun run check:ci`, `bun run typecheck`, direct `tsc -p ... --noEmit` when
Turbo coverage is unclear, `bunx turbo build --force`, Knip, Syncpack,
architecture, duplicate, secret, vulnerability, and Semgrep scans, targeted
`rg` / `sg` searches, and `git diff --check`.

App tests: `bun run --cwd apps/internal test`,
`bun run --cwd apps/driver test`, and `bun run --cwd apps/portal test`. Portal
tests include skipped/todo tests; report them as a smoke gate.

`scan:duplicates` can exit 0 while reporting active-code clone clusters.
Classify those manually before abstracting.

## Open Production Gaps

- App adapters still need to move gradually from mock/server-function fallbacks
  to the real Supabase contracts.
- Hosted staged/production Supabase projects still need environment-scoped
  secrets, migration application, and smoke verification.
- Real portal tests replacing skipped/todo coverage.
- Observability and rollback policy before canary rollout.
