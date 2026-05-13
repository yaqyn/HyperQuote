# HyperQuote

B2B building materials platform for Egypt. Contractors submit once, receive
consolidated multi-supplier quotes via AI coordination.

Craftsmanship over speed. Built right once beats built fast twice.

## Apps

| App | Runtime | Language | Theme | Status | Scope |
|-----|---------|----------|-------|--------|-------|
| `apps/website` | TanStack Start on CF Workers | EN + AR | light + dark | active | Public marketing + product catalog |
| `apps/portal` | TanStack Start on CF Workers | EN + AR | **paper-light only** (+ dark `/login`) | active | Customer account, orders, quotes — "Lyon's office" metaphor |
| `apps/internal` | TanStack Start on CF Workers | EN only | light + dark | active | Ops console — sales, procurement, warehouse, finance, dispatch, customer-service, admin |
| `apps/driver` | **Vite SPA + Capacitor** (NOT TanStack Start) | EN + AR | light + dark | **placeholder — full rewrite pending** | Driver mobile app. Server functions don't work in Capacitor WebViews — call server via fetch. Shares `@hyperquote/*` packages. |
| `apps/ceo` | TanStack Start on CF Workers | EN only | light + dark | **placeholder — full rewrite pending** | Executive dashboard |

**Driver and CEO apps are scaffold / placeholder.** Current code is NOT reference material — design, structure, and flow will all change. Don't copy patterns FROM them into other apps. Don't treat their current choices as decisions. Before working in either app, check with me on the new direction.

Monorepo: Bun workspaces + Turborepo. Shared packages in `packages/`: `types`, `ui`, `auth`, `i18n`. Changes to shared types ripple to every app — bump with intent.

Canonical stack decisions + known integration issues live in `essential/brand/STACK-DECISION.md`. Read it before touching infra, installing packages, or wrestling with a weird bug.

## Data discipline — the central rule

IMPORTANT: The database is the single source of truth for every piece of information that renders in any app. Never hardcode user-facing values — names, prices, addresses, labels, statuses, IDs, dates — in components or server files.

**Exceptions** (allowed inline, no data source needed):
- Website static brand assets: hero images, icons, legal copy, marketing text.
- Config constants that genuinely never change per environment (retry limits, fixed rates, feature flag keys). Comment why they're not data.

The single edit test: change the source of truth in one place → the new value appears everywhere that concept surfaces. If it doesn't, there's a duplicate. Find it, kill it.

**Dev mode** runs against an in-memory mock DB at `apps/internal/src/lib/db/db.ts`, seeded from markdown under `apps/internal/src/lib/db/seed/*.md`. All server functions read/write through `db.ts`. The Supabase swap is confined to `buildInitialState` — caller contracts stay the same.

## Stack pins

Defaults are in `~/.AGENTS/AGENTS.md`. This project's version pins and gotchas:

- **Vite 7** — Vite 8 is incompatible with our setup. Do not upgrade.
- Check `package.json` before adding or upgrading any dependency.

## Code rules (project gotchas)

TanStack / framework:
- `.inputValidator()` not `.validator()` for TanStack server functions.
- Export `getRouter()` (it calls `createRouter` internally). Don't export `createRouter` directly.
- `StartClient` takes no props. `ssr.tsx` is obsolete — let TanStack Start use its default server entry.
- Never override `srcDirectory: 'app'` — `src/` is the default and expected everywhere.
- Data fetching in TanStack Router loaders, never `useEffect`.
- URL state (filters, selected entity) via TanStack Router search params with Zod `validateSearch`.
- Server-function return types: anything that crosses the serialization boundary must be a `JsonObject` (defined in `apps/internal/src/lib/db/db.ts`). `Record<string, unknown>` gets reduced to `{[k: string]: {}}` by `ValidateSerializableInput` and type inference silently breaks. Use `JsonValue | JsonObject` for metadata fields.
- Dynamic i18n keys (`t(\`foo.${x}\`)`): cast via `as ParseKeys<'namespace'>` from `i18next`. Never `as any`. For truly dynamic keys that can't be proven at compile time, pass `{ defaultValue: ... }` so missing keys fail gracefully at runtime.

Forms:
- `useWatch()` never `watch()` — RHF `watch()` breaks on React 19.
- Use `standardSchemaResolver`, NOT `zodResolver` — `@hookform/resolvers` v5+ changed the API.

React Aria + motion:
- `isKeyboardDismissDisabled` belongs on `ModalOverlay` / `Modal` / `Popover`, **not** on `Dialog`. React Aria rejects it on Dialog; TS won't catch this. Handle Escape via the hotkeys layer so Aria and the app don't both fire.
- Motion + Popover/Menu has an open race (issue #9158) — use CSS animations for Popover/Menu, reserve Motion for Modal and view transitions.
- Arrow-key global hotkeys: guard with `{ enabled: !isMenuOpen }` so ListBox/Menu navigation wins.

React 19 + Motion v12:
- `useRef<T>()` without an argument is broken under React 19 strict mode. Always initialize: `useRef<T | null>(null)`.
- Motion v12 rejects `ease: [0.22, 1, 0.36, 1]` (plain number tuple). Use `ease: cubicBezier(0.22, 1, 0.36, 1)` — import from `motion/react`.
- `motion` imports: the runtime is `motion/react`, not `motion` — the latter resolves to the headless core and is missing JSX types.
- `JSX.Element` no longer re-exported globally — use `import { type ReactElement } from 'react'` and type as `ReactElement`.

Tailwind v4:
- `@tailwindcss/vite` plugin is required in `vite.config.ts`. Without it, zero utility classes.
- Color tokens in `:root {}`, NEVER `@theme` — `--color-*` in `@theme` collides with built-in utilities (`text-base` would start setting color instead of font-size).
- Dark mode: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` — not Tailwind's default `dark:` prefix.
- React Aria plugin: `@plugin 'tailwindcss-react-aria-components'` — not `@import`.

Client-only / SSR:
- `ClientOnly` wrapper for MapLibre, Capacitor APIs, anything that touches `window`.
- React Aria `I18nProvider` SSR hydration bug (#7474): pass `locale` explicitly; don't rely on `useDefaultLocale()`.
- Zustand SSR: `skipHydration: true` + manual `rehydrate()` in `useEffect`.
- Never use `cloudflare:workers` imports in middleware — server functions only.

Supabase / auth:
- Two Supabase clients: browser client for client code, server client (`@supabase/ssr`) for server code — never mix.
- `getUser()` for auth checks, not `getSession()` — session can be tampered.

Testing:
- Vitest browser mode for component tests (real browser needed for React Aria a11y). MSW works in Vitest browser but NOT with `bun test` — always run via `bun run vitest`.
- Playwright for E2E keyboard + visual regression. Storybook with `@tailwindcss/vite` in `viteFinal` config for Tailwind v4.

## Monorepo + Bun workspaces

Bun's isolated layout does not auto-hoist types. Every workspace that needs them must declare them explicitly.

- Each app has its own `tsconfig.json` extending `packages/tsconfig/base.json` AND sets `compilerOptions.types: ["node", "vite/client"]`. Without `types`, `moduleResolution: "bundler"` can miss `@types/node` from the `.bun/@types+node@*/` layout.
- Every app that imports React/Node/Vite types has `@types/react`, `@types/react-dom`, `@types/node` in its own devDependencies. Adding them to one workspace does not share to siblings.
- Every `packages/*` has its own `tsconfig.json`. Without one, `tsc` walks up and picks up the wrong scope, producing phantom errors.
- Biome excludes are path globs rooted at the config file. Nested builds need `!**/dist`, `!**/node_modules`, `!**/.turbo`, `!**/.tmp` — the `**/` prefix is load-bearing. `!dist` alone matches only the root-level `dist`.
- `biome check --only=rule/x` forces the rule on, overriding config. Testing whether an override works? Run without `--only` — otherwise you're testing the wrong thing.

## i18n type augmentation

- `packages/i18n/src/types/resources.d.ts` registers the **shared** namespaces (`common`, `portal`, `units`, `website`). Don't add app-specific namespaces here.
- Each app with its own namespaces declares them in `apps/<app>/src/types/i18n.d.ts` via `declare module 'i18next' { interface CustomTypeOptions { resources: { ns: typeof enNs } } }`. Keep these in sync with what the app's `i18n.ts` actually loads — when you add a namespace to the runtime, add it to the `.d.ts` in the same commit.

## Cleanups and mass edits

For broad lint passes, typecheck sweeps, or cross-app refactors:

- **Classify before fixing.** If `bun run check` reports tens of thousands of errors, the config is usually off, not the code. Check file paths first — dist/node_modules/vendor bundles slipping through excludes is the #1 noise source.
- **Stop after one failed config pattern.** If a biome include/override pattern doesn't match, don't iterate blindly through variants. Read the matcher docs and write the one correct form.
- **After `biome check --write --unsafe`, verify.** The exhaustive-deps fix can reference a symbol before its declaration (`noInvalidUseBeforeDeclaration`). Run `bun run build` AND `tsc --noEmit` after any unsafe pass.
- **`Edit(replace_all: true)` on generic tokens is forbidden.** `Map`, `div`, `State`, `id` — never. Substring matching chews through unrelated identifiers (`MapRef`, `DispatchMap`, `State.tsx`). Use targeted edits or `replace_all` only on unique multi-word strings.
- **Codemods: sample before scripting.** Biome points at 66 `<label>` errors — half will be pseudo-headers needing `<span>`, half will wrap custom components needing `Label` rewiring. Read 3–5 by hand before assuming one pattern.
- **Dispatch parallel agents by non-overlapping scope.** For a monorepo-wide cleanup, one agent per app (website / portal / driver / internal / ceo) + one for packages. Brief each with: scope, exact file tree, rules/errors they own, verification commands, and hard constraints (no `as any`, no blanket ignores). Never let two agents touch the same files.
- **Verify in the foreground after agents report done.** Agents' self-reports describe intent, not always reality. Run `biome check` + `tsc --noEmit` + `bun run build` from the parent before claiming done.

## Code review and scan tooling

Use these terminal tools before and after broad cleanup, dependency changes,
architecture changes, or agent-generated code. Prefer read-only scans first;
run fix/write modes only after reading the report and deciding the change is
safe. JavaScript scanners are repo dev dependencies; `gitleaks`,
`osv-scanner`, and `semgrep` are expected user-space CLIs on PATH.

- **Biome**: `bun run check:ci` is read-only. `bun run check` writes fixes.
  If Biome reports huge noise, inspect paths first; generated/vendor output is
  usually slipping through excludes.
- **TypeScript**: `bun run typecheck` is the intended root command, but verify
  Turbo actually executes workspace tasks. If it reports `0 total`, run the
  relevant app/package `tsc --noEmit` directly or add the missing workspace
  script before claiming type safety.
- **Knip**: start narrow with `bun run knip:deps` or
  `bun run knip:exports`; run `bun run knip` for the full unused
  file/export/dependency report. Do not use Knip fix mode until false positives
  are classified.
- **Syncpack**: `bun run sync` checks dependency version drift. Use
  `bun run sync:fix` only after confirming the target versions respect project
  pins, especially Vite and TanStack packages.
- **Gitleaks**: `bun run scan:secrets` scans git history with redaction. Never
  print secret values from findings; rotate at the source if a real token is
  detected.
- **OSV Scanner**: `bun run scan:vulns` scans source and lockfiles for known
  dependency vulnerabilities. Treat findings as triage input, not automatic
  permission to upgrade pinned packages.
- **dependency-cruiser**: `bun run scan:arch` inspects app/package import
  relationships. Add a checked-in config before enforcing new architecture
  rules in CI.
- **jscpd**: `bun run scan:duplicates` finds copy/paste blocks across
  `apps/` and `packages/`. Refactor only real shared concepts; do not abstract
  coincidental visual similarity.
- **ast-grep**: use `sg` for structural searches that `rg` cannot express
  safely, such as `watch()` calls, `.validator()` server functions,
  wrong `motion` imports, or `useRef<T>()` without an initializer.
- **Semgrep**: `bun run scan:semgrep` runs registry-backed semantic/security
  rules. Expect network use and review findings manually before patching.
- **rollup-plugin-visualizer**: use only during bundle-size investigations for
  a specific app build. Do not commit generated reports unless they are the
  requested artifact.

## Frontend conventions

- **i18n scope**: website, portal, driver — every user-facing string lives in `src/locales/{en,ar}/<namespace>.json` and is read via `useTranslation('<namespace>')`. Never hardcode EN or AR content in JSX. Internal + ceo are EN-only; inline EN strings are acceptable there.
- **RTL**: bilingual apps (website, portal, driver) must use logical properties (`margin-inline-start`, `padding-inline-end`, `border-inline-end`) — never `left`/`right`. Internal + ceo can use physical props.
- **Theming**: website, internal, driver, ceo support light + dark via `[data-theme="dark"]` on `<html>`. The **portal is paper-light only** — its `<html>` is fixed at `data-theme="light"`; the only dark surface is `/login`, which is scoped via `.atelier-scene`. Test both themes where applicable; never ship a component that only works in one.
- **Primary palette**: white, black, blue `#2563EB`. Signal colors (amber `#D97706`, red `#B91C1C`, emerald) allowed for state indicators, not decoration.
- **Components**: React Aria primitives throughout. Don't override accessibility behavior.
- **Images**: always specify width/height or aspect-ratio to prevent layout shift. WebP/AVIF. `loading="lazy"` below the fold.
- **Forms**: validate on blur, not on change. Inline errors next to the field, not in toasts.
- **Animations**: respect `prefers-reduced-motion` — use Motion's `useReducedMotion()` guard.
- **Error boundaries**: wrap every route-level component. A crash must not white-screen the app.
- **Never** inject raw HTML strings into React — no `dangerouslySet…` escape hatch for rendered content. JSX escaping handles XSS; don't bypass it. The two valid exceptions (already wired) are JSON-LD schema in `JsonLd.tsx` and the pre-hydration theme/locale boot script in `__root.tsx`. Both are allowed via a targeted `biome.json` override; don't add new uses and don't widen the override.

## Backend conventions

- Every server function: Zod `.inputValidator()` + typed return. No untyped endpoints.
- Supabase queries: `.select()` specific columns, never `SELECT *`.
- Errors: structured `{ error: string, code: string }`, never raw stack traces.
- Long operations (PDF, email, AI) run async via Cloudflare Queues, never block the request.
- Money stored as integers (smallest unit). No floating point.
- Timestamps in UTC; convert at the display layer only.
- Migrations idempotent — safe to re-run.

## Security

- No secrets, API keys, or connection strings in client code.
- All DB access through Supabase RLS. Never bypass with service role unless explicitly required for a specific admin flow.
- Never concatenate user input into SQL — not in `.rpc()`, not in migrations, nowhere.
- CORS: specific origins, never `*` in production.
- Rate limit public endpoints (Cloudflare rate limiting or KV counters).
- File uploads: validate MIME + size, sanitize filenames, store in R2.
- Auth tokens: short-lived access + httpOnly secure cookies. Never localStorage.

## Performance

- Lazy load routes and heavy components. Only the current route's code ships to the client.
- TanStack Query: set `staleTime` per query type. Don't leave defaults.
- Debounce search inputs (300ms minimum).
- Virtualize lists over 100 items.
- No barrel exports (`index.ts` re-exporting everything). Import from specific modules.
- Cloudflare Workers: stay under 50ms CPU. No synchronous loops over large datasets — paginate or stream.

## Architecture pointers

Things you'd otherwise hunt for:

- **Register a new internal module**:
  1. Add to `MODULES` in `apps/internal/src/lib/modules.ts` (icon + hotkey + permission).
  2. Add a lazy import to `MODULE_COMPONENTS` in `apps/internal/src/components/shell/ModuleWindow.tsx`.
  3. If the module uses `SlidePanel`: extend `SlidePanelScope` in `apps/internal/src/components/shared/SlidePanel.tsx`, add `overlayCloseHandler` + `setOverlayCloseHandler` to the module's Zustand store, and add a branch in `ModuleWindow.handleClose` so the outer X dismisses slide panels first.
- **Add a locale namespace**: create `apps/<app>/src/locales/{en,ar}/<name>.json` and register in the `ns` array in `apps/<app>/src/lib/i18n.ts`.
- **Load a font**: add to `<link>` tags in `apps/<app>/src/routes/__root.tsx`. Never via CSS `@import` — Tailwind v4 compilation breaks the rule order.
- **Use a modal**: compose the shared `DispatchDialog` from `apps/internal/src/components/shared/DispatchDialog.tsx`. Don't inline `ModalOverlay` + `Modal` + `Dialog` — the chrome must stay consistent.

## When to ask

Stop and ask before implementing if:
- A word in my request maps to a business concept you haven't confirmed ("evaluate", "send", "review", "approve", etc.).
- You're about to put a control somewhere because that's where the data model happens to know about the entity, not because that's where the user will be standing when they press it.
- You're about to add an implicit side effect instead of a visible user action.
- You just deleted something and are about to re-add it in the next turn.
- You can't describe in one sentence who the user is and what moment of their day this action belongs to.

The codebase is not the spec — my workflow is.

## Build

Don't build after every edit. Run `bun run build` in the relevant app after a completed feature or when I ask. Constant builds are disruptive.

## Deploy

This monorepo deploys from GitHub. Cloudflare deploy secrets live in GitHub
Actions, so the normal production path is: commit the verified change, push to
GitHub, and let the workflow deploy. Do not try to bypass this with local
Wrangler/Infisical deploys unless I explicitly ask.

## Task hygiene

Every feature/edit that reshapes existing code gets a follow-up cleanup task in the same session — duplicated helpers, abandoned components, stale types, dead imports, unused mocks, old store keys get deleted now, not "later."

The final result must be: clean code, no duplication, no dead paths, best runtime performance for the chosen approach. "It works" is not done. "It works and nothing else is rotting because of it" is done.
