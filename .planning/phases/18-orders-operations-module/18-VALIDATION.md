# Phase 18: Orders/Operations Module - Validation

**Extracted from:** 18-RESEARCH.md Validation Architecture section
**Phase requirements:** OPS-01, OPS-02, OPS-03

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | apps/internal/vitest.config.ts (or Wave 0 if missing) |
| Quick run command | `bun run test --filter=internal` |
| Full suite command | `bun run test` |

## Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| OPS-01 | Kanban renders 6 columns, cards display correct data, DnD triggers confirmation | unit | `bun vitest apps/internal/src/__tests__/fulfillment-kanban.test.ts --run` | `apps/internal/src/__tests__/fulfillment-kanban.test.ts` |
| OPS-02 | Order detail shows line items, progress bar, activity log | unit | `bun vitest apps/internal/src/__tests__/order-detail.test.ts --run` | `apps/internal/src/__tests__/order-detail.test.ts` |
| OPS-03 | Dashboard metrics render, SLA tracker sorts by urgency, Nudge creates notification | unit | `bun vitest apps/internal/src/__tests__/operations-dashboard.test.ts --run` | `apps/internal/src/__tests__/operations-dashboard.test.ts` |

## Sampling Rate

- **Per task commit:** `bun vitest --run apps/internal/src/__tests__/fulfillment-kanban.test.ts apps/internal/src/__tests__/order-detail.test.ts apps/internal/src/__tests__/operations-dashboard.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Wave 0 Test Stubs

Created in Plan 01 Task 0:

- [x] `apps/internal/src/__tests__/fulfillment-kanban.test.ts` -- covers OPS-01
- [x] `apps/internal/src/__tests__/order-detail.test.ts` -- covers OPS-02
- [x] `apps/internal/src/__tests__/operations-dashboard.test.ts` -- covers OPS-03

## Test Behaviors per Requirement

### OPS-01: Fulfillment Kanban
- `it.todo('renders 6 fulfillment columns')`
- `it.todo('displays order cards with correct data')`
- `it.todo('drag-and-drop triggers confirmation dialog')`

### OPS-02: Order Detail
- `it.todo('shows per-line-item status table')`
- `it.todo('renders overall progress bar')`
- `it.todo('displays activity log entries')`

### OPS-03: Operations Dashboard
- `it.todo('renders 4 metric cards')`
- `it.todo('SLA tracker sorts by urgency: breached > at-risk > on-track')`
- `it.todo('Nudge button creates notification')`
