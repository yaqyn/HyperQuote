# Phase 23: CEO Command Center - Research

**Researched:** 2026-04-06
**Domain:** TanStack Start SPA/PWA, dual AI routing, cross-entity search, offline-first, zero-accent-color UI
**Confidence:** HIGH

## Summary

Phase 23 builds the CEO app (`apps/ceo/`) -- the most minimal app in the suite. A search-bar-only interface with zero accent colors, dual AI routing (Analytics + RAG), attention items from materialized views, approval flows, and PWA offline support. The CEO app shell already exists with TanStack Start + Cloudflare Workers scaffolding (package.json, vite.config.ts, wrangler.jsonc, basic routes).

The critical technical challenges are: (1) PWA service worker with TanStack Start -- `vite-plugin-pwa` is incompatible, requiring manual Workbox `injectManifest` as a post-build step; (2) dual AI routing via GLM classifier that transparently switches between analytics (pre-computed metrics + text-to-SQL) and RAG (pgvector embeddings); (3) search performance <100ms via Hyperdrive + `pg_trgm` + `tsvector` on the `search_index` table; (4) zero accent colors breaking the normal blue-for-interactive pattern used everywhere else.

**Primary recommendation:** Build in layers -- home screen + search first (core UX), then detail views (shared layout component), then AI chat (dual routing), then attention/approvals, then PWA/offline last. Use manual Workbox for service worker. All server functions use mock data following the portal pattern until Supabase wiring in integration phases.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- ZERO accent colors. No blue for interactive elements. Only semantic status colors (green, yellow, red).
- Emphasis through typography weight and contrast only. Inter 600 vs Inter 400. Black vs muted gray.
- Search bar IS the entire interface. Nothing else on home screen except lion + greeting + attention count.
- Geist Mono for ALL numbers.
- TanStack Start SPA/PWA. NOT Next.js.
- React Aria Components, NOT shadcn.
- Motion v12. Import from `motion/react`.
- `useWatch()`, NEVER `watch()`.
- Colors in `:root {}`, NEVER in `@theme`.
- ALL numbers -> Arabic-Indic numerals in Arabic context.
- PWA install prompt in settings only. Never auto-prompt.
- Mobile-first. Phone is primary device.
- vite-plugin-pwa incompatible with TanStack Start -- use manual Workbox.
- Board report PDF generation happens in Cloudflare Worker edge function, not client-side.
- Attention items threshold: 60 days for overdue (BACKEND.md value), 60-90 = warning, 90+ = critical.

### Claude's Discretion
- Service worker caching strategy details (app shell vs specific routes)
- IndexedDB schema for offline cache
- GLM classifier implementation approach for dual AI routing
- Search debounce and result grouping implementation
- Detail view shared component architecture
- Store structure (Zustand slices)

### Deferred Ideas (OUT OF SCOPE)
- Real AI model integration (Phase 30 -- use mocks with AG-UI protocol)
- Supabase Realtime subscriptions (Phase 31)
- WhatsApp/email delivery for digests (Phase 27)
- ETA e-invoicing integration (Phase 29)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CEO-01 | Home: search bar + lion watermark at 3-5% opacity. Zero accent colors. Nothing else. | LionMark component exists in @hyperquote/ui. Zero-color theme via CSS custom properties on `:root`. Typography-only emphasis pattern. |
| CEO-02 | Search: cross-entity results grouped by type (7 entity types) | Server function `searchEntities` with `search_index` table, `pg_trgm` + `tsvector` + GIN indexes. Debounce 150ms, top 3 per category. Mock data pattern from portal. |
| CEO-03 | AI chat: dual route -- Analytics AI + RAG AI | `@tanstack/ai-react` `useChat()` for streaming. Mock AG-UI protocol events (portal pattern). GLM classifier mock. Conversations stored in `ai_conversations` table. |
| CEO-04 | Attention items from `ceo_attention_items` materialized view | Server function `getCEOAttentionItems`. Materialized view refreshes every 5 min. Semantic status badges via StatusBadge component. |
| CEO-05 | Daily digest (7AM) + weekly insight (Sunday 8PM) | Server functions `getCEODigest` and `getCEOWeeklyInsight`. Read-only display. Generation via pg_cron (Phase 14 complete). WhatsApp/email delivery deferred to Phase 27. |
| CEO-06 | Approval flow: margin overrides, credit limits, write-offs | Server functions `approveAction`, `rejectAction`, `requestMoreInfo`. GlassElevated panel for approval detail. Offline: buttons HIDDEN not disabled. |
| CEO-07 | Detail views: 7 entity types with deep-link to internal app | Shared DetailView layout component. 7 entity-specific data sections. Deep links to `app.hyperquote.net/{module}/{entity}/{id}`. |
| CEO-08 | PWA + offline mode (read-only) | Manual Workbox `injectManifest` post-build. Service Worker + IndexedDB via `idb`. App shell caching. Read-only offline with "Last synced" indicator. |
</phase_requirements>

## Standard Stack

### Core (already in CEO app)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-start | ^1.167.12 | Framework | Already scaffolded in apps/ceo/ |
| React | ^19.2.4 | UI library | Project standard |
| Tailwind CSS | ^4.2.2 | Styling | Project standard, @tailwindcss/vite in vite.config.ts |
| Vite | ~7.3.1 | Build tool | Project standard, NOT Vite 8 |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-aria-components | ^1.16.0 | UI primitives | All interactive elements (SearchField, Button, Dialog, etc.) |
| motion | ^12.38.0 | Animation | Spring enter, tween exit. Import from `motion/react` |
| zustand | ^5.0.12 | UI state | Offline status, active view, search state |
| @tanstack/react-query | ^5.96.1 | Server state | All data fetching with staleTime per data type |
| @tanstack/ai-react | ^0.7.8 | AI chat | `useChat()` for streaming responses |
| @tanstack/ai | ^0.10.0 | AI types | StreamChunk types, AG-UI protocol |
| i18next | ^26.0.3 | i18n core | Arabic + English, type-safe keys |
| react-i18next | ^17.0.2 | React i18n | `useTranslation()` hook |
| lucide-react | ^1.7.0 | Icons | Back arrows, action icons, status icons |
| zod | ^4.3.6 | Validation | Search params, server function inputs |
| react-hook-form | ^7.72.0 | Forms | Compose/route overlay, approval notes |
| @hyperquote/ui | workspace:* | Shared components | LionMark, GlassElevated, StatusBadge, CurrencyDisplay, DateDisplay, Skeleton, EmptyState |
| @hyperquote/auth | workspace:* | Auth | Session, server client, guard |
| @hyperquote/i18n | workspace:* | i18n setup | Formatters, locale config |
| @hyperquote/types | workspace:* | Types | Shared entity types |
| @hyperquote/forms | workspace:* | Form helpers | standardSchemaResolver |
| fuse.js | ^7.1.0 | Fuzzy search | Client-side search filtering for settings |
| idb | ^8.0.3 | IndexedDB wrapper | Offline data cache (type-safe, promise-based) |
| workbox-precaching | ^7.4.0 | SW precaching | App shell precache manifest |
| workbox-routing | ^7.4.0 | SW routing | Route matching for cache strategies |
| workbox-strategies | ^7.4.0 | SW strategies | StaleWhileRevalidate, CacheFirst |
| workbox-expiration | ^7.4.0 | SW cache expiry | TTL for cached responses |
| workbox-cacheable-response | ^7.4.0 | SW response filter | Only cache 200 responses |
| workbox-build | ^7.4.0 | Build-time SW | `injectManifest` post-build step (devDependency) |
| pdf-lib | ^1.17.1 | PDF generation | Board report export (server-side in Worker) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual Workbox | vite-plugin-pwa | Incompatible with TanStack Start Vite environment API |
| Manual Workbox | Serwist (@serwist/vite 9.5.7) | Reports of similar compatibility issues with TanStack Start |
| idb | raw IndexedDB | idb is 1.2KB, type-safe, promise-based -- no reason to go raw |
| pdf-lib 1.17.1 | @cantoo/pdf-lib 2.6.5 | Maintained fork with fixes. Evaluate if 1.17.1 has issues with Arabic text. |

**Installation:**
```bash
bun add react-aria-components motion zustand @tanstack/react-query @tanstack/ai @tanstack/ai-react i18next react-i18next lucide-react zod react-hook-form fuse.js idb workbox-precaching workbox-routing workbox-strategies workbox-expiration workbox-cacheable-response pdf-lib
bun add -D workbox-build tailwindcss-react-aria-components
```

## Architecture Patterns

### Recommended Project Structure
```
apps/ceo/
  src/
    routes/
      __root.tsx          # HTML shell, providers, PWA meta
      _ceo.tsx            # Auth guard layout (beforeLoad)
      _ceo/
        index.tsx         # Home: search bar + lion
        search.tsx        # Search results (?q=)
        chat.tsx          # AI chat
        attention.tsx     # Attention items list
        digest.tsx        # Daily digest
        insight.tsx       # Weekly insight
        settings.tsx      # Settings panel
        entity/
          $type.$id.tsx   # Unified detail view (7 entity types)
        approval/
          $id.tsx         # Approval detail
    components/
      home/
        SearchBar.tsx     # Centered search with rotating hints
        GreetingText.tsx  # Time-aware greeting
        AttentionBadge.tsx
      search/
        SearchResults.tsx
        EntityGroup.tsx   # Grouped results by type
        SearchResultRow.tsx
      detail/
        DetailView.tsx    # Shared layout for all 7 types
        EmployeeDetail.tsx
        CustomerDetail.tsx
        OrderDetail.tsx
        InvoiceDetail.tsx
        SupplierDetail.tsx
        DeliveryDetail.tsx
        ProductDetail.tsx
      chat/
        ChatView.tsx
        ChatBubble.tsx    # RTL-aware alignment
        DataTable.tsx     # Geist Mono tables in AI responses
        SimpleBarChart.tsx # SVG bar charts (no library)
        CitationLink.tsx
      approval/
        ApprovalDetail.tsx
        ApprovalActions.tsx
      compose/
        ComposeOverlay.tsx # GlassElevated panel
      shared/
        OfflineIndicator.tsx
        SyncTimestamp.tsx  # "Last synced" Geist Mono display
    lib/
      server/
        search.ts         # searchEntities server fn
        entity.ts         # getEntityDetail server fn
        attention.ts      # getCEOAttentionItems server fn
        digest.ts         # getCEODigest, getCEOWeeklyInsight
        approval.ts       # approveAction, rejectAction, requestMoreInfo
        chat.ts           # askCEOAI server fn (mock AG-UI)
        compose.ts        # routeMessage server fn
        report.ts         # exportBoardReportPDF server fn
      auth.ts             # CEO-specific auth (biometric/PIN/OTP)
      env.ts              # Environment variables
      i18n.ts             # i18n init with ceo namespace
      offline.ts          # IndexedDB helpers via idb
    stores/
      ceo.ts              # Zustand: offline status, search state
    hooks/
      useOnlineStatus.ts  # Navigator.onLine + event listeners
      useShortcut.ts      # Keyboard shortcuts (copy from portal)
    types/
      entity.ts           # 7 entity type interfaces
      attention.ts
      approval.ts
      chat.ts
    styles.css            # Tailwind imports + CEO-specific tokens
    sw.ts                 # Service worker source (Workbox injectManifest)
  public/
    manifest.json         # PWA manifest
    icons/                # PWA icons (192x192, 512x512)
  scripts/
    build-sw.ts           # Post-build Workbox injectManifest script
```

### Pattern 1: Zero-Accent-Color Theme
**What:** CEO app overrides the normal three-color system. No blue (`#2563EB`) for interactive elements. Only white, black, gray spectrum + semantic status colors for data.
**When to use:** Every interactive element in the CEO app.
**Example:**
```css
/* apps/ceo/src/styles.css */
@import 'tailwindcss';
@plugin 'tailwindcss-react-aria-components';

:root {
  --color-bg: #ffffff;
  --color-text: #0f172a;
  --color-text-muted: #6b7280;
  --color-text-subtle: #9ca3af;
  --color-border: #e5e7eb;
  --color-surface: #f9fafb;
  /* NO --color-primary / --color-accent -- intentionally absent */
  /* Semantic status colors for DATA only */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
}

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root:where([data-theme="dark"]) {
  --color-bg: #09090b;
  --color-text: #fafafa;
  --color-text-muted: #a1a1aa;
  --color-text-subtle: #71717a;
  --color-border: #27272a;
  --color-surface: #18181b;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

### Pattern 2: Shared DetailView Layout
**What:** All 7 entity types share the same layout structure. Entity-specific content is injected via children/props.
**When to use:** Every entity detail screen.
**Example:**
```typescript
// Shared layout
interface DetailViewProps {
  title: string;           // Inter 600, text-xl
  subtitle: string;        // Inter 400, text-base, muted
  onBack: () => void;
  deepLinkUrl?: string;
  deepLinkLabel?: string;
  actions?: ReactNode;     // Route/call buttons
  children: ReactNode;     // Entity-specific data sections
}

function DetailView({ title, subtitle, onBack, deepLinkUrl, deepLinkLabel, actions, children }: DetailViewProps) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={onBack} className="mb-4">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="font-semibold text-xl text-[var(--color-text)]">{title}</h1>
      <p className="text-base text-[var(--color-text-muted)]">{subtitle}</p>
      <div className="mt-6 space-y-6">{children}</div>
      {actions && <div className="mt-6 flex gap-6">{actions}</div>}
      {deepLinkUrl && (
        <a href={deepLinkUrl} className="mt-4 block text-[var(--color-text-muted)]">
          {deepLinkLabel} &rarr;
        </a>
      )}
    </div>
  );
}
```

### Pattern 3: Manual Workbox Service Worker
**What:** Post-build step generates service worker since vite-plugin-pwa is incompatible with TanStack Start's Vite environment API.
**When to use:** PWA offline support.
**Example:**
```typescript
// apps/ceo/scripts/build-sw.ts
import { injectManifest } from 'workbox-build';

async function buildSW() {
  const { count, size } = await injectManifest({
    swSrc: 'src/sw.ts',
    swDest: 'dist/client/sw.js',
    globDirectory: 'dist/client',
    globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  });
  console.log(`Generated SW: ${count} files, ${(size / 1024).toFixed(1)}KB`);
}

buildSW();
```

```typescript
// apps/ceo/src/sw.ts (service worker source)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Precache app shell (injected by workbox-build)
precacheAndRoute(self.__WB_MANIFEST);

// API responses: stale-while-revalidate with 30min TTL
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 30 * 60 }),
    ],
  })
);

// Fonts: cache-first (immutable)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);
```

### Pattern 4: Search-to-AI Transition
**What:** User types in search bar -> results stream below -> pressing Enter/Send transitions to AI chat with query preserved.
**When to use:** The core UX flow of the CEO app.
**Example:**
```typescript
// Search bar slides up on type, lion fades out
// URL: /search?q={query} with Zod-validated search params
import { z } from 'zod';

const searchParams = z.object({
  q: z.string().optional(),
});

// In route definition:
export const Route = createFileRoute('/_ceo/search')({
  validateSearch: searchParams,
  // ...
});

// Transition to AI: navigate to /chat?q={query}
// Preserve search state for back navigation
```

### Anti-Patterns to Avoid
- **Using blue for interactive elements:** CEO app has ZERO accent colors. Even links use text weight (Inter 500) not color.
- **Dashboard cards or metrics on home:** Home is search bar + lion + greeting ONLY. Attention count is text, not a card.
- **vite-plugin-pwa:** Incompatible with TanStack Start. Will silently fail to generate SW in production builds.
- **Disabling buttons when offline:** HIDE mutation buttons entirely. "Disabled" implies "will work later" -- it won't.
- **Chart libraries for AI responses:** Use simple SVG bar charts. Black/gray only. No charting library needed.
- **Settings gear icon:** Settings accessed via search ("settings") or AI only. No visible icon anywhere.
- **AnimatePresence on Popover/Menu:** Use CSS transitions per React Aria gotcha. Motion for panels/modals only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB access | Raw IndexedDB API | `idb` (8.0.3) | Type-safe, promise-based, 1.2KB. Raw API is callback hell. |
| Service worker | Custom fetch interceptor | Workbox 7.4.0 | Precaching, routing, strategies, cache expiry all solved |
| PDF generation | Canvas-to-PDF or HTML-to-PDF | `pdf-lib` 1.17.1 | Programmatic PDF creation, works in Workers (no DOM needed) |
| Fuzzy search (client) | Custom string matching | `fuse.js` 7.1.0 | Weighted, threshold-tuned, handles Arabic |
| Number formatting | Manual Arabic-Indic conversion | `Intl.NumberFormat('ar-EG')` | Handles all edge cases, locale-aware |
| SW registration | Manual `navigator.serviceWorker.register` | Consider `workbox-window` 7.4.0 | Update detection, lifecycle events |
| RTL layout | Manual direction flipping | Tailwind logical properties (`ps-`, `pe-`, `ms-`, `me-`) | Works with dynamic locale switching |

**Key insight:** The CEO app is deceptively simple-looking but has complex offline, AI routing, and cross-entity search under the hood. Every "simple" feature (search, offline, AI) has well-tested libraries that handle edge cases.

## Common Pitfalls

### Pitfall 1: vite-plugin-pwa Silent Failure
**What goes wrong:** Plugin appears to work in dev but produces no service worker in production builds.
**Why it happens:** vite-plugin-pwa lacks support for Vite 6+ environment API used by TanStack Start. Build hooks don't fire for SSR environments.
**How to avoid:** Use manual Workbox `injectManifest` as a post-build script. Add to package.json: `"build": "vite build && bun run scripts/build-sw.ts"`.
**Warning signs:** No `sw.js` in `dist/client/` after build.

### Pitfall 2: Blue Accent Colors Leaking In
**What goes wrong:** Shared components (StatusBadge, links) render with blue accent from other apps.
**Why it happens:** Shared UI components may reference `--color-primary` or use hardcoded blue.
**How to avoid:** CEO styles.css must NOT define `--color-primary`. Override any shared component that uses it. Interactive elements use `font-semibold text-[var(--color-text)]` instead.
**Warning signs:** Any `#2563EB` or `text-blue-*` or `bg-blue-*` appearing in the CEO app.

### Pitfall 3: Search Performance Miss
**What goes wrong:** Search takes >100ms, feels sluggish for CEO.
**Why it happens:** Missing Hyperdrive connection pooling, missing indexes, or N+1 queries across entity types.
**How to avoid:** Single `search_index` table query with `pg_trgm` + `tsvector` + GIN indexes. Hyperdrive for connection pooling. 150ms debounce on client. Return grouped results in one response.
**Warning signs:** TTFB >50ms on search endpoint.

### Pitfall 4: Offline Mutation Buttons Visible
**What goes wrong:** User taps "Approve" while offline, gets error.
**Why it happens:** Buttons rendered but disabled instead of hidden.
**How to avoid:** `useOnlineStatus()` hook. Mutation buttons: `{isOnline && <ApproveButton />}`. NEVER use `disabled` prop for offline state.
**Warning signs:** Any `disabled` attribute on approval/compose/route buttons.

### Pitfall 5: Service Worker Caching SSR HTML
**What goes wrong:** Service worker caches server-rendered HTML with stale data, user sees outdated info even when online.
**Why it happens:** NetworkFirst strategy not applied to navigation requests.
**How to avoid:** Navigation requests use NetworkFirst with 3s timeout fallback to cache. Only API responses use StaleWhileRevalidate.
**Warning signs:** Old data showing after reconnecting to network.

### Pitfall 6: AI Chat RTL Alignment
**What goes wrong:** User messages appear on wrong side in Arabic context.
**Why it happens:** Hard-coded `text-align: right` for user messages instead of logical `text-align: end`.
**How to avoid:** User messages: `text-end`, aligned to `end`. AI messages: `text-start`, aligned to `start`. Works for both LTR and RTL.
**Warning signs:** Messages on same side in Arabic mode.

### Pitfall 7: Date.now() in Render for Greeting
**What goes wrong:** Hydration mismatch -- server renders "Good morning" but client calculates different time.
**Why it happens:** `Date.now()` in render returns different value on server vs client.
**How to avoid:** Calculate greeting time-of-day in the route `loader` (server-side) and pass as route context. OR use `ClientOnly` wrapper.
**Warning signs:** Hydration warnings about greeting text mismatch.

## Code Examples

### CEO Auth Guard Pattern
```typescript
// apps/ceo/src/routes/_ceo.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { checkCEOAuth } from '../lib/auth';

export const Route = createFileRoute('/_ceo')({
  beforeLoad: async ({ location }) => {
    const auth = await checkCEOAuth();
    if (!auth || !auth.roles.includes('ceo')) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { auth };
  },
  component: CEOLayout,
});

function CEOLayout() {
  return (
    <div className="h-dvh w-full overflow-hidden bg-[var(--color-bg)]">
      <Outlet />
    </div>
  );
}
```

### Home Screen Pattern
```typescript
// apps/ceo/src/routes/_ceo/index.tsx
// Full viewport. Pure white/black. Lion + greeting + search bar + attention count.
function HomeScreen() {
  const { t } = useTranslation('ceo');
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Greeting from loader context (avoids hydration mismatch)
  const greeting = Route.useLoaderData(); // { timeOfDay: 'morning' | 'afternoon' | 'evening' }

  return (
    <div className="relative flex flex-col items-center justify-center h-dvh px-4">
      {/* Lion watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <LionMark className="w-64 h-64 opacity-[0.04]" />
      </div>

      {/* Greeting */}
      <p className="font-semibold text-xl text-[var(--color-text)] mb-8">
        {t(`greeting.${greeting.timeOfDay}`, { name: auth.name })}
      </p>

      {/* Search bar */}
      <SearchField
        className="w-[90%] max-w-[600px]"
        value={query}
        onChange={setQuery}
        onSubmit={() => navigate({ to: '/search', search: { q: query } })}
        aria-label={t('search.label')}
      >
        <Input
          className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base"
          placeholder={t('search.placeholder')}
        />
      </SearchField>

      {/* Attention count (conditional) */}
      {attentionCount > 0 && (
        <button
          onClick={() => navigate({ to: '/attention' })}
          className="mt-4 text-sm text-[var(--color-text-muted)]"
        >
          <span className="font-mono text-[var(--color-error)]">{attentionCount}</span>
          {' '}{t('attention.itemsNeedAttention')}
        </button>
      )}
    </div>
  );
}
```

### Mock Server Function Pattern
```typescript
// apps/ceo/src/lib/server/search.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const searchInput = z.object({
  query: z.string().min(1).max(200),
  entityTypes: z.array(z.enum([
    'employee', 'customer', 'order', 'product', 'invoice', 'supplier', 'delivery'
  ])).optional(),
  limit: z.number().min(1).max(50).default(21), // 3 per 7 categories
});

export const searchEntities = createServerFn({ method: 'GET' })
  .validator(searchInput) // NOTE: use .validator() for server fns, .inputValidator() for forms
  .handler(async ({ data: input }) => {
    // Mock data until Supabase integration
    return getMockSearchResults(input.query, input.entityTypes, input.limit);
  });
```

### Offline IndexedDB Cache Pattern
```typescript
// apps/ceo/src/lib/offline.ts
import { openDB, type DBSchema } from 'idb';

interface CEOOfflineDB extends DBSchema {
  digest: { key: string; value: { date: string; data: unknown; syncedAt: number } };
  insight: { key: string; value: { weekOf: string; data: unknown; syncedAt: number } };
  attention: { key: 'current'; value: { items: unknown[]; syncedAt: number } };
  entities: { key: string; value: { type: string; id: string; data: unknown; syncedAt: number }; indexes: { 'by-type': string } };
  searches: { key: string; value: { query: string; results: unknown; syncedAt: number } };
}

export async function getOfflineDB() {
  return openDB<CEOOfflineDB>('ceo-offline', 1, {
    upgrade(db) {
      db.createObjectStore('digest');
      db.createObjectStore('insight');
      db.createObjectStore('attention');
      const entities = db.createObjectStore('entities');
      entities.createIndex('by-type', 'type');
      db.createObjectStore('searches');
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vite-plugin-pwa for PWA | Manual Workbox injectManifest | 2025 (TanStack Start + Vite 6 env API) | Must use post-build script |
| framer-motion | motion (import from `motion/react`) | 2024 (v11+) | Same API, new import path |
| pdf-lib 1.17.1 (unmaintained) | @cantoo/pdf-lib 2.6.5 (maintained fork) | 2024+ | Consider if pdf-lib has Arabic text issues |
| @tanstack/start | @tanstack/react-start | 2025 (v1.120+) | Old package frozen, must use react-start |
| zodResolver | standardSchemaResolver | 2025 (RHF 7.70+) | Zod 4 native standard schema support |

## Open Questions

1. **Arabic text in pdf-lib for board reports**
   - What we know: pdf-lib 1.17.1 supports custom font embedding. Arabic is RTL and requires shaping.
   - What's unclear: Whether pdf-lib handles Arabic text shaping (ligatures, contextual forms) correctly.
   - Recommendation: Test with Arabic text early. If broken, evaluate @cantoo/pdf-lib 2.6.5 or generate PDF server-side with a different approach.

2. **pg_trgm Arabic tokenization**
   - What we know: `pg_trgm` creates trigrams from text. Arabic has different character joining rules.
   - What's unclear: Whether default PostgreSQL locale handles Arabic trigrams correctly for fuzzy search.
   - Recommendation: Use `tsvector` as primary search (full-text), `pg_trgm` as secondary (fuzzy). Test Arabic search early.

3. **Workbox + TanStack Start server functions**
   - What we know: TanStack Start server functions use POST to `/_server` routes.
   - What's unclear: Whether service worker intercepts server function calls correctly.
   - Recommendation: Exclude `/_server` routes from SW caching. Only cache explicit API GET endpoints.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package manager | Needs check | -- | npm (not preferred) |
| Vite | Build tool | Already in project | ~7.3.1 | -- |
| wrangler | CF Workers deploy | Already in project | ^4.77.0 | -- |
| PostgreSQL (Supabase) | search_index, materialized views | Remote (Supabase) | -- | Mock data for dev |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | apps/ceo/vitest.config.ts (Wave 0 -- create) |
| Quick run command | `bun run --filter @hyperquote/ceo test` |
| Full suite command | `bun run --filter @hyperquote/ceo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CEO-01 | Home screen renders search bar + lion, no accent colors | unit | `vitest run src/__tests__/home.test.tsx` | Wave 0 |
| CEO-02 | Search groups results by entity type | unit | `vitest run src/__tests__/search.test.tsx` | Wave 0 |
| CEO-03 | AI chat mock returns streamed response | unit | `vitest run src/__tests__/chat.test.tsx` | Wave 0 |
| CEO-04 | Attention items render with semantic badges | unit | `vitest run src/__tests__/attention.test.tsx` | Wave 0 |
| CEO-05 | Digest/insight render read-only content | unit | `vitest run src/__tests__/digest.test.tsx` | Wave 0 |
| CEO-06 | Approval actions call correct server functions | unit | `vitest run src/__tests__/approval.test.tsx` | Wave 0 |
| CEO-07 | Detail view renders correct entity data | unit | `vitest run src/__tests__/detail.test.tsx` | Wave 0 |
| CEO-08 | Offline indicator shows/hides, mutation buttons hidden offline | unit | `vitest run src/__tests__/offline.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run --filter @hyperquote/ceo test`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/ceo/vitest.config.ts` -- test framework config
- [ ] `apps/ceo/src/__tests__/` -- test directory and files for all 8 requirements

## Sources

### Primary (HIGH confidence)
- Project codebase: `apps/ceo/`, `apps/portal/`, `packages/ui/` -- existing patterns and scaffolding
- 23-CONTEXT.md -- detailed spec from FRONTEND.md and BACKEND.md

### Secondary (MEDIUM confidence)
- [TanStack/router#4988](https://github.com/TanStack/router/issues/4988) -- vite-plugin-pwa incompatibility confirmed
- [TanStack/router#4770](https://github.com/TanStack/router/discussions/4770) -- PWA discussion and workarounds
- npm registry -- all package versions verified via `npm view`

### Tertiary (LOW confidence)
- [robelest.com PWA guide](https://robelest.com/journal/pwa-tanstack-start) -- post-build Workbox approach (403'd, referenced in search results)
- [kulterryan/tanstack-start-pwa](https://github.com/kulterryan/tanstack-start-pwa) -- starter template reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified against npm registry, project already uses most of them
- Architecture: HIGH -- follows established portal/website patterns in the monorepo
- PWA/Offline: MEDIUM -- Workbox manual approach is well-documented but untested with this specific TanStack Start + CF Workers setup
- AI dual routing: MEDIUM -- mock-first approach defers real complexity to Phase 30
- Pitfalls: HIGH -- based on project history (14 phases of accumulated decisions) and verified issues

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable stack, 30-day validity)
