---
phase: 09-portal-material-list-builder-quote-submission
plan: 01
subsystem: database, api, state
tags: [supabase, zustand, papaparse, xlsx, fuse.js, rls, quote-requests]

requires:
  - phase: 02-supabase-initial-migrations
    provides: enums (quote_request_status, unit_of_measure, urgency, approval_status), tenants, user_profiles, approvals tables, auth helper functions
  - phase: 07-portal-auth-shell
    provides: portal auth pattern, WindowShell, Zustand store conventions
  - phase: 08-portal-ai-chat
    provides: server function pattern with dev mode fallback, chat store persist pattern

provides:
  - quote_requests, quote_request_items, customer_addresses, projects, quote_request_attachments tables with RLS
  - generate_request_number() function (QR-YYYY-NNNNN pattern)
  - submitQuoteRequest, saveDraft, getDrafts, parseWithAI server functions
  - getCustomerAddresses, createAddress, getCustomerProjects, createProject server functions
  - searchProducts, getProductCatalog server functions with PUBLIC_COLUMNS whitelist
  - useQuoteBuilderStore Zustand store for multi-step quote builder state
  - file-parser utilities for CSV (PapaParse) and Excel (SheetJS) with Arabic header mapping
  - business-days utilities for Egyptian weekend/holiday validation
  - useProductSearch hook with fuse.js client + server fallback
  - useQuoteDraft hook with 30s localStorage auto-save + debounced server save
  - useQuoteSubmit hook wrapping TanStack Query mutation

affects: [09-02, 09-03, 09-04, 09-05, 10-portal-quote-detail-acceptance]

tech-stack:
  added: [papaparse, xlsx (SheetJS CDN 0.20.3), fuse.js, @tanstack/react-query, @internationalized/date]
  patterns: [server function dev mode fallback, Zustand persist with skipHydration and partialize, PUBLIC_COLUMNS whitelist for product search]

key-files:
  created:
    - supabase/migrations/20260401000009_quote_requests.sql
    - apps/portal/src/lib/server/quote-requests.ts
    - apps/portal/src/lib/server/addresses.ts
    - apps/portal/src/lib/server/products-search.ts
    - apps/portal/src/stores/quote-builder.ts
    - apps/portal/src/lib/quote-draft.ts
    - apps/portal/src/lib/file-parser.ts
    - apps/portal/src/lib/business-days.ts
    - apps/portal/src/hooks/useProductSearch.ts
    - apps/portal/src/hooks/useQuoteDraft.ts
    - apps/portal/src/hooks/useQuoteSubmit.ts
  modified:
    - apps/portal/package.json
    - bun.lock

key-decisions:
  - "customer_id columns use UUID without FK constraint -- customers table deferred to Phase 13"
  - "Use existing approvals table for quote request approvals (entity_type = 'quote_request')"
  - "File attachments reference stored via JSONB attachment_urls column, not separate table"
  - "Zustand partialize excludes File[] attachments from localStorage serialization"
  - "fuse.js loads first 500 products for client-side search, server tsvector as fallback"
  - "SheetJS installed from CDN tarball (not npm -- unmaintained/insecure version)"

patterns-established:
  - "Server function helper: isSupabaseConfigured() with dev mode mock returns"
  - "Server function helper: getAuthenticatedClient() extracts session + creates Supabase client"
  - "PUBLIC_COLUMNS whitelist pattern for product search (never expose cost fields)"
  - "Egyptian business day validation: always ar-EG locale for isWeekend regardless of display locale"
  - "Auto-save dual strategy: localStorage primary (30s), server secondary (5s debounce)"

requirements-completed: [PORT-04]

duration: 10min
completed: 2026-04-01
---

# Phase 9 Plan 1: Quote Request Data Layer Summary

**Database migration for 5 quote-related tables with RLS, plus 10 server functions, Zustand store, CSV/Excel parser, Egyptian business day validation, and fuse.js product search hook -- complete data layer for the material list builder.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-01T09:30:16Z
- **Completed:** 2026-04-01T09:40:00Z
- **Tasks:** 2/2
- **Files created:** 11
- **Files modified:** 2

## Accomplishments

### Task 1: Database Migration (20260401000009_quote_requests.sql)
- Created 5 tables: customer_addresses, projects, quote_requests, quote_request_items, quote_request_attachments
- All tables have RLS enabled with separate policies for external users (customer_id scope) and internal users (tenant_id scope)
- generate_request_number() SECURITY DEFINER function with QR-YYYY-NNNNN pattern
- auto_set_request_number trigger auto-generates request_number on INSERT
- approval_required, approved_by, approval_notes columns for PORT-13 buyer-side approval
- Indexes on all RLS-referenced columns for query performance
- set_tenant_id and update_updated_at triggers on all mutable tables
- customer_id FK deferred to Phase 13 (customers table not yet created)

### Task 2: Server Functions, Store, Utilities, Hooks
- **Server functions (quote-requests.ts):** submitQuoteRequest with idempotency, saveDraft (upsert), getDrafts, parseWithAI (mock keyword matching for Phase 30 swap)
- **Server functions (addresses.ts):** getCustomerAddresses, createAddress, getCustomerProjects, createProject
- **Server functions (products-search.ts):** searchProducts (tsvector), getProductCatalog (for fuse.js index). PUBLIC_COLUMNS whitelist ensures cost fields never leak.
- **Zustand store (quote-builder.ts):** Multi-step state (step 1/2/3), items[], delivery details, persist to localStorage with skipHydration, partialize excludes non-serializable File[]
- **File parser (file-parser.ts):** parseCSV (PapaParse), parseExcel (SheetJS), detectFileType, parseFile auto-detector. Arabic column headers mapped. BOM and delimiter handling via PapaParse.
- **Business days (business-days.ts):** isEgyptianWeekend (ar-EG locale), isEgyptianHoliday (2026 calendar), isDateUnavailable, getNextBusinessDay, getMinDeliveryDate
- **useProductSearch hook:** Loads 500 products into fuse.js (staleTime 5min), 150ms debounced search, server tsvector fallback
- **useQuoteDraft hook:** 30s localStorage interval + 5s debounced server save, restore on mount, timestamp-based conflict resolution
- **useQuoteSubmit hook:** TanStack Query mutation, clears draft on success

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AuthSession type mismatch**
- **Found during:** Task 2
- **Issue:** Plan assumed `session.accessToken`, `session.customerId`, `session.userId` but AuthSession type has `session.session.access_token`, `session.user.app_metadata?.customer_id`, `session.user.id`
- **Fix:** Updated all server functions to use correct AuthSession property paths
- **Files modified:** quote-requests.ts, addresses.ts, products-search.ts

**2. [Rule 3 - Blocking] Missing dependencies**
- **Found during:** Task 2
- **Issue:** @tanstack/react-query and @internationalized/date not installed in portal
- **Fix:** Added both as explicit dependencies
- **Files modified:** apps/portal/package.json

**3. [Rule 2 - Missing] customers table FK deferred**
- **Found during:** Task 1
- **Issue:** Plan references `FK customers` but customers table doesn't exist yet (Phase 13)
- **Fix:** Used UUID column without FK constraint, added COMMENT documenting deferred FK
- **Files modified:** 20260401000009_quote_requests.sql

## Known Stubs

None -- all stubs are intentional dev mode fallbacks that return mock data when Supabase is not configured. These are the established pattern from Phase 6-8 and will work with real Supabase once connected.

## Self-Check: PASSED

All 11 created files verified. Both task commits (decf046, bfce3fa) confirmed in git log.
