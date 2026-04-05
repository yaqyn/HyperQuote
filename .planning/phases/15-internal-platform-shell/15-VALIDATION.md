---
phase: 15
slug: internal-platform-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `apps/internal/vitest.config.ts` (create if missing) |
| **Quick run command** | `cd apps/internal && bun test --run` |
| **Full suite command** | `cd apps/internal && bun test --run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/internal && bun test --run`
- **After every plan wave:** Run `cd apps/internal && bun test --run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | INT-01 | — | Auth guard rejects non-internal users | unit | `bun test --run auth-guard` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | INT-02 | — | Canvas renders greeting with time-aware message | unit | `bun test --run canvas` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | INT-03 | — | Hotkey S opens Sales module window | unit | `bun test --run hotkeys` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | INT-04 | — | Permission-filtered icon strip hides unauthorized modules | unit | `bun test --run permissions` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | INT-05 | — | Command palette opens on Ctrl+K with fuse.js search | integration | `bun test --run command-palette` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 2 | INT-06 | — | Window state preserved across module switches | unit | `bun test --run window-state` | ❌ W0 | ⬜ pending |
| 15-04-01 | 04 | 2 | INT-07 | — | Activity feed renders @mentions and system events | unit | `bun test --run activity-feed` | ❌ W0 | ⬜ pending |
| 15-04-02 | 04 | 2 | INT-08 | — | Notification badge shows aggregated urgent count | unit | `bun test --run notifications` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/internal/vitest.config.ts` — vitest configuration
- [ ] `apps/internal/src/__tests__/` — test directory structure
- [ ] `apps/internal/src/__tests__/setup.ts` — shared test setup (mock Supabase, mock auth)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Spatial glass visual appearance | INT-02 | Visual quality requires human eye | Open canvas, verify glass effect, blur, transparency |
| Lion watermark positioning | INT-02 | Layout aesthetics | Open canvas, verify watermark is subtle and centered |
| Keyboard scope (hotkeys don't fire in text inputs) | INT-03 | Complex focus interaction | Open command palette, type "sales", verify S doesn't open Sales module |
| RTL layout correctness | INT-02 | Arabic layout visual check | Switch to Arabic, verify all elements flip correctly |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
