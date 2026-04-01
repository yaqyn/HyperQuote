---
phase: 10
slug: portal-quote-detail-acceptance
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | apps/portal/vitest.config.ts |
| **Quick run command** | `bun test --filter portal` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter portal`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-00 | 01 | 1 | PORT-05 | scaffold | `bun test --filter portal` | W0 creates them | ⬜ pending |
| 10-01-01 | 01 | 1 | PORT-05 | unit | `bun test --filter portal` | ✅ (from W0) | ⬜ pending |
| 10-01-02 | 01 | 1 | PORT-05 | unit | `bun test --filter portal` | ✅ (from W0) | ⬜ pending |
| 10-02-01 | 02 | 2 | PORT-05 | unit | `bun test --filter portal` | ✅ (from W0) | ⬜ pending |
| 10-02-02 | 02 | 2 | PORT-05 | unit | `bun test --filter portal` | ✅ (from W0) | ⬜ pending |
| 10-03-01 | 03 | 3 | PORT-05 | unit | `bun test --filter portal` | ✅ (from W0) | ⬜ pending |
| 10-03-02 | 03 | 3 | PORT-05 | unit | `bun test --filter portal` | ✅ (from W0) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/portal/src/__tests__/quote-detail.test.tsx` — stubs for PORT-05 quote detail rendering (created by Task 10-01-00)
- [x] `apps/portal/src/__tests__/quote-actions.test.tsx` — stubs for accept/counter/partial/decline flows (created by Task 10-01-00)

*Wave 0 is Task 0 in Plan 01. Runs first before any production code.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confetti animation on accept | PORT-05 | Visual effect cannot be asserted in unit test | Accept a quote, verify 20-30 blue/white particles animate for ~300ms |
| RTL layout of version comparison | PORT-05 | RTL visual alignment needs visual inspection | Switch to Arabic, open version comparison modal, verify side-by-side layout mirrors correctly |
| Geist Mono rendering for all numbers | PORT-05 | Font rendering is visual | Inspect quote detail page, verify all prices/dates/references use Geist Mono |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (`bun test --filter portal`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Task 10-01-00 creates both test files)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
