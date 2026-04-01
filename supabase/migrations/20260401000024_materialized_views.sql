-- Migration 024: Materialized Views
-- 2 materialized views with unique indexes for CONCURRENTLY refresh
-- ceo_attention_items: 5-minute refresh cycle (bounced cheques, overdue invoices, credit breaches, delivery failures, PO rejections)
-- ap_aging_snapshot: daily refresh cycle (AP aging buckets by supplier)

-- ============================================================================
-- 1. ceo_attention_items (Refresh Every 5 Min)
-- ============================================================================

DO $$ BEGIN
  -- Drop if exists for idempotency (materialized views don't support IF NOT EXISTS)
  DROP MATERIALIZED VIEW IF EXISTS ceo_attention_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE MATERIALIZED VIEW ceo_attention_items AS
-- Bounced cheques (last 7 days)
SELECT 'bounced_cheque'::TEXT AS item_type, 'cheque_tracking'::TEXT AS entity_type,
  ct.id AS entity_id, ct.tenant_id, 'critical'::TEXT AS severity,
  'Bounced cheque: ' || ct.cheque_number AS title, c.company_name AS subtitle,
  ct.amount, ct.updated_at AS created_at
FROM cheque_tracking ct
JOIN payments p ON p.id = ct.payment_id
JOIN customers c ON c.id = p.customer_id
WHERE ct.status = 'bounced' AND ct.updated_at >= NOW() - INTERVAL '7 days'

UNION ALL
-- Invoices overdue > 60 days
SELECT 'overdue_invoice'::TEXT, 'invoices'::TEXT, i.id, i.tenant_id,
  CASE WHEN i.due_date < NOW() - INTERVAL '90 days' THEN 'critical' ELSE 'warning' END,
  'Overdue invoice: ' || i.invoice_number, c.company_name,
  i.total - i.amount_paid, i.due_date::TIMESTAMPTZ
FROM invoices i JOIN customers c ON c.id = i.customer_id
WHERE i.status NOT IN ('paid', 'cancelled', 'written_off') AND i.due_date < NOW() - INTERVAL '60 days'

UNION ALL
-- Credit limit breaches
SELECT 'credit_breach'::TEXT, 'customers'::TEXT, c.id, c.tenant_id, 'critical'::TEXT,
  'Credit limit breach: ' || c.company_name,
  'Limit: ' || c.credit_limit::TEXT || ' / Outstanding: ' || COALESCE(ar.total_outstanding, 0)::TEXT,
  COALESCE(ar.total_outstanding, 0) - c.credit_limit, NOW()
FROM customers c
LEFT JOIN LATERAL (
  SELECT SUM(total - amount_paid) AS total_outstanding FROM invoices
  WHERE customer_id = c.id AND status NOT IN ('paid', 'cancelled', 'written_off')
) ar ON TRUE
WHERE c.credit_limit > 0 AND COALESCE(ar.total_outstanding, 0) > c.credit_limit

UNION ALL
-- Delivery failures (today)
SELECT 'delivery_failure'::TEXT, 'deliveries'::TEXT, d.id, d.tenant_id, 'warning'::TEXT,
  'Delivery failed: ' || d.delivery_number, d.failure_reason::TEXT, 0::DECIMAL(15,2), d.updated_at
FROM deliveries d WHERE d.status = 'failed' AND d.updated_at::DATE = CURRENT_DATE

UNION ALL
-- Supplier PO rejections (last 7 days)
SELECT 'po_rejection'::TEXT, 'supplier_pos'::TEXT, po.id, po.tenant_id, 'warning'::TEXT,
  'PO rejected: ' || po.po_number, s.company_name, po.total, po.updated_at
FROM supplier_pos po JOIN suppliers s ON s.id = po.supplier_id
WHERE po.status = 'rejected' AND po.updated_at >= NOW() - INTERVAL '7 days'

WITH NO DATA;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_ceo_attention_unique ON ceo_attention_items (item_type, entity_id);
CREATE INDEX idx_ceo_attention_tenant_severity ON ceo_attention_items (tenant_id, severity);
CREATE INDEX idx_ceo_attention_created ON ceo_attention_items (created_at DESC);

-- ============================================================================
-- 2. ap_aging_snapshot (Refresh Daily)
-- ============================================================================

DO $$ BEGIN
  DROP MATERIALIZED VIEW IF EXISTS ap_aging_snapshot;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE MATERIALIZED VIEW ap_aging_snapshot AS
SELECT
  si.supplier_id, s.company_name AS supplier_name, si.tenant_id,
  SUM(CASE WHEN si.due_date >= CURRENT_DATE THEN si.total - si.paid_amount ELSE 0 END) AS current_amount,
  SUM(CASE WHEN si.due_date < CURRENT_DATE AND si.due_date >= CURRENT_DATE - 30 THEN si.total - si.paid_amount ELSE 0 END) AS d1_30,
  SUM(CASE WHEN si.due_date < CURRENT_DATE - 30 AND si.due_date >= CURRENT_DATE - 60 THEN si.total - si.paid_amount ELSE 0 END) AS d31_60,
  SUM(CASE WHEN si.due_date < CURRENT_DATE - 60 AND si.due_date >= CURRENT_DATE - 90 THEN si.total - si.paid_amount ELSE 0 END) AS d61_90,
  SUM(CASE WHEN si.due_date < CURRENT_DATE - 90 THEN si.total - si.paid_amount ELSE 0 END) AS d90_plus,
  SUM(si.total - si.paid_amount) AS total_outstanding,
  CURRENT_DATE AS as_of_date
FROM supplier_invoices si JOIN suppliers s ON s.id = si.supplier_id
WHERE si.status NOT IN ('paid', 'cancelled')
GROUP BY si.supplier_id, s.company_name, si.tenant_id
WITH NO DATA;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_ap_aging_unique ON ap_aging_snapshot (tenant_id, supplier_id);
CREATE INDEX idx_ap_aging_tenant ON ap_aging_snapshot (tenant_id);
CREATE INDEX idx_ap_aging_supplier ON ap_aging_snapshot (supplier_id);

-- ============================================================================
-- 3. Initial REFRESH (cannot use CONCURRENTLY on first load -- no data exists yet)
-- ============================================================================

REFRESH MATERIALIZED VIEW ceo_attention_items;
REFRESH MATERIALIZED VIEW ap_aging_snapshot;
