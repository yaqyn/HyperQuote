---
phase: 03-shared-packages
plan: 01
subsystem: types, i18n
tags: [typescript, i18next, intl, arabic, enums, unions]

requires:
  - phase: 02-supabase-initial-migrations
    provides: Database enum definitions (migration 002) and auth table schemas (migration 003)
provides:
  - "@hyperquote/types: 52 union types + const arrays for all database enums"
  - "@hyperquote/types: Entity interfaces for 7 auth tables"
  - "@hyperquote/i18n: i18next config with AR+EN namespaces and type-safe keys"
  - "@hyperquote/i18n: Number/currency/date/unit formatters with Arabic-Indic numerals"
affects: [04-website-layout-home-about, 05-website-market-product-detail, 07-portal-auth-shell, 15-internal-platform-shell]

tech-stack:
  added: [i18next ^25.10.10, react-i18next ^17.0.0]
  patterns: [branded-string-types, cached-intl-formatters, union-type-with-const-array]

key-files:
  created:
    - packages/types/src/enums.ts
    - packages/types/src/entities.ts
    - packages/types/src/helpers.ts
    - packages/i18n/src/config.ts
    - packages/i18n/src/formatters/number.ts
    - packages/i18n/src/formatters/currency.ts
    - packages/i18n/src/formatters/date.ts
    - packages/i18n/src/formatters/unit.ts
    - packages/i18n/src/locales/ar/units.json
    - packages/i18n/src/locales/ar/common.json
    - packages/i18n/src/types/resources.d.ts
  modified:
    - packages/types/src/index.ts
    - packages/i18n/src/index.ts
    - packages/i18n/package.json

key-decisions:
  - "Branded ISODate/ISODateTime types for compile-time date format safety"
  - "Dual export pattern: union type + const array for each enum (type safety + runtime iteration)"
  - "Unit formatter uses inline lookup tables instead of i18next runtime for zero-dep formatting"

patterns-established:
  - "Branded string types: type ISODate = string & { readonly __brand: 'ISODate' }"
  - "Enum pattern: export type + export const array as const for every DB enum"
  - "Intl formatter caching: Map<string, Intl.NumberFormat> at module level"

requirements-completed: [FOUND-05, FOUND-08]

duration: 4min
completed: 2026-03-31
---

# Phase 03 Plan 01: Types & i18n Summary

**52 enum union types mirroring all database enums, plus i18next AR+EN with Intl-based formatters producing Arabic-Indic numerals**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T15:31:02Z
- **Completed:** 2026-03-31T15:35:16Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments
- 52 TypeScript union types with matching const arrays for all database enums from migration 002
- Entity interfaces for all 7 auth tables (Tenant, Employee, UserProfile, UserRole, RolePermission, Approval, AuditLogEntry)
- i18next ^25.10.10 configured with type-safe keys via CustomTypeOptions augmentation
- All 28 Arabic unit translations (كجم, طن, ط.م, etc.) verified present
- formatNumber(56400, 'ar') produces Arabic-Indic numerals (٥٦٬٤٠٠)

## Task Commits

1. **Task 1: Build @hyperquote/types package** - `5f96a81` (feat)
2. **Task 2: Build @hyperquote/i18n package** - `51681e9` (feat)

## Files Created/Modified
- `packages/types/src/enums.ts` - 52 union types + const arrays for all DB enums
- `packages/types/src/entities.ts` - Interfaces for 7 auth tables
- `packages/types/src/helpers.ts` - ISODate, ISODateTime, BaseEntity, TenantEntity
- `packages/types/src/index.ts` - Re-exports all types
- `packages/types/tsconfig.json` - Standalone type checking config
- `packages/i18n/package.json` - i18next ^25.10.10 + react-i18next deps
- `packages/i18n/src/config.ts` - i18next init with AR+EN resources
- `packages/i18n/src/types/resources.d.ts` - Type-safe key augmentation
- `packages/i18n/src/locales/en/common.json` - 25 English common keys
- `packages/i18n/src/locales/ar/common.json` - 25 Arabic common keys
- `packages/i18n/src/locales/en/units.json` - 28 English unit abbreviations
- `packages/i18n/src/locales/ar/units.json` - 28 Arabic unit abbreviations
- `packages/i18n/src/formatters/number.ts` - Intl.NumberFormat with ar-EG
- `packages/i18n/src/formatters/currency.ts` - EGP currency formatting
- `packages/i18n/src/formatters/date.ts` - Date + relative time formatting
- `packages/i18n/src/formatters/unit.ts` - Combined number + unit display
- `packages/i18n/src/index.ts` - Public API exports
- `packages/i18n/tsconfig.json` - Standalone type checking config

## Decisions Made
- Used branded string types (ISODate, ISODateTime) for compile-time safety without runtime cost
- Dual export pattern for each enum: union type for type checking + const array for runtime iteration
- Unit formatter uses inline lookup tables rather than i18next runtime, enabling standalone use without init

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Types package ready for import by all downstream packages
- i18n package ready for integration into app shells
- formatters verified producing Arabic-Indic numerals for ar locale

---
*Phase: 03-shared-packages*
*Completed: 2026-03-31*

## Self-Check: PASSED
