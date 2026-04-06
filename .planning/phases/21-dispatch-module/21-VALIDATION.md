# Phase 21: Dispatch Module - Validation Strategy

**Generated from:** 21-RESEARCH.md (Validation Architecture section)
**Date:** 2026-04-05

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | apps/internal/vitest.config.ts |
| Quick run command | `cd apps/internal && bun run vitest run --reporter=verbose` |
| Full suite command | `cd apps/internal && bun run vitest run` |

## Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01a | Cairo truck ban validation | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "cairo truck ban"` | No -- Wave 0 |
| DISP-01b | Prayer time conflict detection | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "prayer time"` | No -- Wave 0 |
| DISP-01c | Khamsin sheet material blocking | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "khamsin"` | No -- Wave 0 |
| DISP-01d | Friday Jumu'ah blackout | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "friday"` | No -- Wave 0 |
| DISP-01e | Equipment-tagged dispatch filtering | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "equipment"` | No -- Wave 0 |
| DISP-02 | GPS broadcast subscription/cleanup | unit | `bun run vitest run src/__tests__/useGPSBroadcast.test.ts` | No -- Wave 0 |
| DISP-03 | POD validation checklist logic | unit | `bun run vitest run src/__tests__/pod-validation.test.ts` | No -- Wave 0 |
| DISP-04 | Compliance blocking logic | unit | `bun run vitest run src/__tests__/driver-compliance.test.ts` | No -- Wave 0 |

## Sampling Rate

- **Per task commit:** `cd apps/internal && bun run vitest run --reporter=verbose`
- **Per wave merge:** `cd apps/internal && bun run vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Wave 0 Gaps

- [ ] `apps/internal/src/__tests__/constraints.test.ts` -- covers DISP-01a through DISP-01e
- [ ] `apps/internal/src/__tests__/pod-validation.test.ts` -- covers DISP-03
- [ ] `apps/internal/src/__tests__/driver-compliance.test.ts` -- covers DISP-04

## TypeScript Compilation Gate

Every plan must pass `cd apps/internal && npx tsc --noEmit` before completion. This catches interface mismatches between plans running in parallel (Wave 2 plans 02-04).

## Integration Verification (Phase Gate)

After Plan 05 wires all tabs:
1. All constraint tests pass: `cd apps/internal && bun run vitest run src/__tests__/constraints.test.ts src/__tests__/driver-compliance.test.ts`
2. Full TypeScript compile: `cd apps/internal && npx tsc --noEmit`
3. All 5 dispatch tabs render (manual check via dev server)
4. Keyboard shortcuts work: D opens module, M toggles map, G+R goes to route planning
