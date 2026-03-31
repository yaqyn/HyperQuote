---
phase: 3
slug: shared-packages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | packages/*/vitest.config.ts |
| **Quick run command** | `bun run test --filter=@hyperquote/*` |
| **Full suite command** | `bun run test --filter=@hyperquote/*` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FOUND-05 | unit | `bun test packages/types` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FOUND-06 | unit | `bun test packages/ui` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | FOUND-07 | unit | `bun test packages/i18n` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | FOUND-08 | integration | `bun test packages/i18n` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | FOUND-05 | integration | `bun test apps/website` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Vitest config in each package
- [ ] Test utilities for React component testing (jsdom or happy-dom)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GlassWindow spring animation visual | FOUND-05 | Animation timing is visual | Open vertical slice, observe spring enter / tween exit |
| Arabic RTL layout correctness | FOUND-07 | Visual RTL verification | Switch to AR locale, verify layout flips |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
