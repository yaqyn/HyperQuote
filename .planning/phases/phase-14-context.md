# Phase 14: Database -- Support + HR + AI + System Tables

## Goal
The complete 94-table + 2 materialized view database is operational with all triggers, computed functions, cron jobs, and seed data.

## Dependencies
- Phase 13 (Order + Delivery + Finance Tables) must be complete
- Phase 2 (Initial Migrations) must be complete

## Requirements

- **DB-06**: Business logic triggers — quote_accepted creates order + POs, delivery_confirmed generates invoice, payment_bounced triggers credit hold, etc.
- **DB-07**: Materialized views — ceo_attention_items (5-min refresh), ap_aging_snapshot (daily)
- **DB-08**: Computed functions — payment_behavior_score, customer_tier_score, available_quantity, ar_aging
- **DB-09**: pg_cron jobs — quote expiry, AR aging snapshots, metrics pre-computation, SLA breach detection
- **DB-10**: Seed data — role_permissions, governorates (27), system_settings defaults, delivery_zones

## Success Criteria
1. Business logic triggers fire correctly: quote_accepted creates order + POs, delivery_confirmed generates invoice, payment_bounced triggers credit hold
2. Materialized views (ceo_attention_items, ap_aging_snapshot) refresh on schedule and return correct data
3. Computed functions (payment_behavior_score, customer_tier_score, available_quantity, ar_aging) return expected values for test data
4. All pg_cron jobs are scheduled (quote expiry, AR aging snapshots, metrics pre-computation, SLA breach detection)
5. Seed data loaded: governorates (27), system_settings defaults, delivery_zones

## What to Build

### Remaining Tables

**Support:**
- `tickets`
- `ticket_messages`

**HR & Onboarding:**
- `onboarding_sequences`
- `onboarding_steps`
- `customer_onboarding_progress`
- `governorates`

**AI & Search:**
- `ai_conversations`
- `ai_messages`
- `ai_request_log`
- `document_embeddings` (pgvector 1536 dimensions)
- `product_embeddings` (pgvector 1536 dimensions)
- `business_data_embeddings` (pgvector 1536 dimensions)
- `search_index` (with GIN index on tsvector)

**System:**
- `notifications`
- `notification_groups`
- `documents`
- `system_settings`
- `sequence_counters`
- `state_history`
- `webhook_events`
- `weather_alerts`
- `carrier_routing_config`
- `otp_delivery_log`
- `ceo_digests`

**Note on `unit_translations`:** This is **seed data inserted into the i18n namespace**, not a standalone table. The 29 units with en_name, en_abbr, ar_name, ar_abbr are inserted as seed data (see Seed Data section below).

**Note on `holiday_calendar`:** Holiday data is stored in the **`system_settings` table** (as a JSON value), not as a standalone table.

**Note on `customer_feedback`:** This table is assigned to **Phase 13** (Customer domain, BACKEND.md Section 3.2), not Phase 14.

### All Business Logic Triggers

| Trigger | Table | When | Function |
|---|---|---|---|
| `trg_quote_accepted` | quotes | status -> 'accepted' | `on_quote_accepted()` — creates order + proforma invoice |
| `trg_delivery_confirmed` | deliveries | status -> 'delivered' | `on_delivery_confirmed()` — creates invoice + revenue recognition event (EAS 48) |
| `trg_payment_bounced` | payments | status -> 'bounced' | `on_payment_bounced()` — sets customer credit_hold, notifies finance |
| `trg_cheque_cleared` | cheque_tracking | status -> 'cleared' | `on_cheque_cleared()` — applies payment to invoice |
| `trg_inventory_movement` | inventory_movements | AFTER INSERT | `on_inventory_movement()` — recalculates inventory totals |
| `trg_search_index_sync` | multiple | AFTER INSERT/UPDATE | `sync_search_index()` — updates search_index with searchable content |
| `trg_new_driver_signup` | drivers | BEFORE INSERT | `on_new_driver_signup()` — creates notification, sets pending_verification |
| `trg_customer_created_onboarding` | customers | AFTER INSERT | `on_customer_created_start_onboarding()` — initializes 7-day onboarding sequence |
| `trg_product_wind_sensitivity` | products | BEFORE INSERT/UPDATE OF category | `set_wind_sensitivity()` — auto-set is_wind_sensitive for sheet/panel materials |
| `trg_weather_set_blocking` | weather_alerts | BEFORE INSERT/UPDATE | `set_weather_blocking_flags()` — auto-set sheet_delivery_blocked and outdoor_ops_paused |
| `trg_prevent_lifo` | tenants | BEFORE INSERT/UPDATE OF inventory_costing_method | `prevent_lifo_costing()` — block LIFO |
| `trg_drop_ship_dispatched` | deliveries | status -> 'dispatched' | `on_drop_ship_dispatched()` — auto-create drop_ship_pod for supplier_direct deliveries |
| `trg_order_tier4_bypass` | orders | BEFORE INSERT | `auto_bypass_tier4_payment()` — auto-set payment_instrument_verified for Tier 4 |
| `trg_check_exchange_rate_variance` | supplier_pos | BEFORE INSERT | `check_exchange_rate_variance()` — flag POs with >5% rate drift |
| `trg_generate_coded_delivery_reference` | supplier_pos | BEFORE INSERT | `generate_coded_delivery_reference()` — auto-generate HQ-YYYY-NNNN codes |
| `trg_on_po_confirmed_send_delivery_note` | supplier_pos | AFTER UPDATE | `on_po_confirmed_send_delivery_note()` — queue delivery note generation |
| `trg_set_dispute_sla_deadline` | invoice_disputes | BEFORE INSERT | `set_dispute_sla_deadline()` — set 48h SLA + sync invoice status |

### Trigger Dependency Note

**Important:** Many Phase 14 triggers fire on Phase 13 tables. For example, `trg_check_exchange_rate_variance` fires on `supplier_pos` (Phase 13), `trg_quote_accepted` fires on `quotes` (Phase 13), `trg_delivery_confirmed` fires on `deliveries` (Phase 13). Phase 13 tables MUST exist before these triggers are created. Run Phase 14 trigger migrations AFTER Phase 13 is complete.

### Universal Triggers (applied to all business tables)

- `trg_{table}_set_tenant` — BEFORE INSERT, auto-sets tenant_id from JWT
- `trg_{table}_updated_at` — BEFORE UPDATE, sets updated_at = NOW()
- `trg_{table}_audit` — AFTER INSERT/UPDATE/DELETE, supa_audit log

### Materialized Views

**ceo_attention_items** (refreshed every 5 min):
Union of: bounced cheques (7 days), overdue invoices (60+ days), credit limit breaches, delivery failures (today), supplier PO rejections (7 days).

**ap_aging_snapshot** (refreshed daily at 2:00 AM):
AP aging buckets by supplier (current, 1-30, 31-60, 61-90, 90+).

(Full SQL for both in BACKEND.md Section 7.)

### Computed Functions

1. **calculate_payment_behavior_score(customer_id)** — Invoice-weighted, recency-biased timeliness score (0-100). 24-month lookback. Amount weight (3x for >500K), recency weight (3x for <3mo). Written-off = 0, on-time = 90-100, late scales down.

2. **calculate_customer_tier_score(customer_id)** — Composite of 5 dimensions: Order count (20%) + Spend (20%) + Payment timeliness (30%) + Tenure (15%) + Consistency (15%).

3. **calculate_available_quantity(product_id, warehouse_id?)** — on_hand - reserved - allocated - expired - damaged. Supports per-warehouse or cross-warehouse.

4. **calculate_ar_aging(customer_id)** — Returns current, 1-30, 31-60, 61-90, 90+ day buckets from unpaid invoices.

5. **recalculate_wac(tenant_id, product_id, warehouse_id, new_qty, new_cost)** — Weighted Average Cost recalculation on receipt.

6. **generate_sequence_number(tenant_id, entity_type, prefix)** — Thread-safe sequence number generation. Uses `sequence_counters` table with `UPDATE ... SET current_value = current_value + 1` and `RETURNING` for atomic increment. Generates format: `{PREFIX}-{YEAR}-{ZERO_PADDED_NUMBER}` (e.g., `SO-2026-00042`). The function is called by triggers like `on_quote_accepted()` to auto-generate order numbers, invoice numbers, etc. **Implementation must use row-level locking (`FOR UPDATE`) to prevent race conditions under concurrent inserts.**

7. **createNotificationGroup(tenantId, groupKey, rootEventType, rootEntityId, summaryText, summaryTextAr?, notifications[])** — Batch-create grouped notifications with summary. Returns `{ groupId, notificationCount }`. Auth: internal. This is a computed/utility function used by triggers and cron jobs to group related notifications (e.g., "3 new quotes for your review" instead of 3 separate notifications).

### Cron Jobs (ALL 33 — from BACKEND.md Section 9)

**pg_cron jobs (run inside the database):**

| Job | Schedule | Description |
|---|---|---|
| `quote_expiry_check` | Every 15 min | Expire quotes past `valid_until`, notify sales rep |
| `invoice_overdue_check` | Daily 6:00 AM | Mark invoices past due as `overdue`, trigger notification |
| `credit_hold_check` | Daily 8:00 AM | Evaluate credit limit breaches, set `credit_hold` flag |
| `ceo_materialized_view_refresh` | Every 30 min | Refresh all CEO dashboard materialized views | **CORRECTED: Every 5 min (not 30 min).** View is small (<100 rows), CEO needs timely data. |
| `cheque_maturity_check` | Daily 6:00 AM | Check cheques reaching maturity, notify finance |
| `account_deletion_purge` | Daily 2:00 AM | Hard-delete after 30-day grace, anonymize records |
| `driver_compliance_check` | Daily 6:00 AM | Check license/registration/insurance expiry |
| `search_index_sync` | Every 5 min (batch) | Batch-update tsvector search indexes |
| `escalation_check` | Every 30 min | SLA breach check: RFQs >2h, tickets >24h, POs >48h |
| `inventory_reorder_alert` | Daily 7:00 AM | Check below reorder point, auto-create PO drafts |
| `session_cleanup` | Daily 3:00 AM | Purge expired sessions, revoked tokens, stale OTPs |
| `audit_log_archive` | Monthly 1st 1:00 AM | Archive audit entries >90 days to partition |
| `ai_usage_aggregation` | Daily 11:00 PM | Aggregate AI token usage per user/model |
| `revenue_recognition_audit` | Monthly 1st 2:00 AM | Verify delivered invoices have matching revenue events |
| `otp_delivery_rate_update` | Weekly Sunday 11 PM | Calculate delivery rates per carrier, update routing config |
| `onboarding_stale_check` | Daily 9:00 AM | Flag stalled customers, notify sales rep |
| `auto_confirm_drop_ship` | Daily 8:00 AM | Auto-confirm drop-ship deliveries where 72h deadline passed |
| `dispute_sla_check` | Daily 9:00 AM | Escalate invoice disputes exceeding 48h SLA |
| `ai_log_cleanup` | Weekly Sunday 3:00 AM | Delete ai_request_log entries older than 90 days |

**Cloudflare Cron Trigger jobs (run in Workers, NOT in database — configured in wrangler.jsonc):**

| Job | Schedule | Description |
|---|---|---|
| `ar_reminder_30_day` | Daily 7:00 AM | Payment reminder for 30-day overdue invoices |
| `ar_reminder_60_day` | Daily 7:00 AM | Escalated reminder for 60-day overdue, CC finance manager |
| `ar_reminder_90_day` | Daily 7:00 AM | Final notice for 90+ day overdue, trigger credit hold eval |
| `ceo_daily_digest` | Daily 7:00 AM | AI-summarized daily digest via WhatsApp + email |
| `ceo_weekly_insight` | Sunday 8:00 PM | AI weekly strategic insight via email with charts | **CORRECTED: Friday 6PM (not Sunday 8PM).** See Phase 27 context for rationale. |
| `ops_meeting_agenda` | Sunday 7:00 AM | Auto-generate ops meeting agenda from open issues |
| `form_41_quarterly` | 1st Jan/Apr/Jul/Oct 9 AM | Generate quarterly Form 41 tax report |
| `exchange_rate_update` | Daily 8:00 AM | Fetch USD/EGP, EUR/EGP, SAR/EGP rates |
| `bank_feed_sync` | Every 4 hours | Sync bank transactions for reconciliation |
| `supplier_auto_remind` | Daily 9:00 AM | Remind suppliers of unconfirmed POs (48h+) |
| `weather_prefetch` | Daily 5:00 AM | Fetch 3-day forecast, cache in KV + weather_alerts table |
| `prayer_time_update` | 1st of each month | Fetch monthly prayer times for all governorates |
| `pod_integrity_check` | Daily 3:00 AM | Re-hash POD files (7 days), flag mismatches |
| `onboarding_step_executor` | Every 15 min | Execute scheduled onboarding steps |

### Seed Data

**Governorates (27):** Cairo, Giza, Alexandria, Qalyubia, Sharqia, Dakahlia, Gharbia, Monufia, Beheira, Kafr El Sheikh, Damietta, Ismailia, Port Said, Suez, Faiyum, Beni Suef, Minya, Asyut, Sohag, Qena, Luxor, Aswan, Red Sea, New Valley, Matrouh, North Sinai, South Sinai.

**System Settings Defaults:** Quoting (expiry, validity, SLA, approval thresholds, max discounts), Credit (hold threshold, auto-hold days, suspension days), Finance (14% VAT, withholding rates), Delivery (Ramadan mode, Cairo truck ban, Friday blackout, GPS interval), SLA timers, Procurement (exchange rate variance threshold), AI routing config, General (timezone, locale, weekend days).

**Sequence Counters:** For order, quote, quote_request, invoice, proforma_invoice, payment, delivery, supplier_po, supplier_inquiry, credit_note, return, ticket, coded_delivery.

**Unit Translations:** 29 units with en_name, en_abbr, ar_name, ar_abbr.

**Role-Permission Mappings (complete reference):**
- **CEO:** ALL 76 permissions (full list in BACKEND.md Section 12)
- **Admin:** Same as CEO (all 76)
- **Sales Director:** Sales + read adjacent modules
- **Sales Manager:** Quotes, orders, customers, reports
- **Sales Rep:** Own quotes/orders, customer management
- **Quoting Specialist:** Quote creation and pricing
- **BDR:** Lead gen, customer creation, quote requests
- **Procurement Manager:** POs, suppliers, products, inventory read
- **Procurement Officer:** POs (no delete/approve), suppliers
- **Warehouse Manager:** Full inventory, deliveries read, returns
- **Warehouse Worker:** Inventory read/update, assigned deliveries
- **Quality Inspector:** Inventory, PO receiving, returns
- **Dispatcher:** Full delivery, driver/vehicle read
- **Driver:** Assigned deliveries only
- **Accountant:** Full finance, reports
- **AR Clerk:** Invoices read, payment CRUD
- **AP Clerk:** Supplier invoices, PO read
- **Credit Manager:** Full credit control
- **CS Agent:** Tickets, read orders/customers/invoices
- **CS Manager:** Same + assign, escalate, reports
- **Customer and Supplier:** NOT in role_permissions (RLS-only access)

## Non-Negotiable Rules

1. **All migrations idempotent.** `IF NOT EXISTS`, `CREATE OR REPLACE`, `DO $$ BEGIN ... EXCEPTION ... END $$`.
2. **RLS on every new table.** Enable + Force + appropriate policies.
3. **Partitioned tables** for driver_locations and audit_log.
4. **pgvector HNSW indexes** for embedding tables (m=16, ef_construction=64).
5. **LIFO prohibited** under Egyptian law — trigger enforces WAC or FIFO only.
6. **14% VAT** is the default tax rate in system_settings seed data.
7. **Egyptian weekend is Friday + Saturday** in system_settings.

## Known Risks & Gotchas

- **pg_cron requires database superuser** — must be enabled via Supabase dashboard.
- **Materialized views** need `REFRESH MATERIALIZED VIEW CONCURRENTLY` — requires unique index.
- **Trigger ordering:** `on_quote_accepted` must run AFTER the state machine enforcement trigger.
- **search_index sync trigger** runs on multiple tables — careful with trigger function's TG_TABLE_NAME handling.
- **pgvector extension** must be enabled (should be from Phase 2).

## Tips

- Run triggers after Phase 13 tables are in place — they reference those tables.
- Test each trigger individually with INSERT/UPDATE statements.
- For cron jobs: pg_cron ones go in migration, Cloudflare ones go in wrangler.jsonc.
- Seed data should be in a separate migration file for easy re-runs.
- Use `supabase db push` after each migration group to verify.
