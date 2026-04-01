---
phase: 12
slug: supplier-portal
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-01
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `apps/portal/vitest.config.ts` |
| **Quick run command** | `cd apps/portal && bun run vitest run --reporter=verbose` |
| **Full suite command** | `cd apps/portal && bun run vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/portal && bun run vitest run --reporter=verbose`
- **After every plan wave:** Run `cd apps/portal && bun run vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test File | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 12-00-01 | 00 | 0 | ALL | all 6 stubs | `bun run vitest run src/__tests__/ --reporter=verbose` | pending |
| 12-01-01 | 01 | 1 | SUPP-01 | supplier-stock.test.tsx, supplier-po.test.tsx | `bun run vitest run src/__tests__/supplier-stock.test.tsx src/__tests__/supplier-po.test.tsx --reporter=verbose` | pending |
| 12-01-02 | 01 | 1 | SUPP-01 | role-toggle.test.tsx | `bun run vitest run src/__tests__/role-toggle.test.tsx --reporter=verbose` | pending |
| 12-02-01 | 02 | 2 | SUPP-02 | supplier-stock.test.tsx | `bun run vitest run src/__tests__/supplier-stock.test.tsx --reporter=verbose` | pending |
| 12-02-02 | 02 | 2 | SUPP-02 | supplier-stock.test.tsx | `bun run vitest run src/__tests__/supplier-stock.test.tsx --reporter=verbose` | pending |
| 12-03-01 | 03 | 2 | SUPP-04 | supplier-po.test.tsx | `bun run vitest run src/__tests__/supplier-po.test.tsx --reporter=verbose` | pending |
| 12-03-02 | 03 | 2 | SUPP-05 | supplier-invoice.test.tsx | `bun run vitest run src/__tests__/supplier-invoice.test.tsx --reporter=verbose` | pending |
| 12-04-01 | 04 | 2 | SUPP-03 | supplier-catalog.test.tsx | `bun run vitest run src/__tests__/supplier-catalog.test.tsx --reporter=verbose` | pending |
| 12-04-02 | 04 | 2 | SUPP-06 | supplier-analytics.test.tsx | `bun run vitest run src/__tests__/supplier-analytics.test.tsx --reporter=verbose` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Plan (12-00-PLAN.md)

- [ ] `apps/portal/src/__tests__/role-toggle.test.tsx` -- stubs for SUPP-01 (role toggle, shortcuts, AI context, profile popover)
- [ ] `apps/portal/src/__tests__/supplier-stock.test.tsx` -- stubs for SUPP-02 (inline edit, diff calc, freshness)
- [ ] `apps/portal/src/__tests__/supplier-po.test.tsx` -- stubs for SUPP-04 (confirm/reject logic, uploadDeliveryNote)
- [ ] `apps/portal/src/__tests__/supplier-invoice.test.tsx` -- stubs for SUPP-05 (VAT calc, total match)
- [ ] `apps/portal/src/__tests__/supplier-catalog.test.tsx` -- stubs for SUPP-03 (upload flow, confidence scoring)
- [ ] `apps/portal/src/__tests__/supplier-analytics.test.tsx` -- stubs for SUPP-06 (KPI formatting, chart data)
- [ ] Framework already installed -- vitest.config.ts exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Role toggle visual transition | SUPP-01 | Animation timing, spatial canvas shift | Toggle role, verify nav buttons animate, canvas bg changes |
| Drag-and-drop file upload | SUPP-03 | Browser DnD API interaction | Drag PDF/CSV onto upload zone, verify preview renders |
| Inline cell edit focus flow | SUPP-02 | Focus management across table cells | Click price cell, edit, Tab to next, verify blur saves |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify with Vitest commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 plan (12-00-PLAN.md) covers all test stub creation
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
