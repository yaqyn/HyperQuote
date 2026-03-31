# Phase 5: Website Market + Product Detail - Research

**Researched:** 2026-03-31
**Domain:** SSR product catalog with filtering, search, pagination, product detail pages
**Confidence:** HIGH

## Summary

Phase 5 builds two SSR pages on the existing TanStack Start website: a Market catalog page (`/market`) and a Product Detail page (`/market/{product-slug}`). The foundation is solid -- Phase 4 established the `_website` layout route, i18n, RTL, and theme infrastructure. This phase adds the first server function that queries Supabase (`getPublicCatalog`), the first database migration for a domain table (`products`), and client-side fuzzy search with fuse.js.

The key technical challenges are: (1) creating the `products` table migration with seed data so the catalog has content to render, (2) implementing URL-synced filters with TanStack Router's `validateSearch` + Zod, (3) fuse.js client-side search with debouncing, (4) responsive filter sidebar that collapses to a bottom sheet on mobile using React Aria Modal, and (5) price range formatting with Arabic-Indic numerals via the existing `@hyperquote/i18n` formatters.

**Primary recommendation:** Build in 3 waves -- (1) database migration + server function + seed data, (2) Market page with filters/search/pagination, (3) Product Detail page with specs/gallery/quote CTA.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Products table uses `product_category` enum (27 values) -- NO separate `product_categories` table
- Server function named `getPublicCatalog` (from BACKEND.md), not `getProductCatalog`
- fuse.js for client-side search with server fallback
- Pagination (24/page), NOT infinite scroll
- SSR rendering, cached 5 min via Workers Cache API
- URL state via TanStack Router search params with Zod validateSearch
- "Add to Quote" requires login -> opens Login Modal (stub as console.log for Phase 5)
- Price ranges only, NEVER exact prices
- React Aria Components: SearchField, CheckboxGroup, RadioGroup, Select, NumberField, Breadcrumbs, Popover, Modal, ListBox

### Claude's Discretion
- Internal component structure and file organization
- Seed data content (realistic Egyptian building materials)
- Price range computation approach (min/max columns vs. computed from internal data)
- Skeleton component implementation details
- Image placeholder strategy (no real product photos yet)

### Deferred Ideas (OUT OF SCOPE)
- Login Modal implementation (Phase 6 -- stub the trigger)
- Portal "Add to Quote" flow (Phase 9)
- Workers Cache API integration (can be added later, SSR is sufficient now)
- Real product images (use color placeholders like MarketPreviewSection)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEB-04 | Market page: SSR product catalog with search (fuse.js), filter sidebar, grid/list toggle, price ranges (never exact prices), pagination | Server function pattern from vertical-slice, fuse.js 7.1.0, React Aria components, Zod validateSearch, existing i18n/RTL infrastructure |
| WEB-05 | Product detail: specs table, availability indicator, price range badge, "Add to Quote" (requires login), related products | Product slug route, breadcrumbs, React Aria NumberField, CurrencyDisplay component, existing layout patterns |
</phase_requirements>

## Standard Stack

### Core (already installed in monorepo)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-start | ^1.167.12 | SSR framework + server functions | Project framework |
| @tanstack/react-router | ^1.168.0 | Routing + URL state (validateSearch) | Type-safe search params with Zod |
| react-aria-components | ^1.16.0 | Accessible UI primitives | Project UI library |
| @hyperquote/i18n | workspace:* | Currency/unit formatting, Arabic-Indic numerals | Already built in Phase 3 |
| @hyperquote/ui | workspace:* | StatusBadge, EmptyState, Skeleton | Already built in Phase 3 |
| @hyperquote/types | workspace:* | ProductCategory type + PRODUCT_CATEGORIES array | Already built in Phase 3 |

### New Dependencies (must add to website package.json)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fuse.js | ^7.1.0 | Client-side fuzzy search | Search field debounced filtering |
| zod | ^3.24.0 | Search params validation | validateSearch in route definition |
| @supabase/supabase-js | ^2.100.1 | Database queries in server function | getPublicCatalog server function |

### Not Needed Yet
| Library | Reason |
|---------|--------|
| @tanstack/react-query | Server function with loader is sufficient for SSR; no client-side refetching needed yet |
| Workers Cache API | SSR is sufficient; caching optimization deferred |

## Architecture Patterns

### Recommended Project Structure
```
apps/website/src/
  routes/_website/
    market/
      index.tsx           # Market page route (validateSearch + loader + component)
      $productSlug.tsx    # Product detail route (params + loader + component)
  components/market/
    FilterSidebar.tsx     # Desktop sidebar + mobile bottom sheet
    ProductCard.tsx       # Grid and list card variants
    ProductGrid.tsx       # Grid/list container with toolbar
    SearchBar.tsx         # React Aria SearchField with debounce
    Pagination.tsx        # React Aria ListBox pagination
    MobileFilterSheet.tsx # React Aria Modal bottom sheet
  components/product/
    ImageGallery.tsx      # Primary image + thumbnails + zoom
    SpecsTable.tsx        # Alternating row specs
    QuoteCard.tsx         # Sticky sidebar quote CTA
    RelatedProducts.tsx   # Horizontal scroll product cards
    MobileBottomBar.tsx   # Fixed bottom bar for mobile
  lib/
    catalog.ts            # getPublicCatalog server function
    search.ts             # fuse.js instance + search helpers
    price-range.ts        # Price range formatting utilities
supabase/migrations/
  20260331000007_products.sql  # Products table + indexes + search_vector trigger
  20260331000008_seed_products.sql  # Seed data (20-30 products)
```

### Pattern 1: Server Function with Input Validation
**What:** TanStack Start server function with Zod schema for input validation
**When to use:** All server-side data fetching with user-controlled parameters
**Example:**
```typescript
// lib/catalog.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '@hyperquote/auth/server'
import { getRequest } from '@tanstack/react-start/server'

const catalogInput = z.object({
  category: z.array(z.string()).optional(),
  availability: z.enum(['all', 'available', 'low_stock']).optional(),
  priceTier: z.array(z.enum(['budget', 'mid_range', 'premium'])).optional(),
  search: z.string().optional(),
  sort: z.enum(['relevance', 'name', 'category', 'availability']).default('relevance'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(24),
})

export const getPublicCatalog = createServerFn()
  .inputValidator(catalogInput)
  .handler(async ({ input }) => {
    const request = getRequest()
    const { client } = createSupabaseServerClient({
      request,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    })

    let query = client
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)

    if (input.category?.length) {
      query = query.in('category', input.category)
    }
    if (input.search) {
      query = query.textSearch('search_vector', input.search, { type: 'websearch' })
    }

    const offset = (input.page - 1) * input.limit
    query = query.range(offset, offset + input.limit - 1)

    const { data, error, count } = await query

    return {
      items: data ?? [],
      total: count ?? 0,
      hasMore: (count ?? 0) > offset + input.limit,
    }
  })
```

### Pattern 2: URL-Synced Search Params with validateSearch
**What:** Zod schema validates URL search params, used in route loader
**When to use:** Market page filters synced to URL
**Example:**
```typescript
// routes/_website/market/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const marketSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().transform(s => s?.split(',')).optional(),
  availability: z.enum(['available', 'low_stock']).optional(),
  price_tier: z.string().transform(s => s?.split(',')).optional(),
  sort: z.enum(['relevance', 'name', 'category', 'availability']).optional(),
  view: z.enum(['grid', 'list']).optional(),
  page: z.number().int().min(1).catch(1).optional(),
})

export const Route = createFileRoute('/_website/market/')({
  validateSearch: marketSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getPublicCatalog({ data: deps }),
  component: MarketPage,
})
```

### Pattern 3: fuse.js Client-Side Search with Debounce
**What:** Client-side fuzzy search on already-loaded products, with 300ms debounce
**When to use:** Quick filtering of current page results; server fallback for cross-page search
**Example:**
```typescript
import Fuse from 'fuse.js'
import { useState, useMemo, useCallback } from 'react'

const fuseOptions = {
  keys: ['name', 'name_ar', 'brand', 'category'],
  threshold: 0.3,
  distance: 100,
}

function useProductSearch(products: Product[]) {
  const fuse = useMemo(() => new Fuse(products, fuseOptions), [products])

  const search = useCallback((query: string) => {
    if (!query.trim()) return products
    return fuse.search(query).map(r => r.item)
  }, [fuse, products])

  return { search }
}
```

### Anti-Patterns to Avoid
- **watch() instead of useWatch():** Broken with React 19 / React Compiler. Always useWatch() for form fields.
- **Exact prices in any context:** Never expose `last_purchase_price` or `weighted_avg_cost` to the public catalog. Only price ranges.
- **px-4/pl-4 instead of ps-4/pe-4:** Always use logical properties for RTL support.
- **@theme for colors:** Colors in `:root {}` only, never `@theme`.
- **Navigator.language in SSR:** Detect locale from cookie/header server-side (already implemented in __root.tsx).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy search | Custom string matching | fuse.js 7.1.0 | Handles typos, partial matches, Arabic text, scoring |
| URL state management | Manual URLSearchParams | TanStack Router validateSearch + Zod | Type-safe, auto-serialization, history integration |
| Accessible search field | Custom input with clear button | React Aria SearchField | Keyboard nav, screen reader, clear button, ARIA roles |
| Accessible checkboxes | Custom checkbox styling | React Aria CheckboxGroup | Group semantics, keyboard, ARIA, focus management |
| Number formatting | Manual Arabic-Indic conversion | `Intl.NumberFormat('ar-EG')` via @hyperquote/i18n | Handles all edge cases, locale-aware |
| Currency display | String templates | CurrencyDisplay from @hyperquote/ui | Geist Mono, Arabic-Indic, locale-aware |
| Pagination | Custom page math | Simple utility + React Aria ListBox | Keyboard accessible, ARIA roles |
| Bottom sheet modal | Custom overlay | React Aria Modal with isDismissable | Focus trap, escape key, backdrop, a11y |
| Full-text search (server) | LIKE queries | PostgreSQL TSVECTOR + `textSearch()` | Stemming, ranking, index support |

## Common Pitfalls

### Pitfall 1: Products Table Without Seed Data
**What goes wrong:** Market page renders empty state on first load with no way to test filters, pagination, or search.
**Why it happens:** Migration creates schema but no data. Seed data is a separate concern often forgotten.
**How to avoid:** Create a seed migration with 20-30 realistic Egyptian building materials. Include variety across categories, price tiers, and availability states.
**Warning signs:** Empty grid on `/market`, all filter counts show 0.

### Pitfall 2: Search Params Type Mismatch
**What goes wrong:** Category array comes from URL as comma-separated string but code expects array. Page number comes as string, not number.
**Why it happens:** URL params are always strings. Zod transform needed to convert.
**How to avoid:** Use `.transform()` in Zod schema for arrays (split on comma) and `.coerce` for numbers. Test with direct URL entry, not just UI interaction.
**Warning signs:** Filters work via UI but break when pasting a URL.

### Pitfall 3: fuse.js Searching Server-Rendered Data
**What goes wrong:** fuse.js index created on SSR, but search runs on client. Hydration mismatch if search results differ.
**Why it happens:** fuse.js is a client-side library. If used during SSR, results are deterministic, but the timing differs.
**How to avoid:** Initialize fuse.js only on client. For SSR, pass the full product list; client-side search filters the already-loaded data. Server-side text search (PostgreSQL) is the primary search mechanism via URL `?q=` param.
**Warning signs:** Hydration warnings in console, search results flash on page load.

### Pitfall 4: Price Range Exposure
**What goes wrong:** `last_purchase_price` or `weighted_avg_cost` leaked to frontend, exposing internal margins.
**Why it happens:** Server function returns `SELECT *` instead of explicit column list.
**How to avoid:** Server function must explicitly select only public columns. Never include cost/margin fields. Price ranges should be pre-computed or use a safe view.
**Warning signs:** Network tab shows cost fields in API response.

### Pitfall 5: RTL Filter Sidebar Position
**What goes wrong:** Sidebar appears on wrong side in RTL. Chevrons point wrong direction. Sort dropdown misaligned.
**Why it happens:** Using `left`/`right` instead of logical properties.
**How to avoid:** Use `inset-inline-start` / `ms-*` / `me-*` / `ps-*` / `pe-*` exclusively. Test by toggling locale.
**Warning signs:** Sidebar stays on left in RTL mode.

### Pitfall 6: Missing Geist Mono on Numbers
**What goes wrong:** Price ranges, SKUs, counts, and pagination numbers render in Inter instead of Geist Mono.
**Why it happens:** Forgetting to apply `font-mono` class to numeric elements.
**How to avoid:** Wrap all numeric displays in `<span className="font-mono">`. Use `CurrencyDisplay` and `UnitDisplay` components which already apply `font-mono`.
**Warning signs:** Visual audit shows proportional-width numbers.

### Pitfall 7: Mobile Filter State Not Syncing to URL
**What goes wrong:** Filters applied in mobile bottom sheet don't update URL params on "Apply" click.
**Why it happens:** Bottom sheet manages local state but doesn't call `navigate()` on apply.
**How to avoid:** Bottom sheet "Apply" button calls `navigate({ search: { ...filters } })`. "Reset" clears to defaults and navigates.
**Warning signs:** Filters applied but URL doesn't change, refresh loses filter state.

## Code Examples

### Price Range Formatting
```typescript
// lib/price-range.ts
import { formatCurrency } from '@hyperquote/i18n'

export function formatPriceRange(
  minPrice: number | null,
  maxPrice: number | null,
  uom: string,
  locale: 'ar' | 'en',
  t: (key: string) => string,
): string {
  if (!minPrice && !maxPrice) {
    return t('market.priceOnRequest')  // "Price on Request" / "السعر عند الطلب"
  }

  const formatted = formatCurrency(minPrice ?? maxPrice!, locale)
  const unit = t(`units.${uom}`)

  if (locale === 'ar') {
    return `من ${formatted}/${unit}`  // Arabic-Indic numerals via formatCurrency
  }
  return `From ${formatted}/${unit}`
}
```

### Search Field with Debounce
```typescript
import { SearchField, Input, Button } from 'react-aria-components'
import { Search, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'

function MarketSearchBar({ defaultValue }: { defaultValue?: string }) {
  const navigate = useNavigate()
  const [value, setValue] = useState(defaultValue ?? '')

  const debouncedNavigate = useCallback(
    debounce((q: string) => {
      navigate({ search: (prev) => ({ ...prev, q: q || undefined, page: 1 }) })
    }, 300),
    [navigate]
  )

  return (
    <SearchField
      value={value}
      onChange={(v) => { setValue(v); debouncedNavigate(v) }}
      className="relative w-full"
      aria-label={t('market.searchPlaceholder')}
    >
      <Search size={20} className="absolute inset-is-3 top-3.5 text-[var(--color-text-muted)]" />
      <Input
        placeholder={t('market.searchPlaceholder')}
        className="w-full h-12 ps-10 pe-10 rounded-xl bg-[var(--color-card)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
      />
      <Button className="absolute inset-ie-3 top-3.5 text-[var(--color-text-muted)]">
        <X size={20} />
      </Button>
    </SearchField>
  )
}
```

### Product Card with Hover Effect
```typescript
function ProductCard({ product, locale, t }: ProductCardProps) {
  return (
    <Link
      to="/market/$productSlug"
      params={{ productSlug: product.slug }}
      className="group rounded-xl overflow-hidden bg-[var(--color-card)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
    >
      {/* Image 4:3 */}
      <div className="aspect-[4/3] bg-[var(--color-surface)]">
        {/* Placeholder or product image */}
      </div>

      <div className="p-4">
        <span className="text-xs text-[var(--color-primary)] font-medium mb-2 block">
          {t(`categories.${product.category}`)}
        </span>
        <h3 className="text-base font-semibold line-clamp-2 text-[var(--color-text)]">
          {locale === 'ar' ? product.name_ar : product.name}
        </h3>
        <p className="font-mono text-sm text-[var(--color-primary)] mt-2">
          {formatPriceRange(product.price_min, product.price_max, product.unit_of_measure, locale, t)}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`w-2 h-2 rounded-full ${availabilityColor(product)}`} />
          <span className="text-xs text-[var(--color-text-muted)]">
            {t(`availability.${product.availability_status}`)}
          </span>
        </div>
      </div>
    </Link>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/start` | `@tanstack/react-start` | v1.121.0+ | Import path changed, vinxi removed |
| `.validator()` | `.inputValidator()` | v1.121.0+ | Server function validation method renamed |
| `zodResolver` | `standardSchemaResolver` | @hookform/resolvers 5.x | RHF resolver API changed |
| `framer-motion` | `motion/react` | Motion v12 | Package renamed |
| Manual SSR hydration | `@tanstack/react-router-ssr-query` | TanStack Query SSR | Automatic dehydrate/hydrate |

## Open Questions

1. **Price Range Storage Strategy**
   - What we know: Products table has `last_purchase_price` and `weighted_avg_cost` but these are internal. Public page shows ranges.
   - What's unclear: Should we add `price_range_min`/`price_range_max` columns, or compute ranges from category-based tiers?
   - Recommendation: Add `price_range_min` and `price_range_max` decimal columns to the products table. Pre-computed ranges are simpler to query and avoid leaking margin logic to the frontend. Seed data populates these directly.

2. **Product Slug Generation**
   - What we know: Route is `/market/{product-slug}`. Products table has `sku` but no `slug` column.
   - What's unclear: Should slug be auto-generated from name, or stored as a column?
   - Recommendation: Add a `slug TEXT UNIQUE` column to products. Generate from name during seed. Slugs must be URL-safe, bilingual products use English name for slug.

3. **Availability Status Source**
   - What we know: UI shows "Available", "Low Stock", "Out of Stock". Products table has `is_active` and `is_stockable` but no direct availability field.
   - What's unclear: Is availability computed from inventory, or a static field on the product?
   - Recommendation: Add `availability_status TEXT DEFAULT 'available'` to products for Phase 5. Real inventory integration comes in Phase 19 (Warehouse). For now, seed data sets availability statically.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management, dev server | Verified in Phase 1 | 1.x | -- |
| Supabase CLI | Migrations | Verified in Phase 2 | 2.x | -- |
| PostgreSQL (Supabase) | Products table | Verified in Phase 2 | 15.x | -- |
| fuse.js | Client search | npm registry | 7.1.0 | -- |
| Zod | Search param validation | npm registry | 3.24.0 | -- |

No missing dependencies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 (not yet configured for website app) |
| Config file | none -- Wave 0 gap |
| Quick run command | `bun run vitest run --project website` |
| Full suite command | `bun run vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WEB-04 | Market page SSR renders product grid | smoke | Manual: visit `/market` | N/A |
| WEB-04 | Filter sidebar narrows results | integration | Manual: click category filter, verify URL + grid | N/A |
| WEB-04 | fuse.js search finds products | unit | `vitest run --grep "fuse search"` | Wave 0 |
| WEB-04 | Pagination updates URL and fetches correct page | integration | Manual: click page 2, verify URL | N/A |
| WEB-04 | Price range never shows exact price | unit | `vitest run --grep "price range"` | Wave 0 |
| WEB-05 | Product detail renders specs table | smoke | Manual: visit `/market/cement-portland-50kg` | N/A |
| WEB-05 | "Add to Quote" triggers login stub | integration | Manual: click button, verify console.log | N/A |
| WEB-05 | Arabic-Indic numerals for prices in AR locale | unit | `vitest run --grep "arabic indic"` | Already in @hyperquote/i18n tests |
| WEB-05 | Breadcrumb separator flips in RTL | visual | Manual: toggle locale | N/A |

### Sampling Rate
- **Per task commit:** Manual smoke test (visit routes, check rendering)
- **Per wave merge:** Full visual review of both pages in EN + AR
- **Phase gate:** All 4 success criteria verified before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` for website app -- no test runner configured yet
- [ ] `tests/price-range.test.ts` -- covers price formatting logic
- [ ] `tests/search.test.ts` -- covers fuse.js search behavior
- [ ] Seed data validation -- verify 20-30 products across all categories

## Project Constraints (from CLAUDE.md)

- **Three colors only:** white/black/blue #2563EB. Semantic status dots (green/yellow) for availability are exception.
- **Geist Mono for ALL numbers:** Prices, counts, SKUs, pagination, product counts in filter sidebar.
- **React Aria Components only:** No shadcn, no Radix, no Headless UI.
- **Tailwind v4 colors in :root:** Never in @theme.
- **Logical properties only:** ps-/pe-/ms-/me-, never pl-/pr-/ml-/mr-.
- **useWatch() never watch():** Not directly relevant to this phase (no forms with watch), but applies to any NumberField usage.
- **SSR locale from cookie/header:** Already implemented in __root.tsx.
- **Arabic-Indic numerals:** All numbers in Arabic context via Intl.NumberFormat('ar-EG').
- **Import from motion/react:** Not framer-motion.
- **.inputValidator() not .validator():** For server function validation.
- **Bun, not npm:** For package management and scripts.

## Sources

### Primary (HIGH confidence)
- Project codebase: existing Phase 4 patterns (routes, components, i18n, layout)
- `essential/brand/STACK-DECISION.md` -- verified versions and known issues
- `05-CONTEXT.md` -- complete phase spec with UI details and schema
- `05-UI-SPEC.md` -- detailed visual/interaction contract
- `packages/types/src/enums.ts` -- ProductCategory type + PRODUCT_CATEGORIES array verified
- `supabase/migrations/20260331000002_enums.sql` -- product_category enum (27 values) verified

### Secondary (MEDIUM confidence)
- fuse.js 7.1.0 -- version verified via npm registry
- TanStack Router validateSearch pattern -- from project stack decision docs and existing codebase patterns

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use or verified in registry
- Architecture: HIGH - follows established Phase 4 patterns exactly
- Pitfalls: HIGH - identified from project-specific constraints (RTL, Arabic-Indic, price privacy)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable stack, no moving targets)
