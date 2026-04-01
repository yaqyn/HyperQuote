# HyperQuote v3.0 — Frontend Stack Decision

**Decided:** 2026-03-26. **Audited:** 2026-03-28 (5 parallel deep audits, every version verified against npm registry).
**Principle:** Best of best. No sacred cows. Every layer challenged.

---

## Core Stack

| Layer | Package | Version | Status |
|-------|---------|---------|--------|
| **Language** | TypeScript | 6.0.2 | Stable (released 2026-03-23) |
| **UI Library** | React | 19.2.4 | Stable |
| **Build Tool** | Vite | 7.3.1 | Stable. Vite 8 exists but TanStack Start has unresolved issues with it — stay on 7. |
| **Framework** | TanStack Start (`@tanstack/react-start`) | 1.167.12 | Stable (v1). NOT `@tanstack/start` (frozen at 1.120.20). |
| **Styling** | Tailwind CSS | 4.2.2 | Stable |
| **UI Primitives** | React Aria Components | 1.16.0 | Stable. v3 nightly exists — stay on 1.x. |
| **Animation** | Motion (formerly Framer Motion) | 12.38.0 | Stable |
| **Icons** | lucide-react | 1.7.0 | Stable. Tree-shaken, ~200-300 bytes/icon. |

## State Management

| Concern | Package | Version | Notes |
|---------|---------|---------|-------|
| **UI state** (panels, sidebar, theme) | Zustand | 5.0.12 | Slices + persist middleware to sessionStorage. `skipHydration: true` for SSR |
| **State machines** (keyboard scope) | @xstate/store | 3.17.1 | Canvas→Panel→Input transitions. <1KB gzipped |
| **URL state** (filters, active entity) | TanStack Router search params | Built-in | Type-safe with Zod `validateSearch` |
| **Server state** (API data) | TanStack Query | 5.95.2 | SSR via `@tanstack/react-router-ssr-query`. `maxPages` for infinite scroll |
| **SSR hydration** | @tanstack/react-router-ssr-query | 1.166.10 | Automatic dehydrate/hydrate/streaming. Replaces manual config |
| **Form state** | React Hook Form | 7.72.0 | Zod via `@hookform/resolvers` 5.2.2. Use `standardSchemaResolver`, NOT `zodResolver` |

## Interaction Layer

| Concern | Package | Version | Notes |
|---------|---------|---------|-------|
| **Keyboard shortcuts** | @tanstack/react-hotkeys | 0.8.3 | Pre-alpha — wrapped behind thin `useShortcut()` abstraction. Swappable to `react-hotkeys-hook` if unstable |
| **Command palette** | Custom React Aria | — | Built from `Autocomplete` + `Dialog` + `Menu`. ~200 lines. Zero Radix conflicts |
| **Fuzzy search** | fuse.js | 7.1.0 | Plugs into React Aria Autocomplete's custom filter |

## Internationalization

| Concern | Package | Version | Notes |
|---------|---------|---------|-------|
| **App strings** | react-i18next | 17.0.0 | Type-safe keys via `resources.d.ts`. 6 Arabic plural forms |
| **Core** | i18next | 25.10.10 | Required by react-i18next 17 |
| **Component i18n** | React Aria I18nProvider | Built-in | 38 locales, Arabic-Indic numerals, Islamic calendar, RTL keyboard nav |
| **RTL** | Tailwind v4 logical properties | Built-in | `ps-*/pe-*/ms-*/me-*`. No plugin needed |

## AI

| Concern | Package | Version | Notes |
|---------|---------|---------|-------|
| **AI SDK** | @tanstack/ai | 0.9.1 | 0.x — wrap behind abstraction. Native TanStack Start integration |
| **React hooks** | @tanstack/ai-react | 0.7.5 | 0.x — `useChat()` for streaming. AbortController cancellation |
| **Cloudflare adapter** | @cloudflare/tanstack-ai | 0.1.6 | 0.x — first-party Workers AI + AI Gateway support |
| **Embeddings** | Workers AI bge-m3 | — | Already implemented, multilingual Arabic+English |

## Domain-Specific (Phase 17+)

| Concern | Package | Version | Notes |
|---------|---------|---------|-------|
| **Maps** | maplibre-gl + react-map-gl | 5.21 + 8.1 | Import via `react-map-gl/maplibre`. Arabic labels via MapTiler. **CLIENT ONLY — needs `ClientOnly` wrapper for SSR** |
| **Offline tiles** | pmtiles | 4.4.0 | Driver offline tiles (Protomaps). Cairo ~200-400MB vector |
| **Driver GPS** | @transistorsoft/capacitor-background-geolocation | 9.0.2 | Requires Capacitor 8. Background GPS, geofencing, offline buffering. $399 Starter license |

## Infrastructure

| Concern | Package | Notes |
|---------|---------|-------|
| **Runtime** | Bun (package manager + scripts) + Vite 7 (dev/build) | `bun run dev` → Vite dev server |
| **Deploy** | Cloudflare Workers | Native TanStack Start support. `main: "@tanstack/react-start/server-entry"` in wrangler.jsonc |
| **Auth** | Supabase Auth via `@supabase/ssr` 0.9.0 | `beforeLoad` pattern for zero-flash SSR auth |
| **Realtime** | Supabase Realtime | Invalidates TanStack Query cache, never writes directly |
| **Database** | PostgreSQL (Supabase) | 179 migrations, frozen at v2.0 |
| **Storage** | Cloudflare R2 + Supabase Storage | R2 for public assets, Supabase for authenticated files |
| **Monorepo** | Bun workspaces + Turborepo 2.8.21 | Fast installs + task caching/parallelization |
| **Driver App** | Vite + React SPA + Capacitor | NOT TanStack Start. Server functions don't work in Capacitor WebViews. Shares @hyperquote packages. |

## Developer Experience

| Concern | Package | Version | Notes |
|---------|---------|---------|-------|
| **Unit/component tests** | Vitest (browser mode) | 4.1.2 | Real browser, critical for React Aria accessibility testing |
| **E2E tests** | Playwright | 1.58.2 | Keyboard testing, visual regression |
| **Component dev** | Storybook + Vitest addon | 10.3.3 | Needs `@tailwindcss/vite` in `viteFinal` config for Tailwind v4 |
| **API mocking** | MSW | 2.12.14 | Works in Vitest browser mode. Does NOT work with `bun test` — use `bun run vitest` |
| **Formatting + linting** | Biome + ESLint (hooks only) | 2.4.8 / 10.1.0 | Biome 15-25x faster. ESLint for `eslint-plugin-react-hooks` (React Compiler rules) |
| **Git hooks** | Lefthook | 2.1.4 | Go binary, parallel, native staged-file filtering |
| **Bundle analysis** | Vite built-in | — | Route-aware, import chain visualization |
| **Type generation** | `supabase gen types typescript` | — | Already integrated |

## Tailwind v4 Configuration

CSS-first via `@theme` directive (no `tailwind.config.js`). Unified token file: `essential/brand/colors/tokens.css`.

**Critical rules** (also enforced in CLAUDE.md and `.claude/rules/frontend-rules.md`):
- `@tailwindcss/vite` REQUIRED in vite.config.ts — without it, zero utility classes
- Colors in `:root {}`, NEVER in `@theme` — `--color-base` in `@theme` makes `text-base` set color instead of font-size
- Dark mode: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` — not Tailwind `dark:` prefix
- React Aria plugin: `@plugin 'tailwindcss-react-aria-components'` — NOT `@import`
- RTL: built-in logical properties `ps-*/pe-*/ms-*/me-*`
- Glass: 2-tier per `essential/brand/UI-VISION.md` — Window (main panels) + Elevated (modals, command palette)

## Known Integration Issues & Mitigations

| Issue | Severity | Mitigation |
|-------|----------|------------|
| **Vite 8 not ready for TanStack Start** | Critical | Stay on Vite 7. TanStack Start reports "not responding" on Vite 8. Monitor for official support |
| **React Aria I18nProvider SSR hydration bug** (#7474) | Critical | `useDefaultLocale()` causes blank page flash in TanStack Start SSR. Pass locale explicitly to `I18nProvider` or wrap in `ClientOnly` until fix lands |
| **Tailwind v4 `@theme` color collision** | Critical | `--color-*` in `@theme` collides with built-in utilities. Keep colors in `:root {}` |
| **TanStack Start vinxi removal** (v1.121.0+) | Critical | `vinxi` removed. Use `vite dev`/`vite build`. Only `@tanstack/react-start` needed |
| **React Hook Form `watch()` broken** with React 19 | High | `watch()` unreliable with React Compiler. Use `useWatch()` everywhere. Never `watch()` |
| **Escape key**: React Aria Dialog + hotkeys both fire | High | Use `isKeyboardDismissDisabled` on Dialog, handle Escape via hotkeys only |
| **Server function `.validator()` renamed** | High | Both `.validator()` and `.inputValidator()` exist. Prefer `.inputValidator()` with Zod |
| **Router export renamed** | High | Export `getRouter()` which internally calls `createRouter()`. `StartClient` takes no props |
| **Motion Popover race condition** (#9158) | Medium | Still open. CSS animations for Popover/Menu, Motion for Modal only |
| **Arrow keys**: ListBox/Menu + global hotkeys | Medium | `{ enabled: !isMenuOpen }` on arrow key hotkeys |
| **`cloudflare:workers`** import in client builds (#6185) | Medium | Only use in server functions, not middleware |
| **@supabase/ssr on Workers** (#37592) | Medium | `dynamic require of "stream"` reported. Test early in Phase 1 |
| **tailwindcss-react-aria-components group modifiers** (#15401) | Medium | `group-selected:` may break with Tailwind v4. Fallback: `group-data-[selected]:` |
| **Zustand SSR hydration mismatch** | Low | `skipHydration: true` + `rehydrate()` in `useEffect` |
| **100+ routes slow Vite dev** | Low | TanStack Router lazy imports, code-split route tree |
| **`ssr.tsx` obsolete** | Low | Delete `ssr.tsx`. TanStack Start uses default server entry |
| **MapLibre v5 breaking changes** | Deferred | Update at Phase 17. New `canvasContextAttributes`, `on()` returns Subscription |
| **Capacitor BG Geolocation v9** | Deferred | Update at Phase 17. Requires Capacitor 8. License key regeneration may be needed |

## TanStack Ecosystem

Five packages from one team, designed to work together:

```
TanStack Start     — framework (pure Vite 7, NO vinxi)
TanStack Router    — routing + URL state (Zod-validated search params)
TanStack Query     — server state (cache, optimistic updates, SSR hydration)
TanStack AI        — AI streaming (SSE, tool calling, AbortController) — 0.x alpha
TanStack Hotkeys   — keyboard shortcuts (smart input detection) — 0.x pre-alpha
```

### TanStack Start Entry Points (v1.121.0+)

**Source directory:** `src/` is the default. NEVER override with `srcDirectory: 'app'`.

| File | Purpose | Required? |
|------|---------|-----------|
| `router.tsx` | Exports `getRouter()` (internally calls `createRouter`) | Yes |
| `client.tsx` | `<StrictMode><StartClient /></StrictMode>` (no props) | Optional (has default) |
| `server.ts` | Custom server entry (fetch handler) | Optional (has default) |
| `routeTree.gen.ts` | Auto-generated by TanStack Router | Auto |
| `routes/__root.tsx` | Root route with `<HeadContent />` + `<Scripts />` | Yes |

### Vite Config (Cloudflare Workers)

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
    tanstackStart(), // src/ is the default — NEVER override with srcDirectory
    react(),         // Must come AFTER tanstackStart()
  ],
})
```

## Dependency Reference (bun add)

**CRITICAL:** `vinxi` and `@tanstack/start` are REMOVED since v1.121.0. Do NOT install them.

```json
{
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@tanstack/react-start": "^1.167.12",
    "@tanstack/react-router": "^1.168.0",
    "@tanstack/react-query": "^5.95.2",
    "@tanstack/react-router-ssr-query": "^1.166.10",
    "@tanstack/ai": "^0.9.1",
    "@tanstack/ai-react": "^0.7.5",
    "@tanstack/react-hotkeys": "^0.8.3",
    "@cloudflare/tanstack-ai": "^0.1.6",
    "@cloudflare/vite-plugin": "^1.30.2",
    "@tailwindcss/vite": "^4.2.2",
    "react-aria-components": "^1.16.0",
    "tailwindcss": "^4.2.2",
    "tailwindcss-react-aria-components": "^2.0.1",
    "tailwind-merge": "^3.5.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.7.0",
    "motion": "^12.38.0",
    "zustand": "^5.0.12",
    "@xstate/store": "^3.17.1",
    "react-hook-form": "^7.72.0",
    "@hookform/resolvers": "^5.2.2",
    "zod": "^3.24.0",
    "react-i18next": "^17.0.0",
    "i18next": "^25.10.10",
    "fuse.js": "^7.1.0",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.100.1",
    "maplibre-gl": "^5.21.0",
    "react-map-gl": "^8.1.0",
    "pmtiles": "^4.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.2.0",
    "vite": "^7.3.1",
    "typescript": "^6.0.2",
    "vitest": "^4.1.2",
    "@playwright/test": "^1.58.2",
    "storybook": "^10.3.3",
    "msw": "^2.12.14",
    "@biomejs/biome": "^2.4.8",
    "eslint": "^10.1.0",
    "eslint-plugin-react-hooks": "latest",
    "lefthook": "^2.1.4",
    "wrangler": "^4.77.0"
  }
}
```

---

*Audited: 2026-03-28. Design reference: `essential/brand/UI-VISION.md`. Brand tokens: `essential/brand/colors/tokens.css`.*
