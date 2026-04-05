---
phase: 16
slug: sales-module
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 16 — Validation Strategy

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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-----------|--------|
| 16-01-T1 | 01 | 1 | SALE-01 | — | RFQ inbox renders with priority scoring | unit | `bun test --run rfq-inbox` | `src/__tests__/rfq-inbox.test.ts` | ⬜ pending |
| 16-01-T2 | 01 | 1 | SALE-01 | — | SLA countdown timers update correctly | unit | `bun test --run sla-timer` | `src/__tests__/sla-timer.test.ts` | ⬜ pending |
| 16-02-T1 | 02 | 2 | SALE-02,SALE-03 | — | Quote builder renders all sections | unit | `bun test --run quote-builder` | `src/__tests__/quote-builder.test.ts` | ⬜ pending |
| 16-02-T2 | 02 | 2 | SALE-04 | — | Margin guardrails apply color thresholds | unit | `bun test --run margin-guardrails` | `src/__tests__/margin-guardrails.test.ts` | ⬜ pending |
| 16-03-T1 | 03 | 3 | SALE-05 | — | Approval flow triggers on threshold breach | unit | `bun test --run approval-flow` | `src/__tests__/approval-flow.test.ts` | ⬜ pending |
| 16-03-T2 | 03 | 3 | SALE-06 | — | Customer 360 renders 9 tabs | unit | `bun test --run customer-360` | `src/__tests__/customer-360.test.ts` | ⬜ pending |
| 16-04-T1 | 04 | 4 | SALE-07,SALE-08 | — | Pipeline kanban renders 9 stages | unit | `bun test --run pipeline-kanban` | `src/__tests__/pipeline-kanban.test.ts` | ⬜ pending |
| 16-04-T2 | 04 | 4 | SALE-09,SALE-10 | — | Drag-and-drop advances quote stage | integration | `bun test --run pipeline-dnd` | `src/__tests__/pipeline-dnd.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/internal/src/__tests__/rfq-inbox.test.ts` — RFQ inbox tests
- [ ] `apps/internal/src/__tests__/sla-timer.test.ts` — SLA countdown tests
- [ ] `apps/internal/src/__tests__/quote-builder.test.ts` — Quote builder tests
- [ ] `apps/internal/src/__tests__/margin-guardrails.test.ts` — Margin guardrail tests
- [ ] `apps/internal/src/__tests__/approval-flow.test.ts` — Approval flow tests
- [ ] `apps/internal/src/__tests__/customer-360.test.ts` — Customer 360 tests
- [ ] `apps/internal/src/__tests__/pipeline-kanban.test.ts` — Pipeline kanban tests
- [ ] `apps/internal/src/__tests__/pipeline-dnd.test.ts` — Pipeline DnD tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quote builder single-page layout | SALE-02 | Visual layout assessment | Open quote builder, verify all 10 sections visible simultaneously |
| Kanban drag-and-drop feel | SALE-07 | Interaction quality | Drag a card between stages, verify animation and state update |
| Margin color thresholds visual | SALE-04 | Color accuracy | Enter margins at each threshold, verify green/yellow/red/blocked |
| SLA timer countdown accuracy | SALE-01 | Time-based behavior | Watch timer count down, verify Egyptian business hours calculation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
