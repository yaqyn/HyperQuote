---
phase: 14
slug: database-support-hr-ai-system-tables
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | psql + Supabase CLI |
| **Config file** | supabase/config.toml |
| **Quick run command** | `cd supabase && supabase db push --dry-run` |
| **Full suite command** | `supabase db reset && supabase db push` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd supabase && supabase db push --dry-run`
- **After every plan wave:** Run `supabase db reset`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 14-01-01 | 01 | 1 | DB-01 | smoke | `supabase db reset` | pending |
| 14-02-01 | 02 | 2 | DB-08 | unit | `psql -c "SELECT generate_sequence_number('QR', ...)"` | pending |
| 14-03-01 | 03 | 3 | DB-06 | integration | `psql -f tests/phase14_triggers.sql` | pending |
| 14-04-01 | 04 | 4 | DB-07 | integration | `psql -c "REFRESH MATERIALIZED VIEW ceo_attention_items"` | pending |
| 14-05-01 | 05 | 5 | DB-09 | smoke | `psql -c "SELECT * FROM cron.job"` | pending |
| 14-06-01 | 06 | 6 | DB-10 | smoke | `psql -c "SELECT COUNT(*) FROM governorates"` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] SQL test script for trigger verification
- [ ] SQL test script for computed function verification
- [ ] Verification query for pg_cron job listing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Business trigger cascades | DB-06 | Requires running Supabase with test data | INSERT test quote, UPDATE to accepted, verify order+POs created |
| Mat view refresh timing | DB-07 | Requires pg_cron running | Wait for scheduled refresh, verify data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
