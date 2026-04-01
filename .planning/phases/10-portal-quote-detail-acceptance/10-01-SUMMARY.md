---
phase: 10-portal-quote-detail-acceptance
plan: 01
title: Quote Detail Data Layer
subsystem: portal
tags: [types, server-functions, zustand, i18n, tests]
dependency_graph:
  requires: []
  provides: [Quote types, server functions, Zustand store, i18n keys, test stubs]
  affects: [10-02, 10-03]
tech_stack:
  added: [vitest]
  patterns: [createServerFn + inputValidator + handler, dev-mode mock fallback, Zustand computed helpers]
key_files:
  created:
    - apps/portal/src/types/quote.ts
    - apps/portal/src/lib/server/quotes.ts
    - apps/portal/src/stores/quote-actions.ts
    - apps/portal/src/__tests__/quote-detail.test.tsx
    - apps/portal/src/__tests__/quote-actions.test.tsx
    - apps/portal/vitest.config.ts
  modified:
    - apps/portal/package.json
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json
decisions:
  - Nested quoteDetail namespace in i18n (vs flat dot-notation) for cleaner scoping
  - Added vitest as devDependency to portal since it was not installed anywhere in the monorepo
metrics:
  duration: 4min
  completed: "2026-04-01"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 3
requirements: [PORT-05]
---

# Phase 10 Plan 01: Quote Detail Data Layer Summary

Seven files establishing all data contracts for portal quote detail: TypeScript types, server functions with dev-mode mock, Zustand editing store, bilingual i18n, and Wave 0 test stubs.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 0 | Wave 0 test stubs | bbcfcf7 | quote-detail.test.tsx, quote-actions.test.tsx, vitest.config.ts |
| 1 | Types, server functions, Zustand store | d7cf1b1 | types/quote.ts, lib/server/quotes.ts, stores/quote-actions.ts |
| 2 | i18n keys EN + AR | 0199a52 | en/portal.json, ar/portal.json |

## What Was Built

### Types (apps/portal/src/types/quote.ts)
- 7 exported types/interfaces: Quote, QuoteItem, QuoteVersion, QuoteTimelineStep, LineDecision, CounterOfferPayload, PartialResponsePayload
- QuoteStatus union with 12 states matching backend state machine
- DeclineReason and RejectReason enums for customer actions

### Server Functions (apps/portal/src/lib/server/quotes.ts)
- 5 server functions: getQuoteDetail, acceptQuote, rejectQuote, submitCounterOffer, submitPartialResponse
- All follow createServerFn + inputValidator(z.object) + handler pattern
- Dev-mode mock with 6 line items at realistic Egyptian market prices (cement EGP 85/bag, rebar EGP 32,500/ton, etc.)
- Mock includes 14% VAT calculation, 2 version history entries, 7-step timeline with "sent" as current
- Real mode uses authenticated Supabase client with .eq('status', 'sent') guard on mutations

### Zustand Store (apps/portal/src/stores/quote-actions.ts)
- 4 modes: view, counter-total, counter-per-line, partial
- Counter-offer state: modifiedPrices, modifiedQuantities, totalDiscount, selfPickup, counterNotes
- Partial accept state: lineDecisions, rejectReasons, negotiatedPrices
- Computed helpers: getModifiedCount(), getDecisionSummary(), allDecided()
- Full reset() to initial state

### i18n (packages/i18n/src/locales/{en,ar}/portal.json)
- 70+ keys under quoteDetail namespace in both EN and AR
- Covers all UI strings: header, line items, subtotals, actions, counter-offer, partial accept, decline, version history, timeline, empty/error states
- AR VAT label uses Arabic-Indic numerals per Egyptian compliance

### Test Stubs
- 45 it.todo() tests across 12 describe blocks in 2 files
- All pass as skipped with bun test --filter portal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vitest to portal**
- **Found during:** Task 0
- **Issue:** vitest was not installed in portal or anywhere in the monorepo; bun test would fail
- **Fix:** Added vitest ^4.1.2 as devDependency, created vitest.config.ts, added test script to package.json
- **Files modified:** apps/portal/package.json, apps/portal/vitest.config.ts
- **Commit:** bbcfcf7

## Known Stubs

None -- all files are complete data contracts with no placeholder values that affect functionality.

## Self-Check: PASSED
