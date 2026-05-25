# HyperQuote Stack

This is the current source of truth for stack, backend, local runtime, and
verification. `package.json` and `bun.lock` remain the live version authority.

## Active Apps

- `apps/website`: TanStack Start on local Vite/Nitro, EN + AR, light + dark.
- `apps/portal`: TanStack Start on local Vite/Nitro, EN + AR, light + dark.
- `apps/internal`: TanStack Start on local Vite/Nitro, EN, light + dark.
- `apps/driver`: Vite SPA + Capacitor, EN + AR, light + dark.

The repo is local-only. There is no active hosted staging, hosted production,
Cloudflare Worker, GitHub Actions deploy, or promotion workflow.

## External Resource Baseline

The 2026-05-24 cloud reset removed the HyperQuote Cloudflare deploy/runtime
surface that was in scope: HyperQuote Workers, D1, R2, Vectorize,
Hyperdrive, AI Gateway, AI Search, KV, Pages, Tunnels, Workflows, and
HyperQuote/qvOS Secrets Store entries were absent after verification.

Retained resources are outside the HyperQuote reset scope and must be left
alone unless the user names them directly:

- Cloudflare Worker: `modern`.
- Cloudflare R2 buckets: `modern`, `othren-assets`.
- Cloudflare Secrets Store entries: `modern_*`.
- GitHub repos: `yaqyn/Modern`, `yaqyn/qv`, `yaqyn/HyperQuote`.

GitHub deploy secrets, deploy variables, Actions artifacts, and Actions caches
for HyperQuote were cleared. If `Deploy Staging Workers` or
`Deploy Production Workers` still appears in GitHub, it is a stale disabled
workflow record until the workflow-file deletion reaches the default branch.
Do not re-enable those workflows.

Supabase cloud projects can exist as account inventory, but they are not this
repo's runtime. Do not point apps, tests, seed scripts, or generated config at
hosted Supabase unless hosted backend architecture is reopened.

Cloudflare DNS records and Pipelines were not part of the verified reset
because the available tokens did not allow full inspection. Re-inventory before
touching them.

Support email threading is implemented locally and partially prepared in
Resend. `SUPPORT_EMAIL_HANDOFF.md` is the current source of truth for the
Resend webhook/domain setup, Cloudflare Email Routing state, and activation
choices. Do not replace root `hyperquote.net` MX records without confirming the
impact on all `@hyperquote.net` mail.

Product AI/Lyon behavior remains part of the app and docs. Deleted Lyon-named
Cloudflare resources must not be recreated automatically.

## Backend Boundary

Local Supabase/Postgres is the active source of truth. The checked-in
`supabase/` directory is the real backend migration surface.

Browser/native clients must not read or write public tables or call business
RPCs directly. Client apps may use Supabase Auth only for signup, login, session
refresh, and sign-out. App data access must go through React Start server
functions, local API handlers, or server-only helpers.

Use Supabase Auth for the three account pools:

- `customer`: public signup, shared by website and portal.
- `internal`: company-created only, role-based employee access.
- `driver`: company-created only, driver app access.

Suppliers do not have auth in v1. Supplier calls, prices, refill deals, and
receiving issues are manually recorded by employees.

RLS is authoritative for data visibility. UI role gates are convenience only.
Critical workflow transitions go through server-side functions/RPC backed by
Postgres transactions, not direct client-side table updates.

Required transactional flows include claim-next-order, confirm/reject order,
reserve/release stock, record finance approval/payment, hand off to warehouse,
assign dispatch/driver, and complete delivery with signature.

Activity/history must be append-only and attached to the actor, role, entity,
transition, timestamp, and request context where practical.

Delivery signatures and generated documents use Supabase Storage locally unless
a later scoped decision chooses a different object store.

Do not introduce hosted Supabase projects, Cloudflare Workers, Cloudflare D1,
Cloudflare Secrets Store, Cloudflare Vectorize, Cloudflare Hyperdrive,
Cloudflare AI Gateway, GitHub deploy workflows, Convex, Neon, Clerk, or a custom
auth system unless the user explicitly reopens architecture.

## Core Pins

| Layer | Current package/range | Rule |
|---|---|---|
| Runtime | Bun `1.3.11` | Workspaces and scripts |
| Monorepo | Turborepo `^2.9.14` | Build/typecheck orchestration |
| Language | TypeScript `^6.0.3` | Standard across root, apps, packages |
| UI | React / React DOM `^19.2.6` | React 19 rules apply |
| Build | Vite `~7.3.3` | Stay on Vite 7; no Vite 8 yet |
| Framework | `@tanstack/react-start` `^1.168.6` | Use this package, not `@tanstack/start` |
| Server runtime | Nitro `^3.0.260522-beta` | Local Node server output for Start apps |
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
| Quality | Biome `^2.4.15`, Vitest `^4.1.6`, Knip `^6.14.1` | Use repo scripts first |

## Integration Rules

- Vite 8 is not allowed until a separate proof shows TanStack Start, Nitro,
  Tailwind, and all app builds work.
- TanStack Start exports `getRouter()`; do not export `createRouter` directly.
- `StartClient` takes no props.
- Do not set `srcDirectory: "app"`; this repo uses `src/`.
- `routeTree.gen.ts` files are ignored generated TanStack Router output. App
  `typecheck` scripts run `tsr generate` before `tsc --noEmit`; keep that
  invariant for clean checkouts.
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
- No `cloudflare:workers` imports, Wrangler configs, Cloudflare Secrets Store
  bindings, Vectorize/Hyperdrive/AI Gateway bindings, or deploy scripts in the
  active app path.
- Supabase auth checks use `getUser()`, not `getSession()`.
- Supabase browser and server clients stay separate.
- Each app declares its own React/Node/Vite type dependencies and
  `compilerOptions.types`. Every `packages/*` workspace has its own
  `tsconfig.json`.
- Shared i18n namespaces live in `packages/i18n`; app-local namespaces live
  under the app and update the app's `src/types/i18n.d.ts` with runtime loading.

## Local Workflow

1. Start or reset local Supabase with `bun run db:start` or `bun run db:reset`.
2. Start all app surfaces with `bun run dev`.
3. Use ports: website `3000`, portal `3001`, internal `3002`, driver `3003`.
4. Infisical is the secret source for local dev, staging, and production.
   Local commands must request the `dev` Infisical environment explicitly.
   Staging uses `staging`; production uses the existing Infisical `prod` slug.
5. HyperQuote runtime secrets must be scoped to `/Projects/HyperQuote`.
   `/MASTER` is for operator/admin credentials only and must never be injected
   into app, Supabase, CI, deploy, test, or verification processes.
6. Local Supabase URL, anon key, and service-role key still come from
   `supabase status` during local dev because they are generated by the local
   runtime. Hosted Supabase runtime values belong in Infisical staging/prod
   only after hosted backend architecture is reopened.
7. Use `bun run secrets:check:dev`, `bun run secrets:check:staging`, and
   `bun run secrets:check:production` to verify required secret groups without
   printing values.
8. Cloudflare Secrets Store and GitHub deployment secrets are not runtime
   sources for this repo.
9. There is no hosted deploy command. Designing a new deploy workflow is a
   separate architecture task.

## Verification Gates

For broad cleanup, dependency, architecture, or runtime changes, use
`bun run check:ci`, `bun run typecheck`, direct `tsc -p ... --noEmit` when Turbo
coverage is unclear, `bunx turbo build --force`, Knip, Syncpack, architecture,
duplicate, secret, vulnerability, and Semgrep scans, targeted `rg` searches, and
`git diff --check`.

App tests: `bun run --cwd apps/internal test`,
`bun run --cwd apps/driver test`, `bun run --cwd apps/portal test`, and
`bun run --cwd apps/website test`.

`scan:duplicates` can exit 0 while reporting active-code clone clusters.
Classify those manually before abstracting.

## Open Workflow Gaps

- A new hosted workflow has not been designed.
- Hosted resource deletion must be confirmed against an exact inventory before
  any Cloudflare, GitHub, or Supabase resource is destroyed.
