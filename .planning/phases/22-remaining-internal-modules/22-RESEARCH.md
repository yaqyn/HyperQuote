# Phase 22: Remaining Internal Modules - Research

**Researched:** 2026-04-06
**Domain:** Internal platform modules (CS, HR, Admin, Reports, AI Assistant)
**Confidence:** HIGH

## Summary

Phase 22 builds five remaining internal platform modules: Customer Service, HR, Admin, Reports, and AI Assistant. All five follow the identical architectural pattern established across Phases 16-21 (Sales, Procurement, Operations, Warehouse, Finance, Dispatch). Each module needs: types file, Zustand store, tab strip, shortcuts, module root component, server functions with mock data, i18n namespaces (AR+EN), and tab-specific view components.

The codebase has a mature, consistent pattern. Six modules already exist with the same structure: `{Module}Module.tsx` root component, `{module}Store` Zustand store with `activeTab` + entity selection, `{Module}TabStrip.tsx` using React Aria `Tabs`, `{Module}Shortcuts.tsx` with `useShortcut` + G-prefix pattern, and server functions in `lib/server/` returning mock data. The `ModuleWindow.tsx` lazy-loads each module and needs five new entries for Phase 22.

**Primary recommendation:** Follow the established module pattern exactly. Each module is a copy-adapt of the Finance/Dispatch pattern. WhatsApp inbox and AI chat UI reuse the portal's `ChatMessages`/`ChatBubble` pattern. All server functions return mock data -- real integrations come in Phases 27 (WhatsApp) and 30 (AI pipeline).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No explicit CONTEXT.md decisions section found. CONTEXT.md contains detailed requirements and spec references that serve as the locked scope.

### Key Locked Items from CONTEXT.md
- WhatsApp inbox requires WhatsApp Cloud API (Phase 27) -- Phase 22 builds UI with mock data
- AI assistant requires AI Pipeline (Phase 30) -- build chat UI and routing infrastructure, mock AI responses
- Report Builder deferred to Phase 2 -- only pre-built role-specific reports
- Holiday calendar must support "estimated" vs "confirmed" date fields (Islamic lunar calendar)
- Audit log is WORM (append-only, never delete or modify)
- Prioritize CS and Admin first
- AI module uses `useChat()` from @tanstack/ai-react

### Deferred Ideas (OUT OF SCOPE)
- Report Builder (drag-and-drop, custom aggregations, chart type selection) -- Phase 2
- WhatsApp Cloud API integration -- Phase 27
- AI pipeline (Cloudflare AI Gateway, embeddings, RAG) -- Phase 30
- Phase 2/3 HR features: self-service, commissions, org chart, payroll, performance reviews, training, recruitment
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CS-01 | Customer Service: WhatsApp inbox, ticket management (10-status flow), SLA tracking, returns & claims workflow, AI triage | Established module pattern + portal chat UI pattern for WhatsApp inbox; TicketStatus enum (10 states) exists in enums.ts; SLA constants from CONTEXT.md spec |
| HR-01 | HR: employee directory, driver compliance (CDL/medical/drug test blocks dispatch), attendance, leave management | EgyptianLicenseClass enum exists; ComplianceStatus type in dispatch types reusable; Egyptian labor law constants from CONTEXT.md |
| ADM-01 | Admin: users/roles/permissions, system settings, margin rules, approval thresholds, holiday calendar, audit log | AppRole (34 roles) + AppPermission (76 permissions) enums exist; AuditAction enum exists; WORM pattern for audit log |
| RPT-01 | Reports: role-specific pre-built reports with date range/filter/export | 7 role dashboards specified in CONTEXT.md; CSV/PDF export; recurring email scheduling |
| AI-01 | AI Assistant: chat interface in glass window, role-aware capabilities, safety guardrails | Portal usePortalChat pattern exists with @tanstack/ai-react useChat + stream(); AG-UI protocol for mock streaming |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-aria-components | ^1.16.0 | All UI primitives (Tabs, Button, Dialog, etc.) | Project mandate -- NOT shadcn |
| zustand | ^5.0.12 | Module UI state (active tab, selections) | Established pattern across 6 modules |
| @tanstack/react-query | ^5.x | Server state fetching | staleTime-based caching, mock server fns |
| @tanstack/ai-react | ^0.x | AI chat (useChat + stream) | Portal pattern established, Phase 30 swap |
| react-i18next | ^25.10.10 | i18n with AR/EN namespaces | Type-safe keys, Arabic-Indic numerals |
| motion | ^12.38.0 | Window animations only | Import from `motion/react` |
| lucide-react | * | Module icons | Already registered in modules.ts |
| react-hook-form | ^7.72.0 | Forms (tickets, leave requests, settings) | useWatch() pattern, standardSchemaResolver |
| zod | ^3.x | Validation schemas | inputValidator on server functions |

### No New Dependencies Required
All five modules can be built with the existing installed stack. No new packages needed.

## Architecture Patterns

### Established Module Structure (Copy for All 5 Modules)
```
apps/internal/src/
  types/
    customer-service.ts    # Tab union, entity interfaces
    hr.ts
    admin.ts
    reports.ts
    ai.ts
  stores/
    customer-service.ts    # Zustand: activeTab + entity selection
    hr.ts
    admin.ts
    reports.ts
    ai.ts
  components/
    customer-service/
      CustomerServiceModule.tsx    # Root: tab switch
      CustomerServiceTabStrip.tsx  # React Aria Tabs
      CustomerServiceShortcuts.tsx # useShortcut + G-prefix
      home/
        CSHome.tsx                 # Dashboard cards
      whatsapp/
        WhatsAppInbox.tsx          # Chat interface (mock)
      tickets/
        TicketList.tsx
        TicketDetail.tsx
      returns/
        ReturnsClaims.tsx
      knowledge-base/
        KnowledgeBase.tsx
    hr/
      HRModule.tsx
      HRTabStrip.tsx
      HRShortcuts.tsx
      home/HRHome.tsx
      employees/EmployeeDirectory.tsx, EmployeeProfile.tsx
      compliance/DriverCompliance.tsx
      leave/LeaveManagement.tsx
      attendance/AttendanceDashboard.tsx
    admin/
      AdminModule.tsx
      AdminTabStrip.tsx
      AdminShortcuts.tsx
      users/UserList.tsx, RoleManagement.tsx
      settings/SystemSettings.tsx
      margins/MarginRules.tsx
      approvals/ApprovalThresholds.tsx
      holidays/HolidayCalendar.tsx
      audit/AuditLogViewer.tsx
    reports/
      ReportsModule.tsx
      ReportsTabStrip.tsx
      ReportsShortcuts.tsx
      dashboards/
        SalesDashboard.tsx
        ProcurementDashboard.tsx
        OperationsDashboard.tsx
        FinanceDashboard.tsx
        WarehouseDashboard.tsx
        DispatchDashboard.tsx
        CSDashboard.tsx
    ai/
      AIModule.tsx
      AIShortcuts.tsx
      chat/
        AIChatInterface.tsx
        AIMessageBubble.tsx
        SuggestedPrompts.tsx
  lib/server/
    customer-service.ts    # getTicketQueue, respondToTicket, etc.
    hr.ts                  # getEmployeeDirectory, getDriverCompliance, etc.
    admin.ts               # getSystemConfig, getUserList, getAuditLog, etc.
    reports.ts             # getDashboardData (role-parameterized)
    ai-assistant.ts        # askAI, getAISuggestion (mock)
  locales/
    en/customer-service.json, hr.json, admin.json, reports.json, ai.json
    ar/customer-service.json, hr.json, admin.json, reports.json, ai.json
```

### Pattern 1: Module Root Component
**What:** Switch on `activeTab` from Zustand store, render tab content
**When to use:** Every module root
**Example:**
```typescript
// Source: apps/internal/src/components/finance/FinanceModule.tsx
export function CustomerServiceModule() {
  const activeTab = useCustomerServiceStore((s) => s.activeTab)
  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <CSHome />
      case 'whatsapp': return <WhatsAppInbox />
      case 'tickets': return <TicketList />
      case 'returns': return <ReturnsClaims />
      case 'knowledge-base': return <KnowledgeBase />
      default: return null
    }
  }
  return (
    <div className="flex flex-col h-full">
      <CustomerServiceShortcuts />
      <CustomerServiceTabStrip />
      <div className="flex-1 overflow-auto">{renderTab()}</div>
    </div>
  )
}
```

### Pattern 2: Zustand Module Store
**What:** UI state only -- active tab + entity selections
**When to use:** Every module
**Example:**
```typescript
// Source: apps/internal/src/stores/dispatch.ts
export const useCustomerServiceStore = create<CSStore>()((set) => ({
  activeTab: 'home' as CSTab,
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedTicketId: null,
  setSelectedTicketId: (id) => set({ selectedTicketId: id }),
}))
```

### Pattern 3: Server Functions with Mock Data
**What:** `createServerFn` returning typed mock data arrays
**When to use:** All data fetching
**Example:**
```typescript
// Source: apps/internal/src/lib/server/dispatch.ts
export const getTicketQueue = createServerFn({ method: 'GET' })
  .handler(async () => {
    return MOCK_TICKETS
  })
```

### Pattern 4: ModuleWindow Lazy Loading
**What:** Add lazy import + Suspense case in ModuleWindow.tsx
**When to use:** Each new module must be registered
**Example:**
```typescript
const CustomerServiceModule = lazy(() =>
  import('../customer-service/CustomerServiceModule').then((m) => ({ default: m.CustomerServiceModule })),
)
// ... in render:
moduleId === 'customer-service' ? (
  <Suspense fallback={<Spinner />}><CustomerServiceModule /></Suspense>
) : ...
```

### Pattern 5: AI Chat with @tanstack/ai-react
**What:** Reuse portal's `useChat` + `stream()` pattern for internal AI module
**When to use:** AI-01 module
**Example:**
```typescript
// Source: apps/portal/src/hooks/usePortalChat.ts
const chat = useChat({
  connection: stream(async function* (messages) {
    const chunks = await aiChatFn({ data: { messages, role: userRole } })
    yield* arrayToAsyncIterable(chunks)
  }),
})
```

### Anti-Patterns to Avoid
- **Direct TanStack Query in components:** Always wrap server functions through `createServerFn`, consume via `useQuery` with `queryKey` + `queryFn`
- **Inline mock data in components:** All mock data goes in `lib/server/*.ts` files, never in view components
- **Mixed UI/server state in Zustand:** Zustand for UI only (tabs, selections), TanStack Query for server data
- **Using `watch()` instead of `useWatch()`:** React 19 breaks `watch()` -- always `useWatch()`
- **Using `@theme` for colors:** Colors in `:root {}` only
- **Disabled elements for permissions:** HIDDEN not disabled -- don't render unauthorized elements

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab navigation | Custom tab logic | React Aria `Tabs`/`TabList`/`Tab` | RTL, keyboard nav, ARIA labels |
| Form validation | Manual field checks | RHF + Zod + `standardSchemaResolver` | useWatch, error states, i18n |
| Chat streaming | Custom WebSocket | `@tanstack/ai-react` `useChat` + `stream()` | AG-UI protocol, Phase 30 swap |
| Data tables | Custom table | Existing pattern from Finance modules | Sort, filter, pagination |
| Date/time display | Manual formatting | `@hyperquote/i18n` `DateDisplay` | Arabic-Indic, Cairo timezone |
| Currency display | Manual formatting | `@hyperquote/i18n` `CurrencyDisplay` | EGP, Geist Mono, Arabic-Indic |
| Number display | Manual Intl.NumberFormat | `@hyperquote/i18n` number formatter | Arabic-Indic numerals |
| Glass panel styling | Custom glass CSS | Established `GlassPanel` pattern from FinanceHome | Consistent blur, border, bg |
| SLA countdown | Manual timer | Computed from `created_at` + priority constants | Server-driven, no drift |

## Common Pitfalls

### Pitfall 1: WhatsApp Inbox vs. Real WhatsApp API
**What goes wrong:** Building complex WebSocket/webhook infrastructure for WhatsApp
**Why it happens:** CONTEXT.md explicitly says WhatsApp Cloud API is Phase 27
**How to avoid:** Build the chat UI layout (conversation list + message thread + triage panel) with mock conversations. All message sending is mock. Real integration is Phase 27.
**Warning signs:** Any import of WhatsApp SDK or webhook handlers

### Pitfall 2: AI Assistant Building Real AI Pipeline
**What goes wrong:** Trying to implement actual LLM routing, embeddings, or text-to-SQL
**Why it happens:** AI-01 spec is detailed about capabilities
**How to avoid:** Build chat UI with mock AG-UI streaming responses (same pattern as portal). Role-aware suggested prompts are static. Real AI pipeline is Phase 30. The `askAI` server function returns canned AG-UI chunks based on message content keywords.
**Warning signs:** Any import of OpenAI/Anthropic SDKs, pgvector queries, or Cloudflare AI Gateway

### Pitfall 3: Report Builder Scope Creep
**What goes wrong:** Building custom aggregation, chart selection, drag-and-drop
**Why it happens:** CONTEXT.md Section 10.2 describes Report Builder in detail
**How to avoid:** Phase 1 = pre-built role-specific dashboards with: date range picker, department/team filter, CSV/PDF export buttons, and scheduled email toggle. NO chart type selection, NO custom field selection, NO saved templates.
**Warning signs:** Any chart library imports beyond simple KPI display

### Pitfall 4: Audit Log Mutability
**What goes wrong:** Building CRUD for audit log entries
**Why it happens:** Standard table pattern includes update/delete
**How to avoid:** Audit log is WORM (Write Once Read Many). The viewer is READ-ONLY: search, filter, paginate, export. No edit, no delete, no soft-delete. Server function only has `getAuditLog` -- no create/update/delete functions.
**Warning signs:** Any mutation server functions for audit entries

### Pitfall 5: Holiday Calendar Islamic Date Complexity
**What goes wrong:** Trying to compute Islamic dates algorithmically
**Why it happens:** Islamic calendar depends on moon sighting, not math
**How to avoid:** Holiday calendar stores `estimated_date` and `confirmed_date` fields. Pre-load 14-15 Egyptian holidays with estimated dates. Admin manually confirms when government announces. No astronomical computation.
**Warning signs:** Import of any hijri-calendar computation library

### Pitfall 6: Driver Compliance Dispatch Integration
**What goes wrong:** Building the dispatch-blocking logic in the HR module
**Why it happens:** HR-01 says "blocks dispatch if expired"
**How to avoid:** HR module displays compliance status (Green/Yellow/Red). The actual blocking happens in dispatch's route assignment logic (already built in Phase 21). HR's job is to track expiry dates and show alerts. A shared `getDriverCompliance` server function returns status that both modules consume.
**Warning signs:** HR module importing dispatch store or dispatch server functions

### Pitfall 7: Ticket Status 10 vs. UI 6-Step Flow
**What goes wrong:** Building two separate state machines
**Why it happens:** CONTEXT.md notes "FRONTEND.md UI shows a 6-step flow but the full enum has 10 valid states"
**How to avoid:** Use all 10 TicketStatus enum values from `enums.ts`. The 6-step UI flow is the visual representation (a status stepper showing progression), but dropdowns and status badges show all 10 states. The 6-step is visual grouping, not a constraint.
**Warning signs:** Hardcoding only 6 statuses, or creating a parallel enum

## Code Examples

### Module Store Pattern
```typescript
// Source: Established pattern from apps/internal/src/stores/finance.ts
import { create } from 'zustand'

export type CSTab = 'home' | 'whatsapp' | 'tickets' | 'returns' | 'knowledge-base'

interface CustomerServiceStore {
  activeTab: CSTab
  setActiveTab: (tab: CSTab) => void
  selectedTicketId: string | null
  setSelectedTicketId: (id: string | null) => void
  selectedConversationId: string | null
  setSelectedConversationId: (id: string | null) => void
}

export const useCustomerServiceStore = create<CustomerServiceStore>()((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedTicketId: null,
  setSelectedTicketId: (id) => set({ selectedTicketId: id }),
  selectedConversationId: null,
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
}))
```

### Tab Strip Pattern
```typescript
// Source: Established pattern from apps/internal/src/components/finance/FinanceTabStrip.tsx
import { Tab, TabList, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useCustomerServiceStore } from '../../stores/customer-service'
import type { CSTab } from '../../stores/customer-service'

const TAB_KEYS: CSTab[] = ['home', 'whatsapp', 'tickets', 'returns', 'knowledge-base']

export function CSTabStrip() {
  const { t } = useTranslation('customer-service')
  const activeTab = useCustomerServiceStore((s) => s.activeTab)
  const setActiveTab = useCustomerServiceStore((s) => s.setActiveTab)
  return (
    <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as CSTab)}>
      <TabList aria-label={t('tabs.home', 'Customer Service')}
        className="flex overflow-x-auto border-b border-black/10 dark:border-white/10 px-4 gap-1">
        {TAB_KEYS.map((key) => (
          <Tab key={key} id={key}
            className="shrink-0 cursor-pointer whitespace-nowrap px-3 py-2.5 text-sm font-medium text-black/60 dark:text-white/60 outline-none transition-colors
              data-[selected]:text-[#2563EB] data-[selected]:border-b-2 data-[selected]:border-[#2563EB]
              data-[hovered]:text-black/80 dark:data-[hovered]:text-white/80
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 rounded-t">
            {t(`tabs.${key}`, key)}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  )
}
```

### SLA Constants
```typescript
// Source: CONTEXT.md spec
export const SLA_CONFIG = {
  critical: { firstResponse: 15, resolution: 240 },    // minutes
  high:     { firstResponse: 60, resolution: 480 },
  medium:   { firstResponse: 240, resolution: 1440 },   // 'medium' per enum, not 'normal'
  low:      { firstResponse: 480, resolution: 2880 },
} as const
```

### Damage Claim Tier Classification
```typescript
// Source: CONTEXT.md spec
export const DAMAGE_TIERS = {
  minor:    { maxPercent: 5,  autoApprove: true,  inspectionHours: null },
  moderate: { maxPercent: 20, autoApprove: false, inspectionHours: 48 },
  major:    { maxPercent: 100, autoApprove: false, inspectionHours: 24 },  // third-party
} as const
```

### Egyptian Labor Law Leave Constants
```typescript
// Source: CONTEXT.md spec (Law 14/2025)
export const LEAVE_ALLOWANCES = {
  annual_first_year: 15,
  annual_after_year: 21,
  annual_after_10_years_or_50: 30,
  maternity_days: 120,
  maternity_max_times: 3,
  paternity_days: 1,
  sick_total_days: 180,
  sick_first_90_pay_percent: 75,
  sick_next_90_pay_percent: 85,
  mandatory_annual_increase_percent: 3,
} as const
```

### Overtime Calculation Constants
```typescript
// Source: CONTEXT.md spec
export const OVERTIME_RATES = {
  day: 1.35,
  night: 1.70,
  holiday: 2.00,
} as const

export const WORKING_HOURS = {
  standard_per_day: 8,
  standard_per_week: 48,
  ramadan_per_day: 6,
} as const
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Placeholder modules (coming soon) | Fully built module per phase | Phase 16+ | ModuleWindow.tsx currently shows placeholder for unbuilt modules |
| Direct store access in components | Server functions -> useQuery -> components | Phase 16+ | All data through createServerFn |
| Generic tab component | React Aria Tabs with i18n | Phase 16+ | Consistent across all modules |

**Key enumeration note:** TicketPriority enum uses `medium` not `normal`. Phase 14 decision [Phase 14]: "ticket_priority DEFAULT 'medium' not 'normal' -- enum has no 'normal' value". The CONTEXT.md SLA table says "Normal" but the DB enum is `medium`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | apps/portal/vitest.config.ts (exists); apps/internal needs setup |
| Quick run command | `bun test --filter internal` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CS-01 | Ticket status transitions follow 10-state enum | unit | `bun vitest run apps/internal/src/components/customer-service/__tests__/ticket-status.test.ts` | Wave 0 |
| CS-01 | SLA countdown computes correctly from priority | unit | `bun vitest run apps/internal/src/lib/__tests__/sla.test.ts` | Wave 0 |
| HR-01 | Compliance status derived from expiry dates | unit | `bun vitest run apps/internal/src/lib/__tests__/compliance.test.ts` | Wave 0 |
| HR-01 | Leave allowance follows Egyptian labor law | unit | `bun vitest run apps/internal/src/lib/__tests__/leave-rules.test.ts` | Wave 0 |
| ADM-01 | Audit log query returns paginated results | unit | `bun vitest run apps/internal/src/lib/server/__tests__/admin.test.ts` | Wave 0 |
| RPT-01 | Role-specific dashboard returns correct KPIs | unit | `bun vitest run apps/internal/src/lib/server/__tests__/reports.test.ts` | Wave 0 |
| AI-01 | useInternalChat returns mock streaming messages | unit | `bun vitest run apps/internal/src/hooks/__tests__/useInternalChat.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun vitest run --reporter=verbose` (quick, specific test file)
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/internal/vitest.config.ts` -- may need creation (portal has one, check if internal does)
- [ ] Test files listed above -- all need creation
- [ ] SLA computation utility -- needs to be extracted as testable pure function

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/internal/src/components/*/` -- 6 existing module patterns
- Codebase inspection: `apps/internal/src/stores/*.ts` -- Zustand store patterns
- Codebase inspection: `apps/internal/src/lib/server/*.ts` -- Server function patterns
- Codebase inspection: `apps/portal/src/hooks/usePortalChat.ts` -- AI chat pattern
- Codebase inspection: `packages/types/src/enums.ts` -- All relevant enums exist
- CONTEXT.md: Full spec for all 5 modules

### Secondary (MEDIUM confidence)
- Phase 14 decisions on enum value mismatches (medium vs normal for ticket priority)
- Module registration in `lib/modules.ts` (all 11 modules pre-registered with icons and hotkeys)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns established
- Architecture: HIGH - six identical modules exist as templates
- Pitfalls: HIGH - scope boundaries clearly documented in CONTEXT.md
- AI chat pattern: HIGH - portal implementation exists as reference

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependency changes expected)
