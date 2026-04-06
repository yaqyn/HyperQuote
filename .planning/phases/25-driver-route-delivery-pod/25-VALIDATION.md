---
phase: 25
slug: driver-route-delivery-pod
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | apps/driver/vitest.config.ts |
| **Quick run command** | `bun test --filter driver` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter driver`
- **After each plan completes:** Run full suite
