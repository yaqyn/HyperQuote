---
phase: 26
slug: driver-remaining
status: draft
nyquist_compliant: true
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
| 26-01-01 | 01 | 1 | DRV-09,10,11 | — | PowerSync schema extended with 5 tables, upload queue + auth store updated | unit | `bun test` | N/A (schema) | pending |
| 26-01-02 | 01 | 1 | DRV-09,10,11 | — | 3 Zustand stores implement all business logic | unit | `bun test` | W0 (26-01-03) | pending |
| 26-01-03 | 01 | 1 | DRV-09,10,11 | — | Wave 0 test scaffolds for exception, EOD, external-driver stores | unit | `cd apps/driver && bun test --run` | Creates them | pending |
| 26-01-04 | 01 | 1 | DRV-09,10,11 | — | 5 route stubs registered with driver-type gates | integration | `bun test` | N/A (routing) | pending |
| 26-02-01 | 02 | 2 | DRV-09 | — | Exception wizard + PhotoGrid + 3 simpler type components | unit | `bun test` | via 26-01-03 | pending |
| 26-02-02 | 02 | 2 | DRV-09 | — | 4 complex exception type components (DamagedGoods, PartialDelivery, WeatherDelay, VehicleIssue) | unit | `bun test` | via 26-01-03 | pending |
| 26-02-03 | 02 | 2 | DRV-09 | — | Exception route wired + ExceptionSummary + Report Issue buttons | integration | `bun test` | via 26-01-03 | pending |
| 26-03-01 | 03 | 2 | DRV-10 | — | 6 end-of-day step components | unit | `bun test` | via 26-01-03 | pending |
| 26-03-02 | 03 | 2 | DRV-10 | — | End-of-day route wired + End Shift on home | integration | `bun test` | via 26-01-03 | pending |
| 26-04-01 | 04 | 3 | DRV-11 | — | Job offer components + routes with countdown timers | unit | `bun test` | via 26-01-03 | pending |
| 26-04-02 | 04 | 3 | DRV-11 | — | Earnings dashboard + withdrawal + home navigation | unit | `bun test` | via 26-01-03 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Wave 0 test files are created by Plan 01 Task 3:

- [ ] `apps/driver/src/stores/exception.test.ts` — covers DRV-09 (exception type mapping, photo queue, submit)
- [ ] `apps/driver/src/stores/end-of-day.test.ts` — covers DRV-10 (step progression, fuel warning, endShift coordination)
- [ ] `apps/driver/src/stores/external-driver.test.ts` — covers DRV-11 (withholding calc, withdrawal minimum, job accept/decline)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 Task 3 creates all 3 test files)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
