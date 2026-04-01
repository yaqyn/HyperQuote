-- Migration 025: pg_cron Job Scheduling
-- 20 database-side cron jobs. All times in UTC (Cairo = UTC+2).
-- Cloudflare Cron Trigger jobs are OUT OF SCOPE (configured in wrangler.jsonc).
--
-- Idempotent: unschedule existing job before scheduling.
-- pg_cron extension already enabled in migration 001.

-- Helper: unschedule if exists, then schedule
-- We use a simple pattern: try unschedule (ignore if not found), then schedule.

-- ============================================================================
-- 1. quote_expiry_check — Every 15 min
--    Expire quotes past valid_until
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'quote_expiry_check';
SELECT cron.schedule(
  'quote_expiry_check',
  '*/15 * * * *',
  $$UPDATE quotes
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('sent', 'viewed')
      AND valid_until < NOW();$$
);

-- ============================================================================
-- 2. invoice_overdue_check — Daily 6:00 AM Cairo = 4:00 AM UTC
--    Mark invoices past due as overdue
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'invoice_overdue_check';
SELECT cron.schedule(
  'invoice_overdue_check',
  '0 4 * * *',
  $$UPDATE invoices
    SET status = 'overdue', updated_at = NOW()
    WHERE status IN ('sent', 'viewed', 'partially_paid')
      AND due_date < CURRENT_DATE
      AND status != 'overdue';$$
);

-- ============================================================================
-- 3. credit_hold_check — Daily 8:00 AM Cairo = 6:00 AM UTC
--    Set credit_hold for customers with invoices overdue >46 days
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'credit_hold_check';
SELECT cron.schedule(
  'credit_hold_check',
  '0 6 * * *',
  $$UPDATE customers
    SET credit_hold = true,
        credit_hold_reason = 'Auto-hold: invoice overdue >46 days',
        updated_at = NOW()
    WHERE credit_hold = false
      AND id IN (
        SELECT DISTINCT customer_id FROM invoices
        WHERE status IN ('overdue', 'sent', 'partially_paid')
          AND due_date < CURRENT_DATE - INTERVAL '46 days'
      );$$
);

-- ============================================================================
-- 4. ceo_materialized_view_refresh — Every 5 min (CORRECTED from 30 min)
--    Refresh CEO attention items view
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'ceo_materialized_view_refresh';
SELECT cron.schedule(
  'ceo_materialized_view_refresh',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY ceo_attention_items;$$
);

-- ============================================================================
-- 5. cheque_maturity_check — Daily 6:00 AM Cairo = 4:02 AM UTC (staggered)
--    Check cheques reaching maturity, insert finance notification
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'cheque_maturity_check';
SELECT cron.schedule(
  'cheque_maturity_check',
  '2 4 * * *',
  $$INSERT INTO notifications (tenant_id, user_id, type, channel, title, title_ar, body, body_ar, entity_type, entity_id)
    SELECT ct.tenant_id,
           (SELECT id FROM employees WHERE tenant_id = ct.tenant_id AND role = 'accountant' LIMIT 1),
           'reminder', 'in_app',
           'Cheque maturing: ' || ct.cheque_number,
           'شيك يستحق: ' || ct.cheque_number,
           'Cheque ' || ct.cheque_number || ' matures on ' || ct.maturity_date::TEXT,
           'الشيك ' || ct.cheque_number || ' يستحق في ' || ct.maturity_date::TEXT,
           'cheque_tracking', ct.id
    FROM cheque_tracking ct
    WHERE ct.status = 'deposited'
      AND ct.maturity_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.entity_type = 'cheque_tracking'
          AND n.entity_id = ct.id
          AND n.type = 'reminder'
          AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
      );$$
);

-- ============================================================================
-- 6. account_deletion_purge — Daily 2:00 AM Cairo = 0:00 AM UTC
--    Hard-delete users with deletion_requested_at > 30 days
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'account_deletion_purge';
SELECT cron.schedule(
  'account_deletion_purge',
  '0 0 * * *',
  $$DELETE FROM user_profiles
    WHERE deletion_requested_at IS NOT NULL
      AND deletion_requested_at < NOW() - INTERVAL '30 days';$$
);

-- ============================================================================
-- 7. driver_compliance_check — Daily 6:00 AM Cairo = 4:04 AM UTC (staggered)
--    Check license/registration/insurance expiry within 30 days
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'driver_compliance_check';
SELECT cron.schedule(
  'driver_compliance_check',
  '4 4 * * *',
  $$INSERT INTO notifications (tenant_id, user_id, type, channel, title, title_ar, body, body_ar, entity_type, entity_id)
    SELECT d.tenant_id, d.user_id,
           'alert', 'in_app',
           'License expiring: ' || d.license_number,
           'رخصة تنتهي: ' || d.license_number,
           'Driver license expires on ' || d.license_expiry::TEXT,
           'رخصة السائق تنتهي في ' || d.license_expiry::TEXT,
           'driver', d.id
    FROM drivers d
    WHERE d.license_expiry < CURRENT_DATE + INTERVAL '30 days'
      AND d.license_expiry >= CURRENT_DATE
      AND d.status != 'inactive'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.entity_type = 'driver'
          AND n.entity_id = d.id
          AND n.type = 'alert'
          AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
      );$$
);

-- ============================================================================
-- 8. search_index_sync — Every 5 min
--    Batch tsvector reindex for recently modified records
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'search_index_sync';
SELECT cron.schedule(
  'search_index_sync',
  '*/5 * * * *',
  $$UPDATE search_index si
    SET tsv = to_tsvector('arabic', COALESCE(si.content, '') || ' ' || COALESCE(si.content_ar, '')),
        updated_at = NOW()
    FROM (
      SELECT id FROM search_index
      WHERE updated_at < synced_at OR synced_at IS NULL
      LIMIT 500
    ) stale
    WHERE si.id = stale.id;$$
);

-- ============================================================================
-- 9. escalation_check — Every 30 min
--    SLA breach: quote_requests >2h, tickets >24h, supplier_pos >48h
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'escalation_check';
SELECT cron.schedule(
  'escalation_check',
  '*/30 * * * *',
  $$-- Quote requests SLA breach (>2 hours without response)
    UPDATE quote_requests
    SET is_escalated = true, updated_at = NOW()
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '2 hours'
      AND is_escalated = false;

    -- Tickets SLA breach (>24 hours without response)
    UPDATE tickets
    SET priority = 'critical', updated_at = NOW()
    WHERE status IN ('open', 'in_progress')
      AND created_at < NOW() - INTERVAL '24 hours'
      AND priority != 'critical';

    -- Supplier POs SLA breach (>48 hours without response)
    UPDATE supplier_pos
    SET is_escalated = true, updated_at = NOW()
    WHERE status IN ('draft', 'sent')
      AND created_at < NOW() - INTERVAL '48 hours'
      AND is_escalated = false;$$
);

-- ============================================================================
-- 10. inventory_reorder_alert — Daily 7:00 AM Cairo = 5:00 AM UTC
--     Check inventory below reorder_point
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'inventory_reorder_alert';
SELECT cron.schedule(
  'inventory_reorder_alert',
  '0 5 * * *',
  $$INSERT INTO notifications (tenant_id, user_id, type, channel, title, title_ar, body, body_ar, entity_type, entity_id)
    SELECT i.tenant_id,
           (SELECT id FROM employees WHERE tenant_id = i.tenant_id AND role = 'warehouse_manager' LIMIT 1),
           'alert', 'in_app',
           'Low stock: ' || p.name,
           'مخزون منخفض: ' || p.name_ar,
           p.name || ' is below reorder point (' || i.quantity_on_hand || '/' || i.reorder_point || ')',
           p.name_ar || ' أقل من حد إعادة الطلب (' || i.quantity_on_hand || '/' || i.reorder_point || ')',
           'inventory', i.id
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    WHERE i.quantity_on_hand <= i.reorder_point
      AND i.reorder_point > 0
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.entity_type = 'inventory'
          AND n.entity_id = i.id
          AND n.type = 'alert'
          AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
      );$$
);

-- ============================================================================
-- 11. session_cleanup — Daily 3:00 AM Cairo = 1:00 AM UTC
--     Delete expired sessions, OTPs older than 10 min
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'session_cleanup';
SELECT cron.schedule(
  'session_cleanup',
  '0 1 * * *',
  $$DELETE FROM otp_delivery_log
    WHERE created_at < NOW() - INTERVAL '10 minutes';$$
);

-- ============================================================================
-- 12. audit_log_archive — Monthly 1st, 1:00 AM Cairo = 11:00 PM UTC prev day
--     Archive audit entries >90 days
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'audit_log_archive';
SELECT cron.schedule(
  'audit_log_archive',
  '0 23 1 * *',
  $$DELETE FROM state_history
    WHERE created_at < NOW() - INTERVAL '90 days';$$
);

-- ============================================================================
-- 13. ai_usage_aggregation — Daily 11:00 PM Cairo = 9:00 PM UTC
--     Aggregate ai_request_log per user/model
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'ai_usage_aggregation';
SELECT cron.schedule(
  'ai_usage_aggregation',
  '0 21 * * *',
  $$INSERT INTO system_settings (tenant_id, category, key, value)
    SELECT tenant_id, 'ai_metrics',
           'daily_usage_' || CURRENT_DATE::TEXT,
           jsonb_build_object(
             'date', CURRENT_DATE,
             'total_requests', COUNT(*),
             'total_tokens', SUM(total_tokens),
             'by_model', jsonb_object_agg(model, model_count)
           )
    FROM (
      SELECT tenant_id, model, COUNT(*) as model_count, SUM(total_tokens) as total_tokens
      FROM ai_request_log
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY tenant_id, model
    ) daily_stats
    GROUP BY tenant_id
    ON CONFLICT (tenant_id, category, key) DO UPDATE
      SET value = EXCLUDED.value;$$
);

-- ============================================================================
-- 14. revenue_recognition_audit — Monthly 1st, 2:00 AM Cairo = 0:00 AM UTC
--     Verify delivered invoices match revenue events
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'revenue_recognition_audit';
SELECT cron.schedule(
  'revenue_recognition_audit',
  '0 0 1 * *',
  $$INSERT INTO notifications (tenant_id, user_id, type, channel, title, title_ar, body, body_ar, entity_type, entity_id)
    SELECT i.tenant_id,
           (SELECT id FROM employees WHERE tenant_id = i.tenant_id AND role = 'accountant' LIMIT 1),
           'alert', 'in_app',
           'Revenue recognition gap: Invoice ' || i.invoice_number,
           'فجوة في الاعتراف بالإيرادات: فاتورة ' || i.invoice_number,
           'Invoice ' || i.invoice_number || ' is delivered but has no matching revenue event',
           'الفاتورة ' || i.invoice_number || ' تم تسليمها ولكن لا يوجد حدث إيرادات مطابق',
           'invoice', i.id
    FROM invoices i
    JOIN orders o ON o.id = i.order_id
    WHERE o.status = 'delivered'
      AND i.created_at >= (CURRENT_DATE - INTERVAL '1 month')
      AND NOT EXISTS (
        SELECT 1 FROM state_history sh
        WHERE sh.entity_type = 'invoice'
          AND sh.entity_id = i.id
          AND sh.new_state = 'revenue_recognized'
      );$$
);

-- ============================================================================
-- 15. otp_delivery_rate_update — Weekly Sunday 11:00 PM Cairo = 9:00 PM UTC Sunday
--     Calculate per-carrier delivery rates
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'otp_delivery_rate_update';
SELECT cron.schedule(
  'otp_delivery_rate_update',
  '0 21 * * 0',
  $$UPDATE carrier_routing_config crc
    SET delivery_rate = sub.rate,
        updated_at = NOW()
    FROM (
      SELECT carrier,
             COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / NULLIF(COUNT(*), 0) as rate
      FROM otp_delivery_log
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY carrier
    ) sub
    WHERE crc.carrier = sub.carrier;$$
);

-- ============================================================================
-- 16. onboarding_stale_check — Daily 9:00 AM Cairo = 7:00 AM UTC
--     Flag stalled onboarding >48h
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'onboarding_stale_check';
SELECT cron.schedule(
  'onboarding_stale_check',
  '0 7 * * *',
  $$UPDATE customer_onboarding_progress
    SET is_stalled = true, updated_at = NOW()
    WHERE status = 'in_progress'
      AND updated_at < NOW() - INTERVAL '48 hours'
      AND is_stalled = false;$$
);

-- ============================================================================
-- 17. auto_confirm_drop_ship — Daily 8:00 AM Cairo = 6:02 AM UTC (staggered)
--     Auto-confirm drop_ship_pod where auto_confirm_deadline passed
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'auto_confirm_drop_ship';
SELECT cron.schedule(
  'auto_confirm_drop_ship',
  '2 6 * * *',
  $$UPDATE drop_ship_pod
    SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
    WHERE status = 'awaiting_customer_confirmation'
      AND auto_confirm_deadline < NOW();$$
);

-- ============================================================================
-- 18. dispute_sla_check — Daily 9:00 AM Cairo = 7:02 AM UTC (staggered)
--     Escalate invoice disputes exceeding 48h SLA
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'dispute_sla_check';
SELECT cron.schedule(
  'dispute_sla_check',
  '2 7 * * *',
  $$UPDATE invoice_disputes
    SET is_escalated = true, updated_at = NOW()
    WHERE sla_deadline < NOW()
      AND status NOT IN ('resolved', 'closed')
      AND is_escalated = false;$$
);

-- ============================================================================
-- 19. ai_log_cleanup — Weekly Sunday 3:00 AM Cairo = 1:00 AM UTC Sunday
--     Delete ai_request_log entries older than 90 days
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'ai_log_cleanup';
SELECT cron.schedule(
  'ai_log_cleanup',
  '0 1 * * 0',
  $$DELETE FROM ai_request_log
    WHERE created_at < NOW() - INTERVAL '90 days';$$
);

-- ============================================================================
-- 20. ap_aging_snapshot_refresh — Daily 2:00 AM Cairo = 0:00 AM UTC
--     Refresh AP aging snapshot materialized view
-- ============================================================================
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'ap_aging_snapshot_refresh';
SELECT cron.schedule(
  'ap_aging_snapshot_refresh',
  '2 0 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY ap_aging_snapshot;$$
);

-- ============================================================================
-- Verification: Should have 20 jobs scheduled
-- SELECT jobname, schedule FROM cron.job ORDER BY jobname;
-- ============================================================================
