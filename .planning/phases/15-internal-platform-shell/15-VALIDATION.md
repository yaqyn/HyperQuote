---
phase: 15
slug: internal-platform-shell
status: draft
nyquist_compliant: true
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
| **Config file** | `apps/internal/vitest.config.ts` (created in Plan 01 Task 1) |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-----------|--------|
| 15-01-T1 | 01 | 1 | INT-01 | T-15-01 | Dependencies installed, vitest configured | build | `cd apps/internal && bun install && bun run build` | — | ⬜ pending |
| 15-01-T2 | 01 | 1 | INT-01,INT-03,INT-04 | T-15-01,T-15-02 | Auth guard rejects non-internal users, modules defined, stores created | unit | `bun test --run auth-guard` | `src/__tests__/auth-guard.test.ts` | ⬜ pending |
| 15-01-T3 | 01 | 1 | — | — | Wave 0 test stubs exist for all tasks | discovery | `ls src/__tests__/*.test.ts \| wc -l` (expect 8) | All 8 test files | ⬜ pending |
| 15-02-T1 | 02 | 2 | INT-02,INT-03,INT-07 | T-15-05 | Canvas renders greeting, icon strip filters by permission, mobile grid | unit | `bun test --run canvas && bun test --run permissions` | `src/__tests__/canvas.test.ts`, `src/__tests__/permissions.test.ts` | ⬜ pending |
| 15-02-T2 | 02 | 2 | INT-03,INT-04 | T-15-06 | Hotkeys open modules, Escape closes, bell rendered once in layout | unit | `bun test --run hotkeys` | `src/__tests__/hotkeys.test.ts` | ⬜ pending |
| 15-03-T1 | 03 | 3 | INT-05 | T-15-07 | Command palette opens with fuse.js search, permission-filtered | integration | `bun test --run command-palette` | `src/__tests__/command-palette.test.ts` | ⬜ pending |
| 15-03-T2 | 03 | 3 | INT-06 | T-15-08 | Notifications window, Supabase Realtime subscription | unit | `bun test --run notifications` | `src/__tests__/notifications.test.ts` | ⬜ pending |
| 15-03-T3 | 03 | 3 | INT-05,INT-06 | — | Command palette + notifications wired into shell layout | integration | `bun test --run command-palette && bun test --run notifications` | — (covered by existing test files) | ⬜ pending |
| 15-04-T1 | 04 | 4 | INT-08 | T-15-10 | Activity feed types and server functions | unit | `bun test --run activity-feed` | `src/__tests__/activity-feed.test.ts` | ⬜ pending |
| 15-04-T2 | 04 | 4 | INT-08 | T-15-11,T-15-12 | Activity feed components with @mentions and Hot Potato | unit | `bun test --run activity-feed` | `src/__tests__/activity-feed.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All created by Plan 01 Task 3:

- [x] `apps/internal/vitest.config.ts` — vitest configuration (Plan 01 Task 1)
- [ ] `apps/internal/src/__tests__/setup.ts` — shared test setup (mock Supabase, mock auth)
- [ ] `apps/internal/src/__tests__/auth-guard.test.ts` — auth guard tests
- [ ] `apps/internal/src/__tests__/canvas.test.ts` — canvas rendering tests
- [ ] `apps/internal/src/__tests__/hotkeys.test.ts` — hotkey navigation tests
- [ ] `apps/internal/src/__tests__/permissions.test.ts` — permission filtering tests
- [ ] `apps/internal/src/__tests__/command-palette.test.ts` — command palette tests
- [ ] `apps/internal/src/__tests__/window-state.test.ts` — window state preservation tests
- [ ] `apps/internal/src/__tests__/activity-feed.test.ts` — activity feed tests
- [ ] `apps/internal/src/__tests__/notifications.test.ts` — notification tests

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 Task 3)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (wave_0_complete will be set to true after Plan 01 Task 3 executes)
