# Phase 32: Testing + Deployment

## Goal
Critical paths are covered by automated tests and all 5 apps deploy to production Cloudflare Workers.

## Dependencies
- Phase 27 (WhatsApp Integration)
- Phase 28 (Email + PDF Generation)
- Phase 29 (ETA E-Invoicing)
- Phase 30 (AI Pipeline)
- Phase 31 (Real-Time + Caching)

## Requirements

- **TEST-01**: Vitest browser mode tests for React Aria components (accessibility needs real browser)
- **TEST-02**: Playwright E2E for critical paths: auth -> quote request -> accept quote -> track order
- **TEST-03**: Arabic locale tests: RTL layout, Arabic-Indic numbers, unit translations, currency formatting
- **TEST-04**: Cloudflare Workers deployment: 5 workers (one per app), wrangler.jsonc configs, domain routing

## Success Criteria
1. Vitest browser mode tests pass for React Aria components (accessibility verified in real browser)
2. Playwright E2E completes: auth -> quote request -> accept quote -> track order
3. Arabic locale tests verify RTL layout, Arabic-Indic numbers, unit translations, and currency formatting
4. All 5 Workers deploy via wrangler with correct domain routing (website, portal, internal, ceo, driver API)
5. Dark mode testing: all screens render correctly in dark mode (contrast ratios, glass effects, status colors)
6. Mobile responsive testing: all portal and website screens verified at 375px, 768px, and 1024px breakpoints

## What to Build
From GSD.md: Vitest browser mode tests for critical paths, Playwright E2E for auth + quote + order flows, Cloudflare Workers deployment (5 workers), wrangler.jsonc configs, domain routing. Storybook stories for visual regression testing of shared UI components (GlassWindow, StatusBadge, DataTable, NumberDisplay, etc.).

## Spec References

### Testing Strategy (from GSD.md)

**Unit:** Vitest browser mode for React Aria components (accessibility testing needs real browser).
**Integration:** Server function tests with MSW mocking Supabase responses.

**MSW Handler Setup Guidance:**
- Intercept Supabase REST API calls (`https://<project>.supabase.co/rest/v1/*`)
- Mock RLS-filtered responses (return only rows the test user should see per tenant isolation)
- Mock auth endpoints (`/auth/v1/token`, `/auth/v1/user`)
- Use `http.get()`, `http.post()`, etc. from MSW to define handlers
- Create handler factories per entity (e.g., `mockOrdersHandler(orders[])`) for reuse across tests
- Remember: MSW does NOT work with `bun test` -- always use `bun run vitest`
**E2E:** Playwright for critical flows: login -> create quote request -> accept quote -> track order.
**Visual:** Storybook for shared UI components (GlassWindow, StatusBadge, etc.). Build stories for all shared design system components for visual regression testing. Storybook 10.3.3 requires `@tailwindcss/vite` in `viteFinal` config for Tailwind v4 support.
**Arabic:** Test every screen in Arabic locale -- verify RTL layout, Arabic-Indic numbers, unit translations.

### Testing Tools (from STACK-DECISION.md)

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.1.2 | Unit/component tests in browser mode |
| Playwright | 1.58.2 | E2E tests, keyboard testing, visual regression |
| Storybook | 10.3.3 | Component dev (needs `@tailwindcss/vite` in `viteFinal` for Tailwind v4) |
| MSW | 2.12.14 | API mocking. Works in Vitest browser mode. Does NOT work with `bun test` -- use `bun run vitest` |
| Lefthook | 2.1.4 | Git hooks (Go binary, parallel execution, native staged-file filtering) |
| Biome | 2.4.8 | Format + lint (15-25x faster than Prettier + ESLint combined) |
| ESLint | 10.1.0 | ONLY for `eslint-plugin-react-hooks` (React Compiler rules) |
| Turborepo | 2.8.21 | Monorepo task runner (parallel builds, task caching, composable config) |

### Lefthook Configuration

**Lefthook 2.1.4** -- Go binary, parallel execution, native staged-file filtering.

- **pre-commit:** Runs Biome format + lint on staged files only. Fast (<2s for typical commits).
- **pre-push:** Runs typecheck (`bun run typecheck` via Turborepo). Blocks push on type errors.
- Configuration in `lefthook.yml` at repo root.

### Biome / ESLint Configuration

- **Biome 2.4.8:** Primary formatter and linter. 15-25x faster than Prettier + ESLint combined. Handles JS/TS/JSON/CSS formatting and linting. Configuration in `.biome.json` at repo root.
- **ESLint 10.1.0:** ONLY for `eslint-plugin-react-hooks` (React Compiler rules). Does NOT handle formatting or general linting -- Biome does that. Configuration in `eslint.config.js` (flat config).
- Both configured in Phase 1 during project scaffolding.

### Turborepo Configuration

**turbo.json** pipeline defines: `build`, `dev`, `lint`, `typecheck`, `test` tasks.

- `--filter` flag for affected-only CI (only build/test packages that changed since last commit).
- Composable config (2.7+): each app/package can extend base turbo.json.
- `turbo devtools` for visual package/task graph during development.
- Remote caching via Vercel (free tier) or self-hosted for CI speed.

### Per-Phase Checklist (from GSD.md)

Every test should verify:
- [ ] Arabic-Indic numerals for all numbers in AR locale
- [ ] All units translated to Arabic in AR locale
- [ ] RTL layout (switch to Arabic and verify)
- [ ] Dark mode
- [ ] Mobile responsive

### CI/CD Pipeline (from RESEARCH.md)

**GitHub Actions + Turborepo.**

**GitHub Actions Workflow Structure:**

```yaml
# Outline of CI pipeline stages
jobs:
  typecheck:     # bun run typecheck (turbo --filter=[HEAD^1])
  lint:          # bun run lint (turbo --filter=[HEAD^1])
  unit-tests:    # bun run vitest (turbo --filter=[HEAD^1])
    needs: [typecheck, lint]
  e2e-tests:     # bun run playwright test
    needs: [unit-tests]
  deploy:        # wrangler deploy per app
    needs: [e2e-tests]
    if: github.ref == 'refs/heads/main'
```

**PR Validation:**
- Lint + typecheck + test (affected only via `--filter`)
- Supabase migration check
- Vitest browser tests

**Deploy Order (enforced via `needs`):**
1. Database migrations (`supabase db push`)
2. All 5 Workers (`wrangler deploy` per app)

**Environment Management:**
- Staging: Supabase persistent branch + Cloudflare `--env staging`
- Production: Main Supabase project + Cloudflare `--env production`
- PR Preview: Supabase ephemeral branches via `supabase branches create --experimental`, Cloudflare preview URLs via `wrangler deploy --env preview` (each PR gets isolated DB + preview Worker URL)

**Supabase Branch Management:**
- PR ephemeral branches: `supabase branches create` on PR open, `supabase branches delete` on PR close/merge (GitHub Actions step).
- Staging: persistent branch that mirrors production schema. Reset from production on demand.
- Production: main Supabase project. Migrations applied via `supabase db push` in deploy pipeline.

### 5 Workers Deployment (from RESEARCH.md + BACKEND.md)

| Worker | Domain | App Type | Framework |
|--------|--------|----------|-----------|
| website | hyperquote.net | SSG+SSR | TanStack Start |
| portal | portal.hyperquote.net | SSR | TanStack Start |
| internal | app.hyperquote.net | SPA | TanStack Start |
| ceo | ceo.hyperquote.net | SPA/PWA | TanStack Start |
| driver-api | driver.hyperquote.net | API only | Cloudflare Worker (driver app is Capacitor native, not served by Worker) |

### Vite Config for Cloudflare Workers (from STACK-DECISION.md)

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
    tanstackStart(), // src/ is default -- NEVER override with srcDirectory
    react(),         // Must come AFTER tanstackStart()
  ],
})
```

**Driver app:** Plain Vite config without `tanstackStart()` or `cloudflare()`. Builds as static SPA for Capacitor.

### wrangler.jsonc Structure

Each app has its own `wrangler.jsonc` in its app directory:

```jsonc
// apps/website/wrangler.jsonc
{
  "name": "hyperquote-website",
  "main": "@tanstack/react-start/server-entry",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "routes": [
    { "pattern": "hyperquote.net", "zone_name": "hyperquote.net" },
    { "pattern": "www.hyperquote.net", "zone_name": "hyperquote.net" }
  ],
  "bindings": {
    "hyperdrive": [
      { "binding": "HYPERDRIVE_CACHED", "id": "..." },
      { "binding": "HYPERDRIVE_UNCACHED", "id": "..." }
    ],
    "kv_namespaces": [
      { "binding": "KV", "id": "..." }
    ],
    "r2_buckets": [
      { "binding": "R2", "bucket_name": "hyperquote-files" }
    ],
    "ai": { "binding": "AI" },
    "queues": [
      { "binding": "NOTIFICATIONS_QUEUE", "queue_name": "notifications" }
    ]
  }
}
```

### Domain Routing

| Domain | Worker | Purpose |
|--------|--------|---------|
| hyperquote.net | website | Public website (SSG+SSR) |
| www.hyperquote.net | website | Redirect or serve same |
| portal.hyperquote.net | portal | Customer + Supplier portal |
| app.hyperquote.net | internal | Internal platform |
| ceo.hyperquote.net | ceo | CEO command center |
| driver.hyperquote.net | driver-api | Driver app API (Capacitor app calls this) |

### SSO Cookie Architecture

- External pool: cookie on `.hyperquote.net` domain, name `hq-external-session`
- Internal pool: cookie on `.hyperquote.net` domain, name `hq-internal-session`
- Cross-pool access impossible (separate cookie names, JWT claims, RLS policies)

### Infrastructure (from BACKEND.md)

| Component | Technology |
|-----------|-----------|
| Database | Supabase PostgreSQL 15+ |
| Auth | Supabase Auth + `@supabase/ssr` 0.9.0 |
| Realtime | Supabase Realtime |
| Edge Functions | Cloudflare Workers |
| Connection Pool | Cloudflare Hyperdrive (cached + uncached) |
| KV Store | Cloudflare KV |
| Object Storage | Cloudflare R2 |
| Job Queue | Cloudflare Queues |
| Cron | pg_cron (DB) + Cloudflare Cron Triggers |
| AI Gateway | Cloudflare AI Gateway |
| Offline Sync | PowerSync (Driver app only) |

### Shared Bindings Across Workers

All 5 Workers share the same Supabase project, Hyperdrive configs, KV namespace, R2 bucket, and AI Gateway. Each Worker has its own wrangler.jsonc referencing the shared binding IDs.

### Performance Tips (from GSD.md)

- Use `bun run` not `npx` -- 10x faster
- Use Turborepo `--filter` to build only what changed
- Use TanStack Router lazy imports for code splitting (100+ routes will be slow otherwise)
- Use Hyperdrive cached config for read queries, uncached for writes
- Pre-compute CEO metrics in materialized views, don't query raw tables
- Use `(SELECT auth.uid())` in RLS policies, not `auth.uid()` directly

## Business Rules

**E2E Critical Path:** The most important flow to test end-to-end:
1. Customer visits website
2. Opens login modal, enters phone, receives OTP via WhatsApp
3. Verifies OTP, creates account (4 fields)
4. Navigates to portal (SSO cookie)
5. Builds material list (search & add method)
6. Submits quote request
7. (Sales rep builds and sends quote -- internal platform)
8. Customer receives quote notification
9. Customer accepts quote
10. Order created, tracked through 5 stages
11. Invoice generated on delivery

**Arabic Locale Tests Must Verify:**
- RTL layout: all pages mirror correctly
- Arabic-Indic numerals: all numbers display correctly (٠١٢٣٤٥٦٧٨٩)
- Unit translations: kg -> كجم, ton -> طن, m2 -> م2
- Currency formatting: "ج.م" suffix in Arabic, "EGP" prefix in English
- Date formatting: locale-aware via `Intl.DateTimeFormat`
- Bilingual product names display correctly

## Non-Negotiable Rules

1. **`nodejs_compat` compatibility flag is REQUIRED** in every Worker's `wrangler.jsonc`. Without it, `@supabase/ssr` fails with `dynamic require of "stream"` error. This is the #1 deployment blocker -- verify FIRST.
2. **Cloudflare Workers, NOT Vercel/Netlify.** Deploy target is always Cloudflare Workers.
3. **`@cloudflare/vite-plugin`** in vite config.
4. **Bun, NOT npm/yarn/pnpm.** Use `bun run vitest`, not `npx vitest`.
5. **Plugin order in vite config:** cloudflare -> tailwindcss -> tanstackStart -> react.
6. **`@tailwindcss/vite`** REQUIRED -- without it, zero utility classes.
7. **Colors in `:root {}`, NEVER in `@theme`.**
8. **MSW does NOT work with `bun test`** -- use `bun run vitest` instead.
9. **Driver app has its own vite config** without `tanstackStart()` or `cloudflare()`.
10. **TanStack Start uses `src/` as default** -- NEVER override with `srcDirectory: 'app'`.

## Known Risks & Gotchas

1. **@supabase/ssr on Workers:** `dynamic require of "stream"` reported (#37592). Requires `nodejs_compat` flag. Tested in Phase 1 but verify in production deployment.
2. **100+ routes slow Vite dev:** Use `autoCodeSplitting: true` and TanStack Router lazy imports.
3. **Vite 8 incompatible with TanStack Start.** Stay on Vite 7.3.1. Do not upgrade.
4. **`ssr.tsx` obsolete.** Delete if present. TanStack Start uses default server entry.
5. **`cloudflare:workers` import in client builds (#6185).** Only use in server functions, not middleware.
6. **Storybook + Tailwind v4.** Needs `@tailwindcss/vite` in `viteFinal` config.
7. **Vitest browser mode required for React Aria.** Standard Vitest (jsdom/happy-dom) cannot test React Aria accessibility correctly. Must use browser mode.
8. **Playwright Arabic tests.** Set `locale: 'ar-EG'` and `direction: 'rtl'` in Playwright config. Verify visual layout with screenshots.
9. **Worker size limits.** Cloudflare Workers have a 10MB compressed limit (paid plan). Monitor bundle sizes per app.
10. **Secret management.** Use `wrangler secret put` for API keys. Never commit secrets to wrangler.jsonc.

### Bundle Size Monitoring

**Bundle analysis:** Use Vite's built-in route-aware bundle analysis (`vite-bundle-visualizer` or `rollup-plugin-visualizer`). Monitor compressed Worker size against the 10MB limit. Set up CI alert if any Worker approaches 8MB compressed. Track bundle size trends per PR to catch regressions early.

### Secret Enumeration

**Secrets per Worker** (set via `wrangler secret put`, never committed to code):

| Secret | Used By | Purpose |
|--------|---------|---------|
| `SUPABASE_URL` | All Workers | Supabase project URL |
| `SUPABASE_ANON_KEY` | All Workers | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | All Workers | Supabase service role key (server-side only) |
| `AI_GATEWAY_TOKEN` | All Workers | Cloudflare AI Gateway authentication |
| `RESEND_API_KEY` | All Workers | Email sending via Resend |
| `WHATSAPP_TOKEN` | WhatsApp Worker | WhatsApp Cloud API access token |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp Worker | WhatsApp webhook verification token |
| `ETA_CLIENT_ID` | ETA Worker | Egyptian Tax Authority OAuth2 client ID |
| `ETA_CLIENT_SECRET` | ETA Worker | Egyptian Tax Authority OAuth2 client secret |
| `HSM_KEY_ID` | ETA Worker | Hardware Security Module key identifier for digital signatures |

## Tips

- Start with deployment first -- get all 5 Workers deploying to staging before writing tests.
- Use Turborepo's `--filter` to build and deploy individual apps during development.
- For E2E tests, use Playwright's `test.describe.serial` for the critical path (steps depend on each other).
- Arabic locale tests: take screenshots with Playwright for visual regression. Compare RTL vs LTR layouts.
- Test the SSO cookie flow: login on website -> verify cookie set on `.hyperquote.net` -> navigate to portal -> verify session works.
- Use `wrangler dev` locally for each Worker. Configure different ports (3000 for website, 3001 for portal, etc.).
- GitHub Actions workflow: typecheck -> lint -> unit tests (Vitest) -> E2E (Playwright) -> deploy (wrangler).
- Monitor Worker analytics after deployment: CPU time, memory usage, error rate, latency.
