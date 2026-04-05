---
phase: 17
slug: procurement-module
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `apps/internal/vitest.config.ts` (exists from Phase 15) |
| **Quick run command** | `cd apps/internal && bun test --run` |
| **Full suite command** | `cd apps/internal && bun test --run --coverage` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/internal && bun test --run`
- **After every plan wave:** Run `cd apps/internal && bun test --run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 17-01-T0 | 01 | 1 | — | discovery | `ls src/__tests__/procurement-*.test.ts | wc -l` | All test files | ⬜ pending |
| 17-01-T1 | 01 | 1 | PROC-01,02,03,04,05 | unit | `bun test --run procurement` | `src/__tests__/procurement-inquiry.test.ts` | ⬜ pending |
| 17-01-T2 | 01 | 1 | PROC-01 | unit | `bun test --run procurement` | `src/__tests__/procurement-store.test.ts` | ⬜ pending |
| 17-02-T1 | 02 | 2 | PROC-01 | unit | `bun test --run procurement-inquiry` | `src/__tests__/procurement-inquiry.test.ts` | ⬜ pending |
| 17-03-T1 | 03 | 3 | PROC-02 | unit | `bun test --run price-comparison` | `src/__tests__/price-comparison.test.ts` | ⬜ pending |
| 17-04-T1 | 04 | 3 | PROC-03 | unit | `bun test --run po-management` | `src/__tests__/po-management.test.ts` | ⬜ pending |
| 17-05-T1 | 05 | 4 | PROC-04 | unit | `bun test --run supplier-scorecard` | `src/__tests__/supplier-scorecard.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/internal/src/__tests__/procurement-inquiry.test.ts`
- [ ] `apps/internal/src/__tests__/procurement-store.test.ts`
- [ ] `apps/internal/src/__tests__/price-comparison.test.ts`
- [ ] `apps/internal/src/__tests__/po-management.test.ts`
- [ ] `apps/internal/src/__tests__/supplier-scorecard.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Price comparison matrix layout | PROC-02 | Visual assessment of ranked grid | Open comparison, verify suppliers ranked with color-coded scores |
| PO status flow transitions | PROC-03 | 10-status flow visual verification | Advance PO through statuses, verify UI reflects each state |
| Three-way match indicators | PROC-03 | Visual badge assessment | View PO with partial match, verify amber/green/red indicators |
| Split sourcing drag interaction | PROC-02 | DnD quality requires manual test | Drag line items between suppliers in split view |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
