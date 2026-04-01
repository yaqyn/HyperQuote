---
phase: 13
slug: database-order-delivery-finance-tables
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | psql + Supabase CLI |
| **Config file** | supabase/config.toml |
| **Quick run command** | `supabase db reset` |
| **Full suite command** | `supabase db reset && psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f tests/phase13_verify.sql` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `supabase db reset`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 13-00-01 | 00 | 0 | ALL | setup | `test -f tests/phase13_verify.sql` | pending |
| 13-01-01 | 01 | 1 | DB-01 | smoke | `supabase db reset` | pending |
| 13-02-01 | 02 | 1 | DB-01 | smoke | `supabase db reset` | pending |
| 13-03-01 | 03 | 2 | DB-03 | integration | `psql ... -c "SELECT count(*) FROM pg_policies WHERE schemaname='public'"` | pending |
| 13-04-01 | 04 | 2 | DB-05 | unit | `psql ... -c "SELECT validate_state_transition('order', 'confirmed', 'completed')"` | pending |
| 13-05-01 | 05 | 3 | DB-01 | smoke | `psql ... -c "SELECT count(*) FROM pg_indexes WHERE schemaname='public'"` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase13_verify.sql` — verification script that counts tables, policies, indexes, tests state machine
- [ ] Supabase local running (`supabase start`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EXPLAIN ANALYZE index usage | DB-01 | Requires running database with seed data | Run EXPLAIN ANALYZE on key queries, verify no sequential scans on RLS columns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
