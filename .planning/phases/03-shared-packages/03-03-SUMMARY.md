---
phase: 03-shared-packages
plan: 03
subsystem: auth, ui
tags: [supabase, react-hook-form, react-aria, tanstack-table, auth-guard, forms, tables]

requires:
  - phase: 01-monorepo-scaffold
    provides: "@hyperquote/auth server/client, package scaffolds"
  - phase: 03-shared-packages/01
    provides: "@hyperquote/types enums and base types"
provides:
  - "authGuard for TanStack Start beforeLoad route protection"
  - "getServerSession for optional auth in loaders"
  - "hasPermission for client-side UI gating"
  - "FormRoot with RHF FormProvider"
  - "5 form field components (Text, Number, Select, Date, Checkbox)"
  - "standardSchemaResolver (not zodResolver)"
  - "DataTable with TanStack Table + React Aria"
  - "createColumnHelper and ColumnDef type"
affects: [04-website-layout-home-about, 07-portal-auth-shell, 09-portal-material-list-builder-quote-submission, 15-internal-platform-shell, 16-sales-module]

tech-stack:
  added: [react-hook-form, "@hookform/resolvers", zod, "@tanstack/react-table"]
  patterns: [controller-pattern, standard-schema-resolver, react-aria-table-wrapper]

key-files:
  created:
    - packages/auth/src/guard.ts
    - packages/auth/src/session.ts
    - packages/auth/src/types.ts
    - packages/forms/src/FormRoot.tsx
    - packages/forms/src/resolver.ts
    - packages/forms/src/fields/TextField.tsx
    - packages/forms/src/fields/NumberField.tsx
    - packages/forms/src/fields/SelectField.tsx
    - packages/forms/src/fields/DateField.tsx
    - packages/forms/src/fields/CheckboxField.tsx
    - packages/tables/src/DataTable.tsx
    - packages/tables/src/columns.ts
  modified:
    - packages/auth/src/index.ts
    - packages/auth/package.json
    - packages/forms/package.json
    - packages/forms/src/index.ts
    - packages/tables/package.json
    - packages/tables/src/index.ts

key-decisions:
  - "hasPermission returns true by default -- RLS is the real enforcement, client-side check deferred until permission lookup table is loaded"
  - "DataTable is base wrapper only -- sort/filter/select deferred per CONTEXT.md"

patterns-established:
  - "Controller + useFormContext pattern: all form fields use RHF Controller with useFormContext(), never watch()"
  - "standardSchemaResolver: always use @hookform/resolvers/standard-schema, never zodResolver"
  - "React Aria Table wrapper: TanStack Table logic with React Aria Table/Row/Cell rendering"

requirements-completed: [FOUND-05]

duration: 5min
completed: 2026-03-31
---

# Phase 03 Plan 03: Auth Guard, Forms, Tables Summary

**Auth guard with Supabase JWT for RLS enforcement, 5 RHF+React Aria form fields with standardSchemaResolver, and DataTable wrapper combining TanStack Table with React Aria**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T15:37:42Z
- **Completed:** 2026-03-31T15:42:20Z
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments
- Auth guard creates Supabase server client with user's JWT, extracts pool/roles/tenantId from app_metadata, redirects unauthenticated users
- Forms package with FormRoot (FormProvider wrapper), 5 field components using Controller pattern, standardSchemaResolver
- Tables package with DataTable (TanStack Table + React Aria), createColumnHelper, and ColumnDef type

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance @hyperquote/auth with guard + session helpers** - `0c5d320` (feat)
2. **Task 2: Build @hyperquote/forms package** - `f5a354e` (feat)
3. **Task 3: Build @hyperquote/tables package** - `4506f28` (feat)

## Files Created/Modified
- `packages/auth/src/guard.ts` - authGuard for TanStack Start beforeLoad with Supabase server client
- `packages/auth/src/session.ts` - getServerSession (optional auth) + hasPermission (UI gating)
- `packages/auth/src/types.ts` - AuthSession, AuthGuardOptions interfaces
- `packages/auth/src/index.ts` - Updated with guard/session/types exports
- `packages/auth/package.json` - Added guard/session/types subpath exports and peer deps
- `packages/forms/src/FormRoot.tsx` - Form wrapper with RHF FormProvider
- `packages/forms/src/resolver.ts` - standardSchemaResolver re-export
- `packages/forms/src/fields/TextField.tsx` - React Aria TextField + RHF Controller
- `packages/forms/src/fields/NumberField.tsx` - React Aria NumberField + font-mono
- `packages/forms/src/fields/SelectField.tsx` - React Aria Select + Popover + ListBox
- `packages/forms/src/fields/DateField.tsx` - React Aria DatePicker + Calendar + font-mono
- `packages/forms/src/fields/CheckboxField.tsx` - React Aria Checkbox
- `packages/tables/src/DataTable.tsx` - TanStack Table + React Aria Table wrapper
- `packages/tables/src/columns.ts` - createColumnHelper + ColumnDef re-exports

## Decisions Made
- hasPermission returns true by default -- RLS is the real enforcement layer, client-side permission lookup deferred until the mapping table is loaded from the database
- DataTable is base wrapper only (no sort, filter, select, or bulk actions) -- deferred per CONTEXT.md

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs
- `packages/auth/src/session.ts` line 47: `hasPermission` always returns `true` -- intentional stub, RLS enforces server-side. Will be wired when permission lookup table is loaded client-side.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth guard ready for use in all app route definitions (beforeLoad)
- Forms package ready for portal quote request form, internal platform forms
- Tables package ready for data grid views across internal platform
- Sort/filter/select features deferred for tables -- will add when needed

---
*Phase: 03-shared-packages*
*Completed: 2026-03-31*
