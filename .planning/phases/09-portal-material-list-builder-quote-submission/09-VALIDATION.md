---
phase: 09
slug: portal-material-list-builder-quote-submission
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `apps/portal/vitest.config.ts` |
| **Quick run command** | `cd apps/portal && bun test --run` |
| **Full suite command** | `cd apps/portal && bun test --run` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Max feedback latency:** 25 seconds

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| CSV/Excel file parsing | PORT-04 | Requires real file upload interaction |
| Drag-and-drop reorder | PORT-04 | Complex interaction testing |
| Auto-save restore | PORT-04 | Timing-dependent behavior |
| Approval workflow | PORT-13 | Multi-user flow |

---

## Validation Sign-Off

- [ ] All tasks have automated verify
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
