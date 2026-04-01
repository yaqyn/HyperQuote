# Phase 9: Portal Material List Builder + Quote Submission - Research

**Researched:** 2026-04-01
**Domain:** Multi-step form builder, file parsing, drag-and-drop, auto-save, approval workflows
**Confidence:** HIGH

## Summary

Phase 9 builds the core product action of HyperQuote: the material list builder inside the portal's Orders window. This is a 3-step flow (Build List -> Details -> Review & Submit) with 4 input methods (Search & Add, CSV/Excel Upload, Quick Pad, AI Assist), auto-save drafts, and buyer-side approval workflows.

The existing codebase provides strong foundations: `@hyperquote/forms` has RHF + React Aria field wrappers (NumberField, DateField, TextField, SelectField), `@hyperquote/ui` has GlassWindow/GlassElevated/StatusBadge/Skeleton/Toast, and the portal already has WindowShell, auth patterns, and the AI chat module (for AI Assist integration). The main new work is the multi-step form orchestration, product search ComboBox, file upload parsing, drag-reorder list, and the Supabase migration for quote_requests/quote_request_items/addresses/projects tables.

**Primary recommendation:** Build as a multi-step form using React Hook Form with Zustand for step state + localStorage auto-save. Use React Aria GridList with useDragAndDrop for the reorderable product list. Parse CSV client-side with PapaParse, Excel with SheetJS (from CDN). Use React Aria DropZone + FileTrigger for file upload. DatePicker with `isDateUnavailable` callback for Egyptian business day validation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-04 | Material list builder: 3-step flow (Build -> Details -> Review), 4 input methods (Search & Add, CSV/Excel upload, Quick Pad, AI Assist), auto-save drafts | All 4 input methods researched with specific React Aria components. Auto-save via localStorage + server draft. Multi-step form via RHF + Zustand step tracking. |
| PORT-13 | Buyer-side approval workflows: submit for approval action, approver notification, pending approvals tab | Requires `approval_status` column on quote_requests, RLS policy for approver role, notification trigger. Research gap filled with database design below. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

### Non-Negotiable Rules (enforced)
- **React Aria Components** for ALL interactive elements (ComboBox, NumberField, DatePicker, Tabs, TextArea, DropZone, GridList, FileTrigger)
- **`useWatch()` NEVER `watch()`** -- RHF watch() broken with React 19
- **Geist Mono for ALL numbers** -- quantities, item counts, step indicator numbers, reference numbers
- **Three colors only** -- white, black, blue (#2563EB). Semantic status colors for data only
- **Spatial glass** -- material list builder lives INSIDE WindowShell (glass window)
- **Arabic-Indic numerals** when locale is Arabic
- **All units -> Arabic translations** (kg -> كجم, ton -> طن, etc.)
- **Colors in `:root {}` NEVER `@theme`**
- **Business day validation** -- Egyptian weekend is Friday + Saturday
- **`.inputValidator()` NOT `.validator()`** for server functions
- **Motion v12** -- import from `motion/react`, spring enter, tween exit
- **CSS transitions for Popover/Menu** -- Motion only for modals (race condition #9158)
- **Bun, NOT npm** for package management

### Build Order
1. Database migration
2. Server function
3. TanStack Query hook
4. React component
5. i18n keys (AR + EN)
6. Test

## Standard Stack

### Core (already installed in portal)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| react-aria-components | ^1.16.0 | ComboBox, DatePicker, NumberField, Tabs, DropZone, FileTrigger, GridList, Dialog | Installed |
| @internationalized/date | ^3.12.0 | isWeekend, today, getLocalTimeZone for business day validation | Transitive dep of react-aria-components |
| react-hook-form | ^7.72.0 | Multi-step form state management | In @hyperquote/forms |
| @hookform/resolvers | ^5.2.2 | standardSchemaResolver for Zod validation | In @hyperquote/forms |
| zod | ^4.3.6 | Input validation schemas | Installed |
| zustand | ^5.0.12 | Step state, draft auto-save orchestration | Installed |
| fuse.js | ^7.1.0 | Client-side fuzzy product search | In STACK-DECISION, may need install in portal |
| @tanstack/react-query | ^5.95.2 | Server state (product search, draft persistence) | Via @tanstack/react-router-ssr-query |
| lucide-react | ^1.7.0 | Icons (Search, Upload, Trash2, GripVertical, ArrowLeft, Check, Pencil, CheckCircle) | Installed |
| motion | ^12.38.0 | Confirmation success animation (spring CheckCircle) | Installed |

### New Dependencies Required
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| papaparse | ^5.5.3 | CSV parsing with auto-delimiter detection, BOM handling | Client-side CSV parsing. Zero Node deps, works in browser. |
| xlsx (SheetJS CE) | 0.20.3 | Excel .xlsx parsing | Install from CDN tarball: `bun add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Do NOT use npm `xlsx` package (unmaintained, security issues). |

### Already Available in @hyperquote Packages
| Package | Components Used |
|---------|----------------|
| @hyperquote/forms | FormRoot, NumberField, DateField, TextField, SelectField, standardSchemaResolver |
| @hyperquote/ui | GlassElevated (confirmation modal), StatusBadge, Skeleton, Toast, EmptyState |
| @hyperquote/i18n | useTranslation, Arabic-Indic numeral formatting, unit translations |
| @hyperquote/types | DB enum types (quote_request_status, unit_of_measure, product_category, urgency) |
| @hyperquote/auth | getServerSession for server function auth |

**Installation:**
```bash
cd apps/portal
bun add papaparse
bun add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
bun add -d @types/papaparse
bun add fuse.js
```

## Architecture Patterns

### Recommended Project Structure
```
apps/portal/src/
├── routes/_portal/
│   ├── orders.tsx                    # Orders window (existing, add tabs + "New Quote" button)
│   └── orders_.new.tsx               # Material list builder (new route, replaces tab content)
├── components/quote-builder/
│   ├── QuoteBuilderFlow.tsx          # 3-step orchestrator (step state, navigation)
│   ├── StepIndicator.tsx             # 3-step horizontal bar with circles
│   ├── step1/
│   │   ├── BuildListStep.tsx         # Step 1 container with Tabs
│   │   ├── SearchAndAdd.tsx          # Method 1: ComboBox product search
│   │   ├── UploadMethod.tsx          # Method 2: DropZone + file parsing
│   │   ├── QuickPad.tsx              # Method 3: Spreadsheet-style grid
│   │   ├── AIAssistMethod.tsx        # Method 4: Textarea + "Parse with AI"
│   │   └── ProductListTable.tsx      # Shared reorderable product list (GridList)
│   ├── step2/
│   │   ├── DetailsStep.tsx           # Delivery address, date, notes, attachments
│   │   └── AddressComboBox.tsx       # Saved addresses + inline "Add New"
│   └── step3/
│       ├── ReviewStep.tsx            # Read-only summary with edit links
│       └── SubmitConfirmation.tsx    # Success view with reference number
├── lib/
│   ├── quote-draft.ts               # Auto-save to localStorage + server draft
│   ├── file-parser.ts               # CSV (PapaParse) + Excel (SheetJS) parsing
│   └── business-days.ts             # Egyptian weekend + holiday validation
├── hooks/
│   ├── useQuoteDraft.ts             # Auto-save hook (30s interval)
│   ├── useProductSearch.ts          # Debounced product search (fuse.js + server)
│   └── useQuoteSubmit.ts            # Submit mutation with optimistic UI
└── stores/
    └── quote-builder.ts             # Zustand: items[], step, activeMethod
```

### Pattern 1: Multi-Step Form with Zustand + RHF
**What:** Each step has its own RHF form instance. Zustand holds the cross-step state (items[], current step, draft ID). This avoids one massive form with conditional validation.
**When to use:** Always for this 3-step flow.
**Example:**
```typescript
// stores/quote-builder.ts
interface QuoteItem {
  id: string
  productId?: string
  customerDescription: string
  quantity: number
  unitOfMeasure: string
  matchedProductName?: string
  matchConfidence?: number
  notes?: string
  sortOrder: number
}

interface QuoteBuilderStore {
  step: 1 | 2 | 3
  items: QuoteItem[]
  draftId: string | null
  projectId: string | null
  deliveryAddressId: string | null
  deliveryDate: string | null
  notes: string
  attachments: File[]
  setStep: (step: 1 | 2 | 3) => void
  addItem: (item: QuoteItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<QuoteItem>) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  setItems: (items: QuoteItem[]) => void
  reset: () => void
}
```

### Pattern 2: Auto-Save Draft (localStorage primary, server secondary)
**What:** Save to localStorage every 30 seconds. Server save is debounced 5 seconds after last change. On mount, check localStorage first, then server for latest draft.
**When to use:** Always for the quote builder.
**Example:**
```typescript
// hooks/useQuoteDraft.ts
function useQuoteDraft() {
  const store = useQuoteBuilderStore()

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useQuoteBuilderStore.getState()
      localStorage.setItem('quote-draft', JSON.stringify({
        items: state.items,
        projectId: state.projectId,
        deliveryAddressId: state.deliveryAddressId,
        notes: state.notes,
        updatedAt: Date.now(),
      }))
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Restore on mount
  useEffect(() => {
    const saved = localStorage.getItem('quote-draft')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Restore items to store
    }
  }, [])
}
```

### Pattern 3: Product Search (fuse.js client + server fallback)
**What:** Load product catalog into fuse.js index on first search. Client-side fuzzy search with 150ms debounce. If client index not loaded yet, fall back to server full-text search (pg tsvector).
**When to use:** SearchAndAdd method and QuickPad SKU validation.

### Pattern 4: File Upload Parsing (client-side)
**What:** Parse CSV/Excel entirely client-side. PapaParse for CSV (auto-detect delimiters, BOM handling). SheetJS for .xlsx. Map parsed rows to QuoteItem[]. Show all validation errors at once.
**When to use:** Upload method.
**Why client-side:** Avoids Workers CPU time limits for large files. Instant feedback. No upload needed for parsing.

### Pattern 5: Reorderable Product List (React Aria GridList + useDragAndDrop)
**What:** Use React Aria's GridList component with useDragAndDrop hook for drag reorder. Each row has a `<Button slot="drag">` for the grip handle. useListData from react-stately manages the ordered collection.
**When to use:** The product list table in Step 1.
**Example:**
```typescript
import { GridList, GridListItem, Button, useDragAndDrop } from 'react-aria-components'
import { useListData } from 'react-stately'

function ProductListTable({ items, onReorder }) {
  let list = useListData({ initialItems: items, getKey: item => item.id })

  let { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map(key => ({
      'text/plain': list.getItem(key).customerDescription,
    })),
    onReorder(e) {
      if (e.target.dropPosition === 'before') {
        list.moveBefore(e.target.key, e.keys)
      } else if (e.target.dropPosition === 'after') {
        list.moveAfter(e.target.key, e.keys)
      }
    },
  })

  return (
    <GridList
      aria-label="Material list"
      items={list.items}
      dragAndDropHooks={dragAndDropHooks}
    >
      {item => (
        <GridListItem textValue={item.customerDescription}>
          <Button slot="drag"><GripVertical size={16} /></Button>
          {/* ... row content */}
        </GridListItem>
      )}
    </GridList>
  )
}
```

### Pattern 6: Egyptian Business Day Validation
**What:** Use `@internationalized/date` isWeekend with `ar-EG` locale. Friday + Saturday are weekend. Add Egyptian public holiday list.
**Example:**
```typescript
import { isWeekend, today, getLocalTimeZone } from '@internationalized/date'
import { useLocale } from 'react-aria-components'

function DeliveryDatePicker() {
  const { locale } = useLocale()
  const now = today(getLocalTimeZone())
  const tomorrow = now.add({ days: 1 })

  // Egyptian public holidays 2026 (approximate dates)
  const holidays = [/* ... */]

  const isUnavailable = (date: DateValue) => {
    // isWeekend with ar-EG locale returns true for Friday + Saturday
    if (isWeekend(date, 'ar-EG')) return true
    // Check public holidays
    return holidays.some(h => date.compare(h) === 0)
  }

  return (
    <DatePicker
      minValue={tomorrow}
      isDateUnavailable={isUnavailable}
      // ...
    />
  )
}
```

### Anti-Patterns to Avoid
- **One giant RHF form for all 3 steps:** Causes validation issues, slow re-renders. Use Zustand for cross-step state.
- **Server-side file parsing:** Workers have 30s CPU limit. Large Excel files could timeout. Parse client-side.
- **`watch()` anywhere:** Broken with React 19. Always `useWatch()`.
- **Custom drag-and-drop:** React Aria's useDragAndDrop is accessible (keyboard + screen reader). Never roll custom.
- **Saving drafts only to server:** Network failures lose work. localStorage is primary, server is backup.
- **Failing on first CSV error:** Spec requires ALL errors shown at once. Validate entire file, collect all errors, display error table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom CSV parser | PapaParse | Handles BOM, auto-detects delimiters (comma/semicolon/tab), handles quoted fields, malformed input |
| Excel parsing | Custom .xlsx reader | SheetJS (xlsx) | Binary format is complex, handles cell types, merged cells, date formats |
| Drag reorder | Custom drag-and-drop | React Aria useDragAndDrop + GridList | Accessible (keyboard, screen reader), handles touch, handles RTL |
| Date validation | Manual day-of-week check | @internationalized/date isWeekend | Locale-aware (ar-EG knows Friday/Saturday), handles calendar systems |
| Fuzzy search | Custom search algorithm | fuse.js | Handles typos, partial matches, weighted scoring, Arabic text |
| File drop zone | Custom drag events | React Aria DropZone + FileTrigger | Accessible, handles keyboard paste as alternative |
| Multi-step form state | Custom context provider | Zustand store | Persistent, debuggable, no prop drilling, works with localStorage |

**Key insight:** Every "simple" feature in this phase (CSV parsing, drag reorder, date validation) has edge cases that justify using a battle-tested library. The spec explicitly calls out messy file handling, accessibility, and RTL support -- all areas where hand-rolling fails.

## Common Pitfalls

### Pitfall 1: SheetJS npm Package is Unmaintained
**What goes wrong:** Installing `xlsx` from npm gets an outdated, insecure version (0.18.5).
**Why it happens:** SheetJS moved distribution to their own CDN in 2022. The npm registry version is frozen.
**How to avoid:** Install from CDN tarball: `bun add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
**Warning signs:** If `xlsx` version is 0.18.x, it's the wrong package.

### Pitfall 2: React Aria GridList Drag Requires Button slot="drag"
**What goes wrong:** Drag handles don't work for keyboard/screen reader users.
**Why it happens:** React Aria requires an explicit `<Button slot="drag">` in each GridListItem for accessible drag.
**How to avoid:** Always include `<Button slot="drag">` with the GripVertical icon.
**Warning signs:** Drag works with mouse but not keyboard.

### Pitfall 3: PapaParse BOM + Delimiter Edge Cases
**What goes wrong:** UTF-8 files with BOM character (\ufeff) cause first column header to include invisible characters. Semicolon-delimited files parsed as single column.
**Why it happens:** Some Excel exports add BOM. European locales use semicolons as CSV delimiter.
**How to avoid:** PapaParse handles both automatically when configured correctly: `{ header: true, skipEmptyLines: true, dynamicTyping: false }`. Check `results.meta.delimiter` after parse.
**Warning signs:** First column name has invisible prefix, or all data in one column.

### Pitfall 4: Auto-Save Race Condition
**What goes wrong:** Server draft save and localStorage save conflict, or stale data overwrites newer data.
**Why it happens:** 30-second localStorage interval and debounced server save operate independently.
**How to avoid:** Use timestamps on both saves. On restore, compare `updatedAt` from localStorage vs server, use newer one. Never auto-save during active user editing (debounce).
**Warning signs:** User returns to find old data despite having saved.

### Pitfall 5: isWeekend Locale Sensitivity
**What goes wrong:** Using isWeekend without specifying locale defaults to Western weekend (Sat/Sun instead of Fri/Sat).
**Why it happens:** The `isWeekend` function from @internationalized/date uses the locale parameter to determine which days are weekends.
**How to avoid:** Always pass `'ar-EG'` as the locale parameter, regardless of the user's display locale setting.
**Warning signs:** Sunday is marked as weekend, Friday is not.

### Pitfall 6: File Upload on Cloudflare Workers
**What goes wrong:** Large file uploads fail or timeout on Workers.
**Why it happens:** Workers have strict CPU and memory limits. Default formData parsing loads entire file into memory.
**How to avoid:** Parse files client-side (browser). Only send the parsed structured data (items array) to the server function. Upload raw files (drawings/specs attachments) to R2 via presigned URL.
**Warning signs:** 413 or timeout errors on file upload.

### Pitfall 7: React Aria ComboBox with Autocomplete
**What goes wrong:** Product search ComboBox doesn't show results or has stale results.
**Why it happens:** React Aria ComboBox manages its own input state. Need to wire it correctly with external async data source.
**How to avoid:** Use `items` prop with controlled async loading. Debounce the `onInputChange` callback (150ms per spec). Use `menuTrigger="input"` so dropdown opens on typing.
**Warning signs:** Dropdown empty despite products existing, or results from previous search shown.

## Code Examples

### CSV/Excel Parsing (client-side)
```typescript
// lib/file-parser.ts
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface ParsedRow {
  productName?: string
  sku?: string
  quantity?: number
  uom?: string
  notes?: string
  rowNumber: number
}

interface ParseError {
  rowNumber: number
  field: string
  value: string
  expected: string
}

interface ParseResult {
  items: ParsedRow[]
  errors: ParseError[]
  totalRows: number
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings, validate manually
      complete(results) {
        const items: ParsedRow[] = []
        const errors: ParseError[] = []

        results.data.forEach((row: any, index: number) => {
          const rowNumber = index + 2 // +2 for header + 0-index
          const qty = Number(row['Quantity'] ?? row['qty'] ?? row['الكمية'])

          if (!row['Product Name'] && !row['SKU'] && !row['اسم المنتج']) {
            errors.push({ rowNumber, field: 'Product', value: '', expected: 'Product name or SKU' })
          }
          if (isNaN(qty) || qty <= 0) {
            errors.push({ rowNumber, field: 'Quantity', value: String(row['Quantity'] ?? ''), expected: 'Number > 0' })
          }

          items.push({
            productName: row['Product Name'] ?? row['اسم المنتج'] ?? '',
            sku: row['SKU'] ?? row['الرمز'] ?? '',
            quantity: isNaN(qty) ? 0 : qty,
            uom: row['UOM'] ?? row['Unit'] ?? row['الوحدة'] ?? '',
            notes: row['Notes'] ?? row['ملاحظات'] ?? '',
            rowNumber,
          })
        })

        resolve({ items, errors, totalRows: results.data.length })
      },
    })
  })
}

export function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
      // Process similar to CSV...
      resolve({ items: [], errors: [], totalRows: jsonData.length })
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function detectFileType(file: File): 'csv' | 'xlsx' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return 'csv'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  // Check magic bytes for .xlsx renamed as .csv
  return 'unknown'
}
```

### React Aria DropZone + FileTrigger
```typescript
// Source: https://react-aria.adobe.com/DropZone
import { DropZone, FileTrigger, Button, Text } from 'react-aria-components'
import { Upload } from 'lucide-react'

function FileUploadArea({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <DropZone
      onDropEnter={() => setIsDragging(true)}
      onDropExit={() => setIsDragging(false)}
      onDrop={async (e) => {
        setIsDragging(false)
        const files = e.items.filter(item => item.kind === 'file')
        if (files.length > 0) {
          const file = await (files[0] as any).getFile()
          onFileSelected(file)
        }
      }}
      className={/* 200px height, dashed border, rounded-xl */}
    >
      <Upload size={32} className="text-[var(--color-text-subtle)]" />
      <Text slot="label">Drop your file here or click to browse</Text>
      <FileTrigger
        acceptedFileTypes={['.csv', '.xlsx', '.xls']}
        onChange={(e) => {
          const files = e ? Array.from(e) : []
          if (files[0]) onFileSelected(files[0])
        }}
      >
        <Button>Browse Files</Button>
      </FileTrigger>
    </DropZone>
  )
}
```

### Server Function Pattern (submitQuoteRequest)
```typescript
// Following existing pattern from apps/portal/src/lib/auth.ts and chat.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getServerSession } from '@hyperquote/auth'

const submitQuoteRequestInput = z.object({
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    customerDescription: z.string().min(1),
    quantity: z.number().positive(),
    unitOfMeasure: z.string(),
    notes: z.string().optional(),
    sortOrder: z.number(),
  })),
  deliveryAddressId: z.string().uuid().optional(),
  deliveryDate: z.string().optional(), // ISO date
  notes: z.string().optional(),
  projectId: z.string().uuid().optional(),
  attachmentUrls: z.array(z.string().url()).optional(),
  idempotencyKey: z.string().uuid(), // Required per CLAUDE.md
})

export const submitQuoteRequest = createServerFn()
  .inputValidator(submitQuoteRequestInput)
  .handler(async ({ data: input }) => {
    const session = await getServerSession({
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    })
    if (!session) throw new Error('Unauthorized')

    // Insert quote_request + quote_request_items
    // Generate request_number (QR-2026-XXXXX)
    // Return { requestId, reference }
  })
```

### Buyer-Side Approval Workflow
```typescript
// Database: Add approval columns to quote_requests or use separate approvals table
// PORT-13 requires: submit for approval action, approver notification, pending approvals tab

// Option: Use existing approvals table pattern (from enums: approval_status, approval_type)
// When customer_user submits, if team has approver role:
//   1. Set quote_request status to 'draft' with approval_required = true
//   2. Insert into approvals table
//   3. Trigger notification to approver
// When approver approves:
//   1. Update approval status
//   2. Auto-submit the quote request (status -> 'submitted')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SheetJS from npm | SheetJS from CDN tarball | 2022 | Must use `bun add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| react-dnd for drag reorder | React Aria useDragAndDrop | 2023+ | Built-in accessibility, no extra library needed |
| Custom file drop handlers | React Aria DropZone + FileTrigger | 2023+ | Accessible, keyboard paste fallback, standardized API |
| zodResolver | standardSchemaResolver | 2025 | Already in @hyperquote/forms, use standardSchemaResolver |
| framer-motion | motion (v12+) | 2024 | Import from `motion/react`, already in project |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (browser mode for React Aria) |
| Config file | Needs setup in portal if not present |
| Quick run command | `bun run vitest run --reporter=verbose` |
| Full suite command | `bun run vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-04 | 3-step flow completes and creates quote_request | integration | `vitest run tests/quote-builder.test.tsx` | Wave 0 |
| PORT-04 | Search & Add finds products via fuse.js | unit | `vitest run tests/product-search.test.ts` | Wave 0 |
| PORT-04 | CSV upload parses messy files correctly | unit | `vitest run tests/file-parser.test.ts` | Wave 0 |
| PORT-04 | Excel upload parses .xlsx files | unit | `vitest run tests/file-parser.test.ts` | Wave 0 |
| PORT-04 | Auto-save preserves draft in localStorage | unit | `vitest run tests/quote-draft.test.ts` | Wave 0 |
| PORT-04 | Business day validation blocks Friday/Saturday | unit | `vitest run tests/business-days.test.ts` | Wave 0 |
| PORT-13 | Submit for approval creates approval record | integration | `vitest run tests/approval-workflow.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run vitest run --reporter=verbose`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/file-parser.test.ts` -- CSV/Excel parsing with edge cases (BOM, delimiters, Arabic headers)
- [ ] `tests/business-days.test.ts` -- Egyptian weekend + holiday validation
- [ ] `tests/product-search.test.ts` -- fuse.js fuzzy matching
- [ ] `tests/quote-draft.test.ts` -- localStorage auto-save/restore

## Open Questions

1. **Approvals table structure**
   - What we know: enums exist (approval_status, approval_type). PORT-13 requires approver notification.
   - What's unclear: Whether to use a separate `approvals` table or add approval columns directly to `quote_requests`. The `approvals` table from migration 003 exists but is generic.
   - Recommendation: Use the existing `approvals` table pattern. Add `approval_required BOOLEAN DEFAULT FALSE` and `approved_by UUID` to quote_requests. Create an approval record when team member submits.

2. **Product catalog size for client-side search**
   - What we know: fuse.js is specified for client-side search. Products table has full-text search via tsvector.
   - What's unclear: How many products will exist at launch. If >10K, client-side fuse.js index could be large.
   - Recommendation: Load first 500 products into fuse.js on first search. If no match found, fall back to server-side tsvector search. Paginate the fuse.js index.

3. **File attachment storage**
   - What we know: R2 for public assets, Supabase Storage for authenticated files. Spec says max 5 files, 10MB each.
   - What's unclear: Which storage to use for quote request attachments (drawings/specs).
   - Recommendation: Use Supabase Storage with presigned upload URLs. Files are customer-specific, need auth. Store URLs in quote_requests.attachment_urls JSONB column.

4. **AI Assist integration depth**
   - What we know: Phase 8 built the AI chat with mock streaming. AI Assist method needs `parseWithAI()` server function.
   - What's unclear: Whether to reuse the existing portalChatFn or create a separate function.
   - Recommendation: Create a separate `parseWithAI` server function that returns structured items (not chat stream). Mock it now (keyword matching), Phase 30 swaps with real AI.

## Sources

### Primary (HIGH confidence)
- [React Aria GridList + useDragAndDrop](https://react-aria.adobe.com/GridList) -- drag reorder API, Button slot="drag" requirement
- [React Aria DatePicker isDateUnavailable](https://react-aria.adobe.com/DatePicker) -- business day validation with isWeekend
- [React Aria DropZone + FileTrigger](https://react-aria.adobe.com/DropZone) -- accessible file upload
- Existing codebase: portal auth pattern (`apps/portal/src/lib/auth.ts`), WindowShell component, forms package, chat module
- Existing migrations: products table schema, enums (quote_request_status, unit_of_measure)

### Secondary (MEDIUM confidence)
- [PapaParse docs](https://www.papaparse.com/docs) -- CSV parsing with auto-delimiter detection
- [SheetJS CDN](https://cdn.sheetjs.com/) -- maintained Excel parser (v0.20.3)
- [@internationalized/date](https://www.npmjs.com/package/@internationalized/date) -- isWeekend locale support for ar-EG

### Tertiary (LOW confidence)
- Approval workflow design -- based on existing enum patterns, needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified in existing codebase or official docs
- Architecture: HIGH -- follows established portal patterns (WindowShell, server functions, Zustand stores)
- File parsing: HIGH -- PapaParse and SheetJS are well-documented, Workers-compatible
- Drag reorder: HIGH -- React Aria official docs with complete examples
- Business day validation: HIGH -- @internationalized/date isWeekend with locale parameter
- Approval workflows: MEDIUM -- enums exist, but table design needs validation during implementation

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable libraries, locked versions)
