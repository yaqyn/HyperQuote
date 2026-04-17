# HyperQuote

B2B building materials platform for Egypt. Contractors submit once, receive
consolidated multi-supplier quotes via AI coordination.

Craftsmanship over speed. Built right once beats built fast twice.

## Apps

| App | Runtime | Language | Theme | Scope |
|-----|---------|----------|-------|-------|
| `apps/website` | TanStack Start on CF Workers | EN + AR | light + dark | Public marketing + product catalog |
| `apps/portal` | TanStack Start on CF Workers | EN + AR | light + dark | Customer account, orders, quotes |
| `apps/driver` | **Vite SPA + Capacitor** (NOT TanStack Start) | EN + AR | light + dark | Driver mobile app. Server functions don't work in Capacitor WebViews — call server via fetch. Shares `@hyperquote/*` packages. |
| `apps/internal` | TanStack Start on CF Workers | EN only | light + dark | Ops console — sales, procurement, warehouse, finance, dispatch, customer-service, admin |
| `apps/ceo` | TanStack Start on CF Workers | EN only | light + dark | Executive dashboard |

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

Defaults are in `~/.claude/CLAUDE.md`. This project's version pins and gotchas:

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

Forms:
- `useWatch()` never `watch()` — RHF `watch()` breaks on React 19.
- Use `standardSchemaResolver`, NOT `zodResolver` — `@hookform/resolvers` v5+ changed the API.

React Aria + motion:
- `isKeyboardDismissDisabled` on all Dialogs. Handle Escape via the hotkeys layer, not React Aria, so they don't both fire.
- Motion + Popover/Menu has an open race (issue #9158) — use CSS animations for Popover/Menu, reserve Motion for Modal and view transitions.
- Arrow-key global hotkeys: guard with `{ enabled: !isMenuOpen }` so ListBox/Menu navigation wins.

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

## Frontend conventions

- **i18n scope**: website, portal, driver — every user-facing string lives in `src/locales/{en,ar}/<namespace>.json` and is read via `useTranslation('<namespace>')`. Never hardcode EN or AR content in JSX. Internal + ceo are EN-only; inline EN strings are acceptable there.
- **RTL**: bilingual apps (website, portal, driver) must use logical properties (`margin-inline-start`, `padding-inline-end`, `border-inline-end`) — never `left`/`right`. Internal + ceo can use physical props.
- **Theming**: every app supports light + dark via `[data-theme="dark"]` on `<html>`. Test both; never ship a component that only works in one theme.
- **Primary palette**: white, black, blue `#2563EB`. Signal colors (amber `#D97706`, red `#B91C1C`, emerald) allowed for state indicators, not decoration.
- **Components**: React Aria primitives throughout. Don't override accessibility behavior.
- **Images**: always specify width/height or aspect-ratio to prevent layout shift. WebP/AVIF. `loading="lazy"` below the fold.
- **Forms**: validate on blur, not on change. Inline errors next to the field, not in toasts.
- **Animations**: respect `prefers-reduced-motion` — use Motion's `useReducedMotion()` guard.
- **Error boundaries**: wrap every route-level component. A crash must not white-screen the app.
- **Never** inject raw HTML strings into React — no `dangerouslySet…` escape hatch. JSX escaping handles XSS; don't bypass it.

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

## Fix all means fix ALL

When asked to fix, audit, polish, or walk through something, the scope is every issue found — must-haves, good-to-haves, nice-to-haves, all impact tiers. No silent triage. No "out of scope." If the fixing list gets long, keep fixing. Don't quietly drop items to look fast.

## Task hygiene

Every feature/edit that reshapes existing code gets a follow-up cleanup task in the same session — duplicated helpers, abandoned components, stale types, dead imports, unused mocks, old store keys get deleted now, not "later."

The final result must be: clean code, no duplication, no dead paths, best runtime performance for the chosen approach. "It works" is not done. "It works and nothing else is rotting because of it" is done.
