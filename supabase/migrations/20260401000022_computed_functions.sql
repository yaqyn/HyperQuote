-- Migration 022: Computed Functions + Utility Functions
-- 7 functions: generate_sequence_number, calculate_payment_behavior_score,
-- calculate_customer_tier_score, calculate_available_quantity,
-- calculate_ar_aging, recalculate_wac, create_notification_group
-- All use CREATE OR REPLACE for idempotency

-- ============================================================================
-- 1. generate_sequence_number() — Thread-safe sequence generator
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_sequence_number(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
  v_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
BEGIN
  UPDATE sequence_counters
  SET current_value = current_value + 1
  WHERE tenant_id = p_tenant_id
    AND entity_type = p_entity_type
    AND COALESCE(year, 0) = COALESCE(v_year, 0)
  RETURNING current_value INTO v_seq;

  IF NOT FOUND THEN
    INSERT INTO sequence_counters (tenant_id, entity_type, prefix, current_value, year)
    VALUES (p_tenant_id, p_entity_type, p_prefix, 1, v_year)
    ON CONFLICT (tenant_id, entity_type, COALESCE(year, 0))
    DO UPDATE SET current_value = sequence_counters.current_value + 1
    RETURNING current_value INTO v_seq;
  END IF;

  RETURN p_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- ============================================================================
-- 2. calculate_payment_behavior_score() — Invoice-weighted timeliness (0-100)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_payment_behavior_score(p_customer_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_score DECIMAL(15,6) := 0; v_total_weight DECIMAL(15,6) := 0;
  v_invoice RECORD; v_timeliness_score DECIMAL(5,2);
  v_amount_weight DECIMAL(4,2); v_recency_weight DECIMAL(4,2);
  v_combined_weight DECIMAL(8,4); v_days_diff INTEGER; v_months_ago DECIMAL(5,1);
BEGIN
  FOR v_invoice IN
    SELECT id, total, due_date, paid_at, status, created_at FROM invoices
    WHERE customer_id = p_customer_id AND status NOT IN ('draft', 'cancelled')
      AND created_at >= NOW() - INTERVAL '24 months' ORDER BY created_at DESC
  LOOP
    v_amount_weight := CASE WHEN v_invoice.total >= 500000 THEN 3.0 WHEN v_invoice.total >= 100000 THEN 2.0 ELSE 1.0 END;
    v_months_ago := EXTRACT(EPOCH FROM (NOW() - v_invoice.created_at)) / (30.44 * 86400);
    v_recency_weight := CASE WHEN v_months_ago <= 3 THEN 3.0 WHEN v_months_ago <= 6 THEN 2.0 WHEN v_months_ago <= 12 THEN 1.0 ELSE 0.5 END;
    v_combined_weight := v_amount_weight * v_recency_weight;

    IF v_invoice.status IN ('written_off') THEN v_timeliness_score := 0;
    ELSIF v_invoice.paid_at IS NULL AND v_invoice.status NOT IN ('paid', 'adjusted') THEN
      v_days_diff := (CURRENT_DATE - v_invoice.due_date);
      v_timeliness_score := CASE WHEN v_days_diff <= 0 THEN 90 WHEN v_days_diff <= 7 THEN 85 WHEN v_days_diff <= 15 THEN 70 WHEN v_days_diff <= 30 THEN 50 WHEN v_days_diff <= 60 THEN 30 WHEN v_days_diff <= 90 THEN 15 ELSE 5 END;
    ELSE
      v_days_diff := (v_invoice.paid_at::DATE - v_invoice.due_date);
      v_timeliness_score := CASE WHEN v_days_diff <= -15 THEN 100 WHEN v_days_diff <= -1 THEN 95 WHEN v_days_diff <= 0 THEN 90 WHEN v_days_diff <= 7 THEN 85 WHEN v_days_diff <= 15 THEN 70 WHEN v_days_diff <= 30 THEN 50 WHEN v_days_diff <= 60 THEN 30 WHEN v_days_diff <= 90 THEN 15 ELSE 5 END;
    END IF;

    v_score := v_score + (v_timeliness_score * v_combined_weight);
    v_total_weight := v_total_weight + v_combined_weight;
  END LOOP;

  IF v_total_weight = 0 THEN RETURN 50.00; END IF;
  RETURN ROUND(v_score / v_total_weight, 2);
END;
$$;

-- ============================================================================
-- 3. calculate_customer_tier_score() — Composite of 5 weighted dimensions (0-100)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_customer_tier_score(p_customer_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_order_count INTEGER; v_cumulative_spend DECIMAL(15,2); v_payment_score DECIMAL(5,2);
  v_months_active DECIMAL(5,1); v_consistency_score DECIMAL(5,2);
  v_order_count_score DECIMAL(5,2); v_spend_score DECIMAL(5,2); v_tenure_score DECIMAL(5,2);
  v_months_with_orders INTEGER; v_total_months INTEGER;
  v_customer_created_at TIMESTAMPTZ; v_composite DECIMAL(5,2);
BEGIN
  SELECT created_at INTO v_customer_created_at FROM customers WHERE id = p_customer_id;
  IF v_customer_created_at IS NULL THEN RETURN 0; END IF;

  SELECT COUNT(*), COALESCE(SUM(total), 0) INTO v_order_count, v_cumulative_spend
  FROM orders WHERE customer_id = p_customer_id AND status NOT IN ('cancelled', 'cancellation_requested');

  v_order_count_score := LEAST(100, (v_order_count::DECIMAL / 5.0) * 100);

  v_spend_score := CASE
    WHEN v_cumulative_spend >= 5000000 THEN 100
    WHEN v_cumulative_spend >= 2000000 THEN 80 + ((v_cumulative_spend - 2000000) / 3000000.0) * 20
    WHEN v_cumulative_spend >= 500000 THEN 50 + ((v_cumulative_spend - 500000) / 1500000.0) * 30
    ELSE (v_cumulative_spend / 500000.0) * 50
  END;

  v_payment_score := calculate_payment_behavior_score(p_customer_id);

  v_months_active := EXTRACT(EPOCH FROM (NOW() - v_customer_created_at)) / (30.44 * 86400);
  v_tenure_score := CASE
    WHEN v_months_active >= 24 THEN 100
    WHEN v_months_active >= 12 THEN 70 + ((v_months_active - 12) / 12.0) * 30
    WHEN v_months_active >= 3 THEN 30 + ((v_months_active - 3) / 9.0) * 40
    ELSE (v_months_active / 3.0) * 30
  END;

  v_total_months := GREATEST(1, CEIL(v_months_active));
  SELECT COUNT(DISTINCT DATE_TRUNC('month', created_at)) INTO v_months_with_orders
  FROM orders WHERE customer_id = p_customer_id AND status NOT IN ('cancelled', 'cancellation_requested')
    AND created_at >= NOW() - INTERVAL '12 months';
  v_consistency_score := LEAST(100, (v_months_with_orders::DECIMAL / LEAST(v_total_months, 12)) * 100);

  v_composite := (v_order_count_score * 0.20) + (v_spend_score * 0.20) + (v_payment_score * 0.30)
               + (v_tenure_score * 0.15) + (v_consistency_score * 0.15);
  RETURN ROUND(v_composite, 2);
END;
$$;

-- ============================================================================
-- 4. calculate_available_quantity() — On-hand minus reserved/allocated/expired
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_available_quantity(
  p_product_id UUID, p_warehouse_id UUID DEFAULT NULL
)
RETURNS DECIMAL(12,3)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_on_hand DECIMAL(12,3) := 0; v_reserved DECIMAL(12,3) := 0;
  v_allocated DECIMAL(12,3) := 0; v_on_hold DECIMAL(12,3) := 0;
  v_damaged DECIMAL(12,3) := 0; v_available DECIMAL(12,3);
BEGIN
  IF p_warehouse_id IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity_on_hand), 0), COALESCE(SUM(quantity_reserved), 0), COALESCE(SUM(quantity_allocated), 0)
    INTO v_on_hand, v_reserved, v_allocated
    FROM inventory WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    SELECT COALESCE(SUM(quantity_on_hand), 0) INTO v_on_hold FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id
      AND lot_number IS NOT NULL AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE;
  ELSE
    SELECT COALESCE(SUM(quantity_on_hand), 0), COALESCE(SUM(quantity_reserved), 0), COALESCE(SUM(quantity_allocated), 0)
    INTO v_on_hand, v_reserved, v_allocated FROM inventory WHERE product_id = p_product_id;
  END IF;

  v_available := v_on_hand - v_reserved - v_allocated - v_on_hold - v_damaged;
  RETURN GREATEST(0, v_available);
END;
$$;

-- ============================================================================
-- 5. calculate_ar_aging() — 5 aging buckets from unpaid invoices
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_ar_aging(p_customer_id UUID)
RETURNS TABLE (
  current_amount DECIMAL(15,2), d1_30 DECIMAL(15,2), d31_60 DECIMAL(15,2),
  d61_90 DECIMAL(15,2), d90_plus DECIMAL(15,2), total_outstanding DECIMAL(15,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - 30 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 30 AND i.due_date >= CURRENT_DATE - 60 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 60 AND i.due_date >= CURRENT_DATE - 90 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 90 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(i.balance_due), 0)::DECIMAL(15,2)
  FROM invoices i
  WHERE i.customer_id = p_customer_id AND i.status IN ('sent', 'viewed', 'partially_paid', 'overdue', 'collections', 'disputed');
END;
$$;

-- ============================================================================
-- 6. recalculate_wac() — Weighted average cost update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_wac(
  p_tenant_id UUID, p_product_id UUID, p_warehouse_id UUID,
  p_new_quantity DECIMAL(12,3), p_new_unit_cost DECIMAL(12,4)
)
RETURNS DECIMAL(12,4)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current record; v_new_wac DECIMAL(12,4); v_costing_method inventory_costing_method;
BEGIN
  SELECT inventory_costing_method INTO v_costing_method FROM tenants WHERE id = p_tenant_id;
  IF v_costing_method != 'wac' THEN RETURN p_new_unit_cost; END IF;

  SELECT quantity_on_hand, unit_cost INTO v_current FROM inventory
  WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND warehouse_id = p_warehouse_id FOR UPDATE;

  IF v_current IS NULL OR (v_current.quantity_on_hand + p_new_quantity) <= 0 THEN RETURN p_new_unit_cost; END IF;

  v_new_wac := ((v_current.quantity_on_hand * COALESCE(v_current.unit_cost, 0)) + (p_new_quantity * p_new_unit_cost))
    / (v_current.quantity_on_hand + p_new_quantity);

  UPDATE inventory SET unit_cost = v_new_wac, total_value = (quantity_on_hand + p_new_quantity) * v_new_wac, updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND warehouse_id = p_warehouse_id;

  RETURN v_new_wac;
END;
$$;

-- ============================================================================
-- 7. create_notification_group() — Batch-create grouped notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION create_notification_group(
  p_tenant_id UUID,
  p_group_key TEXT,
  p_root_event_type TEXT,
  p_root_entity_id UUID,
  p_summary_text TEXT,
  p_summary_text_ar TEXT DEFAULT NULL,
  p_notifications JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_count INTEGER := 0;
  v_notif JSONB;
  v_notif_id UUID;
BEGIN
  -- Upsert notification group (increment count on conflict)
  INSERT INTO notification_groups (tenant_id, group_key, root_event_type, root_entity_id, summary_text, summary_text_ar, notification_count)
  VALUES (p_tenant_id, p_group_key, p_root_event_type, p_root_entity_id, p_summary_text, p_summary_text_ar, 0)
  ON CONFLICT (tenant_id, group_key)
  DO UPDATE SET
    notification_count = notification_groups.notification_count + jsonb_array_length(p_notifications),
    summary_text = EXCLUDED.summary_text,
    summary_text_ar = EXCLUDED.summary_text_ar
  RETURNING id INTO v_group_id;

  -- Insert each notification in the array
  FOR v_notif IN SELECT * FROM jsonb_array_elements(p_notifications)
  LOOP
    INSERT INTO notifications (
      tenant_id, user_id, channel, priority, title, body,
      entity_type, entity_id, action_url, group_key, metadata
    ) VALUES (
      p_tenant_id,
      (v_notif->>'user_id')::UUID,
      COALESCE((v_notif->>'channel')::notification_channel, 'in_app'),
      COALESCE((v_notif->>'priority')::notification_priority, 'normal'),
      v_notif->>'title',
      v_notif->>'body',
      v_notif->>'entity_type',
      (v_notif->>'entity_id')::UUID,
      v_notif->>'action_url',
      p_group_key,
      COALESCE(v_notif->'metadata', '{}'::jsonb)
    );
    v_count := v_count + 1;
  END LOOP;

  -- Update count for fresh inserts (not conflict case)
  UPDATE notification_groups SET notification_count = v_count
  WHERE id = v_group_id AND notification_count = 0;

  RETURN jsonb_build_object('group_id', v_group_id, 'notification_count', v_count);
END;
$$;
