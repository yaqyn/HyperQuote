# Phase 12: Supplier Portal - Research

**Researched:** 2026-04-01
**Domain:** Supplier portal UI (role toggle, inline table editing, file upload/parsing, PO management, analytics)
**Confidence:** HIGH

## Summary

Phase 12 builds the supplier-facing views within the existing portal app. The portal shell, auth, glass windows, RoleToggle, NavButtons, and spatial canvas from Phase 7 are already implemented and functional. The `usePortalStore` already has `activeRole: 'customer' | 'supplier'` with `setActiveRole()`, and NavButtons already renders supplier-specific items (Stock, Purchase Orders) when `activeRole === 'supplier'`. The routes (`/supplier/stock`, `/supplier/orders`) are referenced but don't exist yet.

The phase requires 6 new route pages, ~14 server functions, inline table editing with React Aria NumberField, file upload (DropZone + FileTrigger already used in quote builder), CSV diff preview, AI catalog parsing (async via queue), PO confirm/reject workflow, invoice submission with three-way match, and a simple analytics dashboard with KPI cards and a bar chart.

**Primary recommendation:** Build supplier features as new route files under `_portal/supplier/`, reusing existing WindowShell, DropZone patterns, file-parser utilities, toast system, and server function patterns. Add Recharts for the analytics bar chart (only charting need in the phase). Inline editing uses standalone React Aria NumberField (NOT the RHF-wrapped version) with immediate save-on-blur.

## Project Constraints (from CLAUDE.md)

- Three colors only (white/black/blue #2563EB). Semantic green/yellow/red for data only.
- React Aria Components for all UI. Never shadcn/Radix.
- Geist Mono for ALL numbers (prices, quantities, PO refs, dates, KPIs).
- Motion v12 spring enter, tween exit. CSS transitions for Popover/Menu.
- Glass windows, not dashboards. All views are glass windows over spatial canvas.
- `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`.
- Colors in `:root {}` never `@theme`. Logical properties (`ps-`, `me-`).
- Arabic-Indic numerals in Arabic context. Arabic unit translations.
- TanStack Start, Bun, Cloudflare Workers. NOT Next.js/npm/Vercel.
- Supplier never sees customer name -- PO anonymization via `coded_delivery_reference`.
- 14% VAT for invoice calculations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
(No separate CONTEXT.md decisions section -- all constraints come from the phase spec and CLAUDE.md non-negotiables documented above)

### Claude's Discretion
- Charting library choice for analytics bar chart
- Inline edit implementation approach (standalone NumberField vs custom)
- Server function organization (single file vs per-feature)
- i18n key namespace structure for supplier views

### Deferred Ideas (OUT OF SCOPE)
- Tier 1 (WhatsApp-only) and Tier 2 (simplified portal) supplier onboarding -- this phase builds Tier 3 (full portal)
- AI catalog parsing backend (Mistral OCR + Groq) -- this phase builds the upload UI and review UI; backend processing is placeholder/mock
- Supabase Realtime subscriptions -- deferred per Phase 11 decision
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUPP-01 | Supplier role toggle: switches canvas, navigation buttons, AI context | RoleToggle and NavButtons already exist with supplier items. Need to add supplier keyboard shortcuts (S/P/A) and AI context switching. |
| SUPP-02 | Stock & Pricing: product table with inline edit, freshness color coding, bulk CSV update with diff preview | React Aria Table + standalone NumberField for inline edit. PapaParse/SheetJS already installed for CSV. Freshness = computed from `last_updated_at`. |
| SUPP-03 | Catalog upload: drag-and-drop (PDF/Excel/CSV), AI parsing with confidence scores, side-by-side review | Reuse DropZone/FileTrigger pattern from quote builder. AI parsing is async -- mock processor, show review UI with confidence color coding. |
| SUPP-04 | PO inbox: pending/confirmed/history tabs, per-PO confirm/reject with per-line actions | React Aria Tabs + card list. Per-line confirm toggle with Checkbox. DatePicker for delivery scheduling. |
| SUPP-05 | Invoice submission: auto-populate from confirmed PO, PDF upload, three-way match validation | React Hook Form + Zod. ComboBox for PO selection. Auto-calculate subtotal/VAT(14%)/total. Match tolerance validation. |
| SUPP-06 | Analytics: KPIs, product performance table, monthly revenue chart | KPI cards with Geist Mono values + trend indicators. Recharts BarChart for monthly revenue. DataTable for product performance. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Aria Components | ^1.16.0 | Table, NumberField, Tabs, Checkbox, ComboBox, DatePicker, DropZone, FileTrigger | Project mandate |
| TanStack React Table | ^8.x | Table state (sort, pagination) paired with React Aria Table rendering | Already used in DataTable package |
| React Hook Form | ^7.72.0 | Invoice form, PO reject reason form | Project mandate |
| Zustand | ^5.0.12 | Portal store (role state already exists) | Project mandate |
| PapaParse | ^5.5.3 | CSV parsing for bulk price update | Already in portal deps |
| SheetJS | 0.20.3 | Excel parsing for catalog upload | Already in portal deps |
| Motion | ^12.38.0 | Window animations, list transitions | Project mandate |
| lucide-react | ^1.7.0 | Icons (Package, ClipboardList, BarChart3, Pencil, EyeOff, etc.) | Project mandate |

### New (to install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | ^3.8.1 | Monthly revenue bar chart in analytics | SUPP-06 only. Lightweight SVG charts, tree-shakable, React-native API. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | visx | More control but 3x more code for a simple bar chart. Recharts is right for this scope. |
| Recharts | CSS/SVG manual | Possible for one bar chart but loses tooltip, responsive resize, animation. Not worth hand-rolling. |

**Installation:**
```bash
bun add recharts
```

**Version verification:** Recharts 3.8.1 confirmed via npm registry 2026-04-01.

## Architecture Patterns

### Recommended Route Structure
```
apps/portal/src/routes/_portal/
  supplier.stock.tsx          # Stock & Pricing window (SUPP-02)
  supplier.orders.tsx         # PO inbox list (SUPP-04)
  supplier.orders.$poId.tsx   # PO detail view (SUPP-04)
  supplier.invoices.tsx       # Invoice submission (SUPP-05)
  supplier.analytics.tsx      # Analytics dashboard (SUPP-06)
  supplier.catalog-upload.tsx # Catalog upload flow (SUPP-03)
```

### Recommended Component Structure
```
apps/portal/src/components/supplier/
  StockTable.tsx              # Product table with inline edit
  InlineNumberCell.tsx        # Standalone NumberField for inline editing
  FreshnessIndicator.tsx      # Color-coded relative time badge
  BulkUpdateModal.tsx         # CSV upload + diff preview modal
  CatalogUploadModal.tsx      # Drag-drop upload modal
  CatalogReview.tsx           # Side-by-side AI parse review
  POCard.tsx                  # PO summary card for inbox
  POLineItems.tsx             # Per-line confirm/reject table
  DeliveryScheduleForm.tsx    # Ship date + method + tracking
  InvoiceForm.tsx             # RHF invoice submission form
  KPICard.tsx                 # Analytics KPI card with trend
  RevenueChart.tsx            # Recharts bar chart wrapper
  ProductPerformanceTable.tsx # Top products table
```

### Recommended Server Function Structure
```
apps/portal/src/lib/server/
  supplier-stock.ts           # getSupplierProducts, updateSupplierStock, bulkUpdatePrices, getSupplierPriceHistory
  supplier-orders.ts          # getSupplierPOs, confirmPO, rejectPO
  supplier-invoices.ts        # submitSupplierInvoice
  supplier-catalog.ts         # uploadCatalog, getSupplierUploadHistory
  supplier-analytics.ts       # getSupplierAnalytics
```

### Pattern 1: Inline Table Editing (save-on-blur)
**What:** Click a price/qty cell -> inline React Aria NumberField appears -> on blur/Enter saves immediately via server function -> flash green on success / revert + toast on error.
**When to use:** Stock & Pricing table price and quantity columns.
**Example:**
```typescript
// Standalone NumberField (NOT the RHF-wrapped version from @hyperquote/forms)
// RHF wrapper requires FormProvider context -- inline cells don't have it
import { NumberField, Label, Input, Group } from 'react-aria-components'

function InlineNumberCell({
  value,
  onSave,
  formatOptions,
}: {
  value: number
  onSave: (newValue: number) => Promise<void>
  formatOptions?: Intl.NumberFormatOptions
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const cellRef = useRef<HTMLDivElement>(null)

  const handleCommit = async () => {
    setIsEditing(false)
    if (localValue === value) return
    try {
      await onSave(localValue)
      // Flash success: cell bg green for 500ms
      if (cellRef.current) {
        cellRef.current.style.backgroundColor = 'var(--color-success-bg)'
        setTimeout(() => {
          if (cellRef.current) cellRef.current.style.backgroundColor = ''
        }, 500)
      }
    } catch {
      setLocalValue(value) // revert
      toast.success(t('supplier.updateFailed')) // toast error
    }
  }

  if (!isEditing) {
    return (
      <div ref={cellRef} onClick={() => setIsEditing(true)} className="cursor-pointer">
        <span className="font-mono">{formatCurrency(value)}</span>
      </div>
    )
  }

  return (
    <NumberField
      value={localValue}
      onChange={setLocalValue}
      onBlur={handleCommit}
      onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
      formatOptions={formatOptions}
      autoFocus
    >
      <Input className="font-mono w-full" />
    </NumberField>
  )
}
```

### Pattern 2: Tab-based Window Layout
**What:** WindowShell wrapping React Aria TabList for multi-view windows (Stock tabs, PO tabs, Invoice tabs).
**When to use:** Every supplier window has tabs per the spec.
**Example:**
```typescript
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components'

function StockWindow() {
  return (
    <WindowShell title={t('supplier.stockTitle')}>
      <Tabs defaultSelectedKey="products" className="flex flex-col h-full">
        <TabList className="flex gap-1 px-6 pt-4 border-b border-[var(--color-border)]">
          <Tab id="products">{t('supplier.myProducts')}</Tab>
          <Tab id="priceUpdates">{t('supplier.priceUpdates')}</Tab>
          <Tab id="uploadHistory">{t('supplier.uploadHistory')}</Tab>
        </TabList>
        <TabPanel id="products" className="flex-1 overflow-auto p-6">
          <StockTable />
        </TabPanel>
        {/* ... */}
      </Tabs>
    </WindowShell>
  )
}
```

### Pattern 3: Server Function with Dev Fallback
**What:** All server functions check `isSupabaseConfigured()` and return mock data in dev mode.
**When to use:** Every supplier server function (matches existing pattern from orders.ts).
**Example:**
```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getSupplierProducts = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ page: z.number(), limit: z.number(), search: z.string().optional() }))
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) return getMockSupplierProducts(input)
    // Real Supabase query
  })
```

### Pattern 4: Supplier Keyboard Shortcuts
**What:** When supplier mode is active, register S/P/A shortcuts (Stock, Purchase Orders, Analytics).
**When to use:** In `_portal.tsx` or a `SupplierShortcuts` component.
**Example:**
```typescript
function PortalShortcuts() {
  const activeRole = usePortalStore((s) => s.activeRole)

  // Customer shortcuts
  useShortcut('o', () => navigate({ to: '/orders' }), activeRole === 'customer')
  useShortcut('m', () => navigate({ to: '/market' }), activeRole === 'customer')

  // Supplier shortcuts
  useShortcut('s', () => navigate({ to: '/supplier/stock' }), activeRole === 'supplier')
  useShortcut('p', () => navigate({ to: '/supplier/orders' }), activeRole === 'supplier')
  useShortcut('a', () => navigate({ to: '/supplier/analytics' }), activeRole === 'supplier')

  return null
}
```

### Anti-Patterns to Avoid
- **Using RHF NumberField for inline cells:** The `@hyperquote/forms` NumberField requires `FormProvider` context. Inline table cells need standalone React Aria `NumberField`.
- **Wrapping table in a form:** The stock table is NOT a form. Each cell saves independently on blur.
- **Polling for catalog processing status:** Use a simple polling interval (5s) until Supabase Realtime is integrated. Don't build a custom WebSocket solution.
- **Showing customer names in supplier PO views:** Always use `coded_delivery_reference` (HQ-YYYY-NNNN). Never expose customer identity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom CSV tokenizer | PapaParse (already installed) | BOM handling, delimiter detection, edge cases with quoted fields |
| Excel parsing | Manual xlsx reader | SheetJS (already installed) | Format complexity, cell type detection, multi-sheet support |
| Bar chart | SVG bars + scales + axes | Recharts `BarChart` | Tooltips, responsive resize, animation, axis formatting |
| Number formatting | Template literals | `Intl.NumberFormat('ar-EG')` / `formatNumber` from @hyperquote/i18n | Arabic-Indic numerals, currency grouping, locale-specific formatting |
| Date formatting | Manual relative time | `DateDisplay` from @hyperquote/ui / `Intl.RelativeTimeFormat` | Locale-aware "2 hours ago" / "3 days ago" |
| Drag-and-drop upload | Custom drag events | React Aria `DropZone` + `FileTrigger` | Keyboard accessibility, ARIA labels, file type filtering |
| Tab management | Custom tab state | React Aria `Tabs` | ARIA roles, keyboard nav, focus management |
| File type detection | Extension check | MIME type + magic bytes via `detectFileType()` (already in file-parser.ts) | Extension can lie, MIME is more reliable |

**Key insight:** The portal already has the patterns for file upload (UploadMethod), table rendering (DataTable), form handling (RHF), and server functions with dev fallback. This phase is mostly composition of existing patterns with supplier-specific data.

## Common Pitfalls

### Pitfall 1: Inline Edit Focus Management
**What goes wrong:** Clicking a table cell to edit opens NumberField, but focus jumps elsewhere or Enter doesn't commit.
**Why it happens:** React Aria Table manages row focus/selection. NumberField inside a table cell can conflict with table's keyboard navigation.
**How to avoid:** Use `onAction` on `Row` for click handling, not the cell. When editing, stop propagation on NumberField keyboard events. Set `autoFocus` on the Input when entering edit mode.
**Warning signs:** Tab/arrow keys move rows instead of editing values.

### Pitfall 2: Freshness Color Coding Confusion
**What goes wrong:** Colors (green/yellow/red) look like design violations of the three-color rule.
**Why it happens:** Freshness indicators are data-semantic, not design. But if used with wrong CSS variables, they can clash.
**How to avoid:** Use explicit semantic color variables: `--color-success-bg`, `--color-warning-bg`, `--color-error-bg`. These are data indicators, same as StatusBadge uses.
**Warning signs:** Hard-coded hex values for green/yellow/red instead of semantic variables.

### Pitfall 3: CSV Diff Preview Memory
**What goes wrong:** Large CSV files (5000+ rows) cause browser slowdown during diff calculation.
**Why it happens:** Comparing every cell of old vs new data is O(n*m).
**How to avoid:** Index by SKU/product_id for O(1) lookup. Only show changed rows. Paginate the diff preview. Limit upload to reasonable row count (spec says 50 per page, same should apply to diff).
**Warning signs:** Browser hangs on "Apply Changes" click.

### Pitfall 4: VAT Calculation Precision
**What goes wrong:** Invoice total shows EGP 0.01 discrepancy from expected value.
**Why it happens:** Floating point arithmetic with percentages.
**How to avoid:** Use integer math (piastres) or `Math.round()` at each step. VAT = `Math.round(subtotal * 0.14)`. Compare totals with 1% tolerance as spec requires.
**Warning signs:** "Your total doesn't match" warning appearing spuriously.

### Pitfall 5: PO Anonymization Leak
**What goes wrong:** Customer name appears in supplier view via related data joins.
**Why it happens:** Server function returns full PO object including customer relation.
**How to avoid:** Server functions must explicitly SELECT only allowed columns. Use `coded_delivery_reference` field, never join to customers table in supplier queries.
**Warning signs:** Any customer name, company, or contact info visible in supplier routes.

### Pitfall 6: Recharts Bundle in Non-Analytics Routes
**What goes wrong:** Recharts (200KB+) loads on all supplier pages.
**Why it happens:** Static import of RevenueChart in route file that's not code-split.
**How to avoid:** Analytics route is already a separate route file (`supplier.analytics.tsx`). Recharts imports only happen there. TanStack Router lazy imports handle code splitting.
**Warning signs:** Bundle analyzer shows recharts in non-analytics chunks.

## Code Examples

### Inline Editable Cell with Flash Feedback
```typescript
// Source: Pattern derived from React Aria NumberField docs + project conventions
import { NumberField, Input } from 'react-aria-components'
import { useState, useRef } from 'react'

function EditablePrice({
  value,
  productId,
  locale,
}: {
  value: number
  productId: string
  locale: 'ar' | 'en'
}) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  const save = async () => {
    setEditing(false)
    if (current === value) return
    try {
      await updateSupplierStock({ data: { productId, price: current } })
      // Flash green
      ref.current?.animate(
        [{ backgroundColor: 'var(--color-success-bg)' }, { backgroundColor: 'transparent' }],
        { duration: 500 }
      )
    } catch {
      setCurrent(value)
      toast.success('Update failed')
    }
  }

  if (!editing) {
    return (
      <div ref={ref} onClick={() => setEditing(true)} className="cursor-pointer px-2 py-1 rounded">
        <span className="font-mono">{formatNumber(current, locale)}</span>
      </div>
    )
  }

  return (
    <NumberField
      value={current}
      onChange={setCurrent}
      onBlur={save}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') save() }}
      formatOptions={{ style: 'decimal', minimumFractionDigits: 2 }}
      autoFocus
    >
      <Input className="font-mono w-20 px-2 py-1 rounded border border-[var(--color-primary)] bg-[var(--color-surface)]" />
    </NumberField>
  )
}
```

### KPI Card with Trend
```typescript
// Source: FRONTEND.md Section 2.14 spec
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatNumber } from '@hyperquote/i18n'

function KPICard({
  label,
  value,
  trend,
  locale,
  format,
}: {
  label: string
  value: number
  trend: number // percentage change
  locale: 'ar' | 'en'
  format?: 'currency' | 'percent' | 'number'
}) {
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600'

  const formatted = format === 'currency'
    ? `EGP ${formatNumber(value, locale)}`
    : format === 'percent'
    ? `${formatNumber(value, locale)}%`
    : formatNumber(value, locale)

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-5 min-w-[200px]">
      <p className="font-medium text-xs text-[var(--color-text-muted)] uppercase tracking-widest">
        {label}
      </p>
      <p className="font-mono font-semibold text-[28px] text-[var(--color-text)] mt-1">
        {formatted}
      </p>
      <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
        <TrendIcon size={14} />
        <span className="font-mono text-xs">{formatNumber(Math.abs(trend), locale)}%</span>
      </div>
    </div>
  )
}
```

### CSV Diff Preview
```typescript
// Source: Pattern for SUPP-02 bulk update
interface DiffRow {
  productId: string
  productName: string
  field: 'price' | 'quantity'
  oldValue: number
  newValue: number
}

function DiffPreview({ diffs, locale }: { diffs: DiffRow[]; locale: 'ar' | 'en' }) {
  return (
    <div className="space-y-2">
      {diffs.map((diff) => (
        <div key={`${diff.productId}-${diff.field}`} className="flex items-center gap-4 px-4 py-2 rounded-lg bg-[var(--color-surface)]">
          <span className="flex-1">{diff.productName}</span>
          <span className="font-mono text-red-600 line-through">
            {formatNumber(diff.oldValue, locale)}
          </span>
          <span className="text-[var(--color-text-muted)]">-&gt;</span>
          <span className="font-mono text-green-600">
            {formatNumber(diff.newValue, locale)}
          </span>
        </div>
      ))}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/start` | `@tanstack/react-start` | v1.121.0 (2025) | Import path changed. Project already uses correct one. |
| `zodResolver` | `standardSchemaResolver` | RHF 7.72+ | Project already uses correct resolver. |
| `framer-motion` | `motion/react` | Motion v12 | Project already uses correct import. |
| `watch()` | `useWatch()` | React 19 | Project already follows this. |

**Deprecated/outdated:**
- None specific to this phase. All project conventions are current.

## Open Questions

1. **Charting library scope**
   - What we know: Only one bar chart needed (monthly revenue). Recharts 3.8.1 is the pragmatic choice.
   - What's unclear: Will future phases (CEO app, internal reports) need more charts? If so, Recharts is still fine -- it covers bar, line, pie.
   - Recommendation: Install Recharts now. If CEO app needs different styling, it can still use Recharts with custom theme.

2. **AI catalog parsing backend**
   - What we know: CONTEXT.md says "Mistral OCR + Groq" via Cloudflare Queue. This is Phase 30 (AI integrations) territory.
   - What's unclear: Should catalog upload just save the file and show a "processing" placeholder, or build a mock parser?
   - Recommendation: Build the full upload UI + review UI with mock parsed data. The review screen (confidence scores, side-by-side) is the complex part. Backend parsing swaps in later.

3. **Analytics data source**
   - What we know: Dev mode uses mock data (matching all other server functions). Real analytics come from PO/delivery/invoice tables.
   - What's unclear: Whether materialized views (Phase 14) are needed for analytics performance.
   - Recommendation: Simple queries with mock data for now. Phase 14 adds `ceo_attention_items` and `ap_aging_snapshot` views. Supplier analytics can use direct queries until scale demands views.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Yes | (installed) | -- |
| PapaParse | CSV parsing | Yes | ^5.5.3 (in portal deps) | -- |
| SheetJS | Excel parsing | Yes | 0.20.3 (in portal deps) | -- |
| Recharts | Bar chart | No (to install) | 3.8.1 | `bun add recharts` |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:**
- Recharts: Not installed yet. Simple `bun add recharts` resolves it.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `apps/portal/vitest.config.ts` |
| Quick run command | `cd apps/portal && bun run vitest run --reporter=verbose` |
| Full suite command | `cd apps/portal && bun run vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUPP-01 | Role toggle switches nav items and shortcuts | unit | `bun run vitest run src/__tests__/role-toggle.test.tsx -t "supplier"` | No -- Wave 0 |
| SUPP-02 | Inline edit saves on blur, diff preview calculates correctly | unit | `bun run vitest run src/__tests__/stock-table.test.tsx` | No -- Wave 0 |
| SUPP-03 | Catalog upload accepts files, mock parser returns confidence scores | unit | `bun run vitest run src/__tests__/catalog-upload.test.tsx` | No -- Wave 0 |
| SUPP-04 | PO confirm/reject calls correct server fn, per-line toggle works | unit | `bun run vitest run src/__tests__/po-inbox.test.tsx` | No -- Wave 0 |
| SUPP-05 | Invoice form calculates VAT at 14%, validates total match | unit | `bun run vitest run src/__tests__/invoice-form.test.tsx` | No -- Wave 0 |
| SUPP-06 | KPI cards render formatted numbers, chart renders mock data | unit | `bun run vitest run src/__tests__/analytics.test.tsx` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/portal && bun run vitest run --reporter=verbose`
- **Per wave merge:** `cd apps/portal && bun run vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/portal/src/__tests__/supplier-stock.test.tsx` -- covers SUPP-02 (inline edit, diff calc)
- [ ] `apps/portal/src/__tests__/supplier-po.test.tsx` -- covers SUPP-04 (confirm/reject logic)
- [ ] `apps/portal/src/__tests__/supplier-invoice.test.tsx` -- covers SUPP-05 (VAT calc, total match)
- [ ] Framework already installed -- vitest.config.ts exists

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/portal/src/` -- RoleToggle, NavButtons, WindowShell, PortalStore, server function patterns, file-parser, UploadMethod
- Existing codebase: `packages/tables/src/DataTable.tsx` -- React Aria Table + TanStack React Table integration
- Existing codebase: `packages/forms/src/fields/NumberField.tsx` -- RHF-wrapped NumberField (for reference, NOT for inline use)
- React Aria NumberField docs: https://react-spectrum.adobe.com/react-aria/NumberField.html
- React Aria DropZone docs: https://react-spectrum.adobe.com/react-aria/DropZone.html
- React Aria FileTrigger docs: https://react-spectrum.adobe.com/react-aria/FileTrigger.html

### Secondary (MEDIUM confidence)
- Recharts 3.8.1 verified via npm registry (2026-04-01)
- React Aria Table inline editing: no official "inline edit" pattern in docs -- pattern derived from NumberField + Table composition

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified, most already installed
- Architecture: HIGH -- follows existing portal patterns exactly
- Pitfalls: HIGH -- derived from codebase analysis and React Aria known issues

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack, no fast-moving dependencies)
