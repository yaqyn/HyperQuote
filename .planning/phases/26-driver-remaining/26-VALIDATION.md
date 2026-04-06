---
phase: 26
slug: driver-remaining
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | apps/driver/vitest.config.ts |
| **Quick run command** | `cd apps/driver && bun test` |
| **Full suite command** | `cd apps/driver && bun test --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/driver && bun test`
- **After every plan wave:** Run `cd apps/driver && bun test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | DRV-09 | — | Exception data validated before queue | unit | `bun test` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | DRV-09 | — | Photo evidence stored with GPS tag | integration | manual | — | ⬜ pending |
| 26-02-01 | 02 | 2 | DRV-10 | — | Shift summary calculates from store | unit | `bun test` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 2 | DRV-10 | — | Post-trip DVIR reuses Phase 24 components | integration | manual | — | ⬜ pending |
| 26-03-01 | 03 | 3 | DRV-11 | — | Job offers filtered by driver_type | unit | `bun test` | ❌ W0 | ⬜ pending |
| 26-03-02 | 03 | 3 | DRV-11 | — | Earnings display in Geist Mono | visual | manual | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exception photo capture with GPS | DRV-09 | Requires camera hardware | Open exception form, take photo, verify GPS metadata |
| Post-trip DVIR inspection flow | DRV-10 | Multi-step UI flow | Complete end-of-day, verify DVIR checklist renders |
| Job offer accept/decline | DRV-11 | External driver role gate | Switch to external driver, verify offers visible |
| Offline sync round-trip | DRV-09,10,11 | Requires network toggle | Disable network, complete flow, re-enable, verify sync |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
