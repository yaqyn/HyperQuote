---
phase: 12
slug: supplier-portal
status: draft
nyquist_compliant: false
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | SUPP-01 | unit | `bun run vitest run src/__tests__/role-toggle.test.tsx -t "supplier"` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | SUPP-02 | unit | `bun run vitest run src/__tests__/stock-table.test.tsx` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | SUPP-03 | unit | `bun run vitest run src/__tests__/catalog-upload.test.tsx` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 2 | SUPP-04 | unit | `bun run vitest run src/__tests__/po-inbox.test.tsx` | ❌ W0 | ⬜ pending |
| 12-05-01 | 05 | 3 | SUPP-05 | unit | `bun run vitest run src/__tests__/invoice-form.test.tsx` | ❌ W0 | ⬜ pending |
| 12-06-01 | 06 | 3 | SUPP-06 | unit | `bun run vitest run src/__tests__/analytics.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/portal/src/__tests__/supplier-stock.test.tsx` — stubs for SUPP-02 (inline edit, diff calc)
- [ ] `apps/portal/src/__tests__/supplier-po.test.tsx` — stubs for SUPP-04 (confirm/reject logic)
- [ ] `apps/portal/src/__tests__/supplier-invoice.test.tsx` — stubs for SUPP-05 (VAT calc, total match)
- [ ] Framework already installed — vitest.config.ts exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Role toggle visual transition | SUPP-01 | Animation timing, spatial canvas shift | Toggle role, verify nav buttons animate, canvas bg changes |
| Drag-and-drop file upload | SUPP-03 | Browser DnD API interaction | Drag PDF/CSV onto upload zone, verify preview renders |
| Inline cell edit focus flow | SUPP-02 | Focus management across table cells | Click price cell, edit, Tab to next, verify blur saves |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
