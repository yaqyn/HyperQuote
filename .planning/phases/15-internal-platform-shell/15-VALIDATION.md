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
| **Framework** | Vitest ^4.1.2 |
| **Config file** | `apps/internal/vitest.config.ts` or "none — Wave 0 installs" |
| **Quick run command** | `bun test --filter internal` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter internal`
- **After every plan wave:** Run `bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | INT-01 | T-15-01 | Auth guard rejects non-internal users | unit | `bun test --filter internal-auth` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | INT-02 | — | Canvas renders greeting with time-aware text | unit | `bun test --filter canvas` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | INT-03 | — | Hotkey opens correct glass window | unit | `bun test --filter shortcuts` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | INT-04 | — | Command palette searches across entities | unit | `bun test --filter command-palette` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | INT-05 | — | Window state preserved in Zustand on swap | unit | `bun test --filter window-state` | ❌ W0 | ⬜ pending |
| 15-04-01 | 04 | 2 | INT-06 | — | Notification panel renders grouped items | unit | `bun test --filter notifications` | ❌ W0 | ⬜ pending |
| 15-05-01 | 05 | 3 | INT-07 | — | Mobile layout renders card grid | unit | `bun test --filter mobile-layout` | ❌ W0 | ⬜ pending |
| 15-06-01 | 06 | 3 | INT-08 | — | Activity feed renders comments with mentions | unit | `bun test --filter activity-feed` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/internal/vitest.config.ts` — test config if missing
- [ ] `apps/internal/src/__tests__/` — test directory structure
- [ ] Vitest browser mode setup for React Aria component testing

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hotkey S/P/O/W/F/D/C/H/A/R/I opens correct window | INT-03 | Keyboard interaction in browser | Press each key, verify correct module opens |
| Ctrl+K palette navigates with arrow keys | INT-04 | Keyboard navigation in browser | Open palette, type query, use arrows, press Enter |
| Mobile card grid layout at 375px viewport | INT-07 | Visual layout verification | Resize to 375px, verify 2-column card grid |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
