---
phase: 26-driver-remaining
plan: 04
subsystem: ui
tags: [react, zustand, react-aria, countdown-timer, earnings, withdrawal, external-driver]

# Dependency graph
requires:
  - phase: 26-driver-remaining/01
    provides: External driver store, auth store, shared components, DriverJob/EarningsSummary interfaces
  - phase: 26-driver-remaining/03
    provides: End Shift button on home screen, end-of-day flow
provides:
  - Job offers listing with live countdown timers and accept/decline flow
  - Earnings dashboard with 2x2 summary grid, per-job history with expandable breakdown
  - Withdrawal form with EGP 500 minimum and auto-payout toggle
  - External driver navigation buttons on home screen
affects: [driver-app, external-driver-marketplace]

# Tech tracking
tech-stack:
  added: []
  patterns: [countdown timer with setInterval cleanup, expandable list rows, tabbed layout with React Aria Tabs, inline confirmation overlay instead of modal]

key-files:
  created:
    - apps/driver/src/components/jobs/CountdownTimer.tsx
    - apps/driver/src/components/jobs/JobCard.tsx
    - apps/driver/src/components/jobs/JobDetail.tsx
    - apps/driver/src/components/earnings/RatingDisplay.tsx
    - apps/driver/src/components/earnings/EarningsSummary.tsx
    - apps/driver/src/components/earnings/EarningsHistory.tsx
    - apps/driver/src/components/earnings/EarningsBreakdown.tsx
    - apps/driver/src/components/earnings/WithdrawalForm.tsx
  modified:
    - apps/driver/src/routes/job-offers.tsx
    - apps/driver/src/routes/job-detail.tsx
    - apps/driver/src/routes/earnings.tsx
    - apps/driver/src/routes/home.tsx

key-decisions:
  - "Accept job uses inline confirmation overlay (DriverCard with key details) instead of a modal dialog — keeps the user in context and avoids Dialog accessibility complexity for a simple confirm"
  - "Bank account selector shows placeholder since bank account linking is not yet wired — WithdrawalForm uses 'default' bankAccountId"
  - "Star rating uses simple SVG path instead of a library — 5 stars is trivial, no dependency needed"

patterns-established:
  - "Inline confirmation pattern: show DriverCard overlay with Cancel/Confirm instead of modal for simple confirmations"
  - "Expandable list row: button wrapping DriverCard content with toggled detail section below"
  - "Locale-aware currency formatting: Intl.NumberFormat with ar-EG/en-EG throughout all monetary displays"

requirements-completed: [DRV-11]

# Metrics
duration: 6min
completed: 2026-04-06
---

# Phase 26 Plan 04: Job Offers & Earnings Dashboard Summary

**External driver marketplace with live countdown job offers, accept/decline flow, earnings dashboard with 5% withholding transparency, and EGP 500 minimum withdrawal form**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-06T07:15:00Z
- **Completed:** 2026-04-06T07:21:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Built 3 job components: CountdownTimer (real-time MM:SS in Geist Mono, danger color under 5min), JobCard (payout, addresses, distance/weight/duration, equipment badges), JobDetail (full view with accept confirmation overlay and decline with optional reason)
- Built 5 earnings components: RatingDisplay (SVG stars + Geist Mono rating), EarningsSummary (2x2 grid with calcWithholding per card), EarningsHistory (expandable rows), EarningsBreakdown (conditional bonus lines + 5% withholding), WithdrawalForm (NumberField with EGP 500 min, auto-payout Switch)
- Wired job-offers and job-detail routes with external driver gate, store integration, and navigation flow (accept -> route-overview, decline -> job-offers)
- Wired earnings route with React Aria Tabs (History/Withdraw), external driver gate, and store loading
- Added Job Offers (primary) and Earnings (secondary) buttons to home screen for external drivers

## Task Commits

Each task was committed atomically:

1. **Task 1: Job offer components + routes** - `0f80f15` (feat)
2. **Task 2: Earnings dashboard + withdrawal + home navigation** - `6d7f22a` (feat)

## Files Created/Modified
- `apps/driver/src/components/jobs/CountdownTimer.tsx` - Real-time countdown with Geist Mono, danger color under 5min, onExpired callback
- `apps/driver/src/components/jobs/JobCard.tsx` - Job offer card with payout, addresses, stats, equipment tags
- `apps/driver/src/components/jobs/JobDetail.tsx` - Full job detail with accept confirmation overlay and decline with reason
- `apps/driver/src/components/earnings/RatingDisplay.tsx` - Star rating SVGs with Geist Mono rating number and total jobs
- `apps/driver/src/components/earnings/EarningsSummary.tsx` - 2x2 grid of DriverCards with withholding breakdown per amount
- `apps/driver/src/components/earnings/EarningsHistory.tsx` - Expandable per-job earnings list with status badges
- `apps/driver/src/components/earnings/EarningsBreakdown.tsx` - Line-item breakdown with conditional bonuses and 5% withholding
- `apps/driver/src/components/earnings/WithdrawalForm.tsx` - NumberField with EGP 500 min, bank placeholder, auto-payout toggle
- `apps/driver/src/routes/job-offers.tsx` - Job listing with refresh, empty state, external driver gate
- `apps/driver/src/routes/job-detail.tsx` - Job detail route with accept/decline store actions and navigation
- `apps/driver/src/routes/earnings.tsx` - Earnings dashboard with Tabs (History/Withdraw), external driver gate
- `apps/driver/src/routes/home.tsx` - Added Job Offers + Earnings buttons for external drivers

## Decisions Made
- Accept job uses inline DriverCard confirmation overlay instead of modal Dialog — simpler UX, keeps user in context
- Bank account selector shows placeholder text since bank account linking is a future feature
- Star rating implemented with inline SVG paths rather than adding a library dependency

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs
- `WithdrawalForm.tsx` line ~98: Bank account selector shows "Bank account linking coming soon" placeholder — bank account CRUD not yet built
- `JobDetail.tsx` line ~84: Map placeholder div instead of actual map — maps will be wired when ClientOnly MapLibre is available

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- External driver marketplace flow complete: browse jobs, accept/decline, view earnings, request withdrawals
- Bank account linking needed for real withdrawal processing
- Map integration needed for pickup/delivery location display in job detail

---
*Phase: 26-driver-remaining*
*Completed: 2026-04-06*
