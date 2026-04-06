---
phase: 22
slug: remaining-internal-modules
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | apps/internal/vitest.config.ts |
| **Quick run command** | `bun test --filter internal` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter internal`
- **After each plan completes:** Run full suite
- **Dimension 8 check:** Verify VALIDATION.md is referenced in plans
