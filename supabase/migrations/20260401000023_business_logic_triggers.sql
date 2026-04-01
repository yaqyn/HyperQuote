-- Migration 023: Business Logic Triggers
-- 17 trigger functions + trigger definitions for core business workflows
-- All business logic triggers are AFTER UPDATE (or BEFORE INSERT/UPDATE for validation).
-- State machine triggers (migration 018) are BEFORE UPDATE -- they validate first, then these act.

-- ============================================================================
-- SCHEMA ADDITIONS: columns required by triggers but missing from prior migrations
-- ============================================================================

-- products.is_wind_sensitive (needed by set_wind_sensitivity trigger)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_wind_sensitive BOOLEAN DEFAULT FALSE;

-- customers.credit_hold + credit_hold_reason (needed by on_payment_bounced trigger)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_hold_reason TEXT;

-- ============================================================================
-- 1. on_quote_accepted() -- AFTER UPDATE OF status ON quotes
--    When status -> 'accepted', auto-create order + proforma invoice
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_customer RECORD;
  v_bank_account RECORD;
  v_due_date DATE;
  v_today DATE := (NOW() AT TIME ZONE 'Africa/Cairo')::DATE;
BEGIN
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN

    -- Get customer info for tier-aware logic
    SELECT c.tier, c.credit_terms INTO v_customer
    FROM customers c WHERE c.id = NEW.customer_id;

    -- 1. Create Order
    INSERT INTO public.orders (
      tenant_id, customer_id, quote_id, project_id, status,
      subtotal, tax_amount, delivery_fee, discount_amount, total,
      currency, payment_terms, delivery_address_id,
      requested_delivery_date, assigned_sales_rep,
      customer_po_reference, created_by
    )
    VALUES (
      NEW.tenant_id, NEW.customer_id, NEW.id, NEW.project_id, 'confirmed',
      NEW.subtotal, NEW.tax_amount, NEW.delivery_fee, NEW.discount_amount, NEW.total,
      NEW.currency, NEW.payment_terms, NEW.delivery_address_id,
      NEW.estimated_delivery_date, NEW.assigned_to,
      NEW.customer_po_reference, NEW.accepted_by
    )
    RETURNING id INTO v_order_id;

    -- Copy quote items to order items
    INSERT INTO public.order_items (
      order_id, quote_item_id, product_id, product_name,
      quantity, unit_of_measure, unit_price, line_total, sort_order
    )
    SELECT
      v_order_id, qi.id, qi.product_id, qi.product_name,
      qi.quantity, qi.unit_of_measure, qi.unit_price, qi.line_total, qi.sort_order
    FROM quote_items qi
    WHERE qi.quote_id = NEW.id;

    -- Update order total_items count
    UPDATE orders SET total_items = (
      SELECT COUNT(*) FROM order_items WHERE order_id = v_order_id
    ) WHERE id = v_order_id;

    -- 1b. Tier 4 auto-bypass: set payment_instrument_verified = TRUE
    IF v_customer.tier = 'tier_4_preferred' THEN
      UPDATE orders SET
        payment_instrument_verified = TRUE,
        payment_terms = 'net_30',
        internal_notes = COALESCE(internal_notes, '') ||
          E'\n[AUTO] Tier 4 preferred customer -- payment instrument requirement bypassed. Net 30 terms applied.'
      WHERE id = v_order_id;
    END IF;

    -- 2. Generate Proforma Invoice
    SELECT generate_sequence_number(NEW.tenant_id, 'proforma_invoice', 'PI')
    INTO v_invoice_number;

    v_due_date := v_today + INTERVAL '7 days';

    SELECT * INTO v_bank_account
    FROM company_bank_accounts
    WHERE tenant_id = NEW.tenant_id AND is_default = TRUE AND is_active = TRUE
    LIMIT 1;

    INSERT INTO public.invoices (
      tenant_id, invoice_number, invoice_type, order_id, quote_id,
      customer_id, project_id, status,
      subtotal, tax_amount, delivery_charges, discount_amount, total,
      currency, payment_terms, due_date, tax_rate,
      buyer_trn, seller_trn,
      wire_instructions
    )
    VALUES (
      NEW.tenant_id, v_invoice_number, 'proforma', v_order_id, NEW.id,
      NEW.customer_id, NEW.project_id, 'sent',
      NEW.subtotal, NEW.tax_amount, NEW.delivery_fee, NEW.discount_amount, NEW.total,
      NEW.currency, NEW.payment_terms, v_due_date, 0.14,
      (SELECT tax_registration_number FROM customers WHERE id = NEW.customer_id),
      (SELECT (value->>'trn')::TEXT FROM system_settings WHERE tenant_id = NEW.tenant_id AND key = 'company_trn' LIMIT 1),
      jsonb_build_object(
        'bank_name', v_bank_account.bank_name,
        'bank_name_ar', v_bank_account.bank_name_ar,
        'iban', v_bank_account.iban,
        'swift_code', v_bank_account.swift_code,
        'branch', v_bank_account.branch,
        'currency', v_bank_account.currency,
        'reference', 'Order ' || (SELECT order_number FROM orders WHERE id = v_order_id)
      )
    )
    RETURNING id INTO v_invoice_id;

    -- Copy line items to invoice_items
    INSERT INTO public.invoice_items (
      invoice_id, order_item_id, product_id, description,
      quantity, unit_of_measure, unit_price, line_total, sort_order
    )
    SELECT
      v_invoice_id, oi.id, oi.product_id, oi.product_name,
      oi.quantity, oi.unit_of_measure, oi.unit_price, oi.line_total, oi.sort_order
    FROM order_items oi
    WHERE oi.order_id = v_order_id;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_accepted ON public.quotes;
CREATE TRIGGER trg_quote_accepted
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
  EXECUTE FUNCTION public.on_quote_accepted();

-- ============================================================================
-- 2. on_delivery_confirmed() -- AFTER UPDATE OF status ON deliveries
--    When status -> 'delivered', auto-create invoice + revenue recognition event
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_delivery_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_cogs DECIMAL(15,2);
  v_delivery_cost DECIMAL(15,2);
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := (v_now AT TIME ZONE 'Africa/Cairo')::date;
BEGIN
  IF OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
    SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;

    -- Calculate COGS from supplier PO items
    SELECT COALESCE(SUM(poi.unit_cost * di.delivered_quantity), 0)
    INTO v_cogs
    FROM public.delivery_items di
    JOIN public.supplier_po_items poi ON poi.order_item_id = di.order_item_id
    WHERE di.delivery_id = NEW.id;

    -- Use order delivery_fee since deliveries table has no cost column
    v_delivery_cost := COALESCE(v_order.delivery_fee, 0);

    -- Generate invoice number
    SELECT generate_sequence_number(NEW.tenant_id, 'invoice', 'INV')
    INTO v_invoice_number;

    -- Create invoice
    INSERT INTO public.invoices (
      tenant_id, invoice_number, customer_id, order_id, delivery_id,
      subtotal, tax_amount, delivery_charges, total,
      cogs_amount, currency, status, due_date,
      revenue_recognized, revenue_recognized_at
    )
    VALUES (
      NEW.tenant_id, v_invoice_number, v_order.customer_id, NEW.order_id, NEW.id,
      v_order.total, v_order.total * 0.14, v_delivery_cost,
      v_order.total * 1.14 + v_delivery_cost,
      v_cogs, v_order.currency, 'draft',
      v_today + INTERVAL '30 days',
      TRUE, v_now
    )
    RETURNING id INTO v_invoice_id;

    -- Create revenue recognition event (EAS 48)
    INSERT INTO public.revenue_recognition_events (
      tenant_id, invoice_id, delivery_id, order_id, customer_id,
      recognition_date, gross_revenue, cost_of_goods_sold,
      delivery_cost, vat_amount, currency,
      fiscal_year, fiscal_month
    )
    VALUES (
      NEW.tenant_id, v_invoice_id, NEW.id, NEW.order_id, v_order.customer_id,
      v_today, v_order.total, v_cogs,
      v_delivery_cost, v_order.total * 0.14, v_order.currency,
      EXTRACT(YEAR FROM v_today)::int,
      EXTRACT(MONTH FROM v_today)::int
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_confirmed ON public.deliveries;
CREATE TRIGGER trg_delivery_confirmed
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION public.on_delivery_confirmed();

-- ============================================================================
-- 3. on_payment_bounced() -- AFTER UPDATE OF status ON payments
--    When status -> 'bounced', set customer credit_hold = true
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_payment_bounced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != 'bounced' AND NEW.status = 'bounced' THEN
    UPDATE public.customers
    SET credit_hold = true,
        credit_hold_reason = 'Payment bounced: ' || NEW.reference_number
    WHERE id = NEW.customer_id AND tenant_id = NEW.tenant_id;

    -- FIX 2: notifications uses 'channel' not 'type'; FIX 3: roles corrected to valid enum values
    INSERT INTO public.notifications (tenant_id, user_id, channel, priority, title, body, entity_type, entity_id)
    SELECT NEW.tenant_id, ur.user_id, 'in_app', 'high',
      'Payment Bounced',
      'Payment ' || NEW.reference_number || ' has bounced. Customer placed on credit hold.',
      'payment', NEW.id
    FROM public.user_roles ur
    WHERE ur.tenant_id = NEW.tenant_id
      AND ur.role IN ('accountant', 'credit_manager', 'admin');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_bounced ON public.payments;
CREATE TRIGGER trg_payment_bounced
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'bounced' AND OLD.status != 'bounced')
  EXECUTE FUNCTION public.on_payment_bounced();

-- ============================================================================
-- 4. on_cheque_cleared() -- AFTER UPDATE OF status ON cheque_tracking
--    When status -> 'cleared', apply payment to invoice
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_cheque_cleared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != 'cleared' AND NEW.status = 'cleared' THEN
    -- Mark payment as fully_applied (cleared cheque completes the payment)
    UPDATE public.payments
    SET status = 'fully_applied', cleared_date = (NOW() AT TIME ZONE 'Africa/Cairo')::DATE
    WHERE id = NEW.payment_id AND tenant_id = NEW.tenant_id;

    -- Mark invoices as paid if fully covered via payment_applications
    UPDATE public.invoices inv
    SET status = 'paid', paid_at = NOW()
    WHERE inv.id IN (
      SELECT pa.invoice_id FROM public.payment_applications pa WHERE pa.payment_id = NEW.payment_id
    )
    AND inv.total <= (
      SELECT COALESCE(SUM(pa2.amount), 0) FROM public.payment_applications pa2
      JOIN public.payments p ON p.id = pa2.payment_id
      WHERE pa2.invoice_id = inv.id AND p.status = 'fully_applied'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cheque_cleared ON public.cheque_tracking;
CREATE TRIGGER trg_cheque_cleared
  AFTER UPDATE OF status ON public.cheque_tracking
  FOR EACH ROW
  WHEN (NEW.status = 'cleared' AND OLD.status != 'cleared')
  EXECUTE FUNCTION public.on_cheque_cleared();

-- ============================================================================
-- 5. on_inventory_movement() -- AFTER INSERT ON stock_movements (FIX 1: corrected table name)
--    Recalculate inventory totals
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta DECIMAL(12,3);
BEGIN
  -- FIX 1: Adapted CASE for stock_movement_type enum values
  v_delta := CASE NEW.movement_type
    WHEN 'receipt' THEN NEW.quantity
    WHEN 'transfer_in' THEN NEW.quantity
    WHEN 'return_in' THEN NEW.quantity
    WHEN 'adjustment_up' THEN NEW.quantity
    WHEN 'issue' THEN -NEW.quantity
    WHEN 'transfer_out' THEN -NEW.quantity
    WHEN 'return_out' THEN -NEW.quantity
    WHEN 'write_off' THEN -NEW.quantity
    WHEN 'adjustment_down' THEN -NEW.quantity
    ELSE 0
  END;

  UPDATE public.inventory
  SET quantity_on_hand = quantity_on_hand + v_delta,
      updated_at = NOW()
  WHERE id = NEW.inventory_id AND tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_movement ON public.stock_movements;
CREATE TRIGGER trg_inventory_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.on_inventory_movement();

-- ============================================================================
-- 6. sync_search_index() -- AFTER INSERT OR UPDATE on multiple tables
--    Update search_index with searchable content
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_search_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_supplier_id UUID;
  v_title TEXT;
  v_content TEXT;
BEGIN
  v_customer_id := CASE TG_TABLE_NAME
    WHEN 'customers' THEN NEW.id
    WHEN 'orders' THEN NEW.customer_id
    WHEN 'quotes' THEN NEW.customer_id
    WHEN 'invoices' THEN NEW.customer_id
    WHEN 'deliveries' THEN (SELECT customer_id FROM orders WHERE id = NEW.order_id)
    ELSE NULL
  END;

  v_supplier_id := CASE TG_TABLE_NAME
    WHEN 'suppliers' THEN NEW.id
    WHEN 'supplier_pos' THEN NEW.supplier_id
    WHEN 'supplier_invoices' THEN NEW.supplier_id
    WHEN 'products' THEN (
      SELECT sp.supplier_id
      FROM supplier_po_items spi
      JOIN supplier_pos sp ON sp.id = spi.supplier_po_id
      WHERE spi.product_id = NEW.id
      ORDER BY sp.created_at DESC
      LIMIT 1
    )
    ELSE NULL
  END;

  v_title := COALESCE(
    CASE TG_TABLE_NAME
      WHEN 'customers' THEN NEW.company_name
      WHEN 'suppliers' THEN NEW.company_name
      WHEN 'products' THEN NEW.name
      ELSE NULL
    END,
    CASE
      WHEN TG_TABLE_NAME IN ('orders') THEN (SELECT order_number FROM orders WHERE id = NEW.id)
      WHEN TG_TABLE_NAME IN ('quotes') THEN (SELECT quote_number FROM quotes WHERE id = NEW.id)
      WHEN TG_TABLE_NAME IN ('invoices') THEN (SELECT invoice_number FROM invoices WHERE id = NEW.id)
      WHEN TG_TABLE_NAME IN ('deliveries') THEN (SELECT delivery_number FROM deliveries WHERE id = NEW.id)
      WHEN TG_TABLE_NAME IN ('supplier_pos') THEN (SELECT po_number FROM supplier_pos WHERE id = NEW.id)
      WHEN TG_TABLE_NAME IN ('supplier_invoices') THEN (SELECT invoice_number FROM supplier_invoices WHERE id = NEW.id)
      ELSE NULL
    END,
    NEW.id::TEXT
  );

  v_content := to_json(NEW)::TEXT;

  INSERT INTO public.search_index (
    entity_tenant_id, entity_type, entity_id,
    entity_customer_id, entity_supplier_id,
    display_title, display_subtitle, search_vector
  )
  VALUES (
    NEW.tenant_id, TG_TABLE_NAME, NEW.id,
    v_customer_id, v_supplier_id,
    v_title, v_content,
    to_tsvector('english', COALESCE(v_title, '') || ' ' || v_content)
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    display_title = EXCLUDED.display_title,
    display_subtitle = EXCLUDED.display_subtitle,
    search_vector = EXCLUDED.search_vector,
    entity_customer_id = EXCLUDED.entity_customer_id,
    entity_supplier_id = EXCLUDED.entity_supplier_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Search index triggers on multiple tables
DROP TRIGGER IF EXISTS trg_search_index_customers ON public.customers;
CREATE TRIGGER trg_search_index_customers
  AFTER INSERT OR UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_suppliers ON public.suppliers;
CREATE TRIGGER trg_search_index_suppliers
  AFTER INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_products ON public.products;
CREATE TRIGGER trg_search_index_products
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_orders ON public.orders;
CREATE TRIGGER trg_search_index_orders
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_quotes ON public.quotes;
CREATE TRIGGER trg_search_index_quotes
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_invoices ON public.invoices;
CREATE TRIGGER trg_search_index_invoices
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_deliveries ON public.deliveries;
CREATE TRIGGER trg_search_index_deliveries
  AFTER INSERT OR UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_supplier_pos ON public.supplier_pos;
CREATE TRIGGER trg_search_index_supplier_pos
  AFTER INSERT OR UPDATE ON public.supplier_pos
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

DROP TRIGGER IF EXISTS trg_search_index_supplier_invoices ON public.supplier_invoices;
CREATE TRIGGER trg_search_index_supplier_invoices
  AFTER INSERT OR UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_search_index();

-- ============================================================================
-- 7. on_new_driver_signup() -- BEFORE INSERT ON drivers
--    Create notification for ops, set 'pending_verification'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_new_driver_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL THEN
    NEW.status := 'pending_verification';
  END IF;

  -- FIX 2: notifications uses 'channel' not 'type'; FIX 3: role corrected from 'operations' to 'dispatcher'
  INSERT INTO public.notifications (tenant_id, user_id, channel, priority, title, body, entity_type, entity_id)
  SELECT NEW.tenant_id, ur.user_id, 'in_app', 'normal',
    'New Driver Signup',
    'Driver ' || NEW.first_name || ' ' || NEW.last_name || ' requires verification.',
    'driver', NEW.id
  FROM public.user_roles ur
  WHERE ur.tenant_id = NEW.tenant_id
    AND ur.role IN ('dispatcher', 'admin');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_driver_signup ON public.drivers;
CREATE TRIGGER trg_new_driver_signup
  BEFORE INSERT ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.on_new_driver_signup();

-- ============================================================================
-- 8. on_customer_created_start_onboarding() -- AFTER INSERT ON customers
--    Initialize 7-day onboarding sequence
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_customer_created_start_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq record;
  v_step record;
  v_start TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_seq FROM onboarding_sequences
  WHERE tenant_id = NEW.tenant_id AND target_type = 'customer' AND is_active = TRUE LIMIT 1;

  IF v_seq IS NOT NULL THEN
    FOR v_step IN SELECT * FROM onboarding_steps WHERE sequence_id = v_seq.id AND is_active = TRUE ORDER BY sort_order
    LOOP
      INSERT INTO customer_onboarding_progress (
        tenant_id, customer_id, sequence_id, step_id, status, scheduled_at, assigned_to
      ) VALUES (
        NEW.tenant_id, NEW.id, v_seq.id, v_step.id, 'scheduled',
        v_start + (v_step.delay_minutes || ' minutes')::interval,
        CASE WHEN v_step.assigned_role = 'sales_rep' THEN
          (SELECT id FROM employees WHERE id = NEW.assigned_sales_rep)
        ELSE NULL END
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_created_onboarding ON public.customers;
CREATE TRIGGER trg_customer_created_onboarding
  AFTER INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.on_customer_created_start_onboarding();

-- ============================================================================
-- 9. set_wind_sensitivity() -- BEFORE INSERT OR UPDATE OF category ON products
--    Auto-set is_wind_sensitive for sheet/panel materials (Khamsin weather)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_wind_sensitivity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_wind_sensitive := NEW.category::TEXT IN ('plywood', 'gypsum_board', 'roofing', 'glass', 'insulation');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_wind_sensitivity ON public.products;
CREATE TRIGGER trg_product_wind_sensitivity
  BEFORE INSERT OR UPDATE OF category ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_wind_sensitivity();

-- ============================================================================
-- 10. set_weather_blocking_flags() -- BEFORE INSERT OR UPDATE ON weather_alerts
--     Auto-set sheet_delivery_blocked and outdoor_ops_paused
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_weather_blocking_flags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.sheet_delivery_blocked := COALESCE(NEW.wind_speed_kmh, 0) > 30 OR COALESCE(NEW.wind_gust_kmh, 0) > 50;
  NEW.outdoor_ops_paused := NEW.severity = 'severe' OR COALESCE(NEW.wind_speed_kmh, 0) > 50 OR COALESCE(NEW.visibility_km, 10) < 1;

  IF COALESCE(NEW.wind_speed_kmh, 0) > 60 OR COALESCE(NEW.visibility_km, 10) < 0.5 THEN
    NEW.severity := 'severe';
  ELSIF COALESCE(NEW.wind_speed_kmh, 0) > 40 THEN
    NEW.severity := 'warning';
  ELSIF COALESCE(NEW.wind_speed_kmh, 0) > 30 THEN
    NEW.severity := 'advisory';
  ELSE
    NEW.severity := 'normal';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weather_set_blocking ON public.weather_alerts;
CREATE TRIGGER trg_weather_set_blocking
  BEFORE INSERT OR UPDATE ON public.weather_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_weather_blocking_flags();

-- ============================================================================
-- 11. prevent_lifo_costing() -- BEFORE INSERT OR UPDATE OF inventory_costing_method ON tenants
--     Block LIFO (prohibited under Egyptian law)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_lifo_costing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.inventory_costing_method::text = 'lifo' THEN
    RAISE EXCEPTION 'LIFO inventory costing is prohibited under Egyptian Accounting Standards (EAS). Use WAC or FIFO.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_lifo ON public.tenants;
CREATE TRIGGER trg_prevent_lifo
  BEFORE INSERT OR UPDATE OF inventory_costing_method ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.prevent_lifo_costing();

-- ============================================================================
-- 12. on_drop_ship_dispatched() -- AFTER UPDATE OF status ON deliveries
--     Auto-create drop_ship_pod record for supplier_direct deliveries
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_drop_ship_dispatched()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id UUID;
BEGIN
  IF NEW.shipping_method = 'supplier_direct'
     AND OLD.status != 'dispatched'
     AND NEW.status = 'dispatched' THEN

    SELECT supplier_id INTO v_supplier_id
    FROM supplier_pos
    WHERE id = NEW.supplier_po_id;

    INSERT INTO drop_ship_pod (
      tenant_id, delivery_id, supplier_id, order_id, customer_id,
      status, auto_confirm_deadline
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      COALESCE(v_supplier_id, (SELECT supplier_id FROM supplier_pos WHERE order_id = NEW.order_id LIMIT 1)),
      NEW.order_id,
      (SELECT customer_id FROM orders WHERE id = NEW.order_id),
      'awaiting_supplier_pod',
      NOW() + INTERVAL '72 hours'
    )
    ON CONFLICT (delivery_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drop_ship_dispatched ON public.deliveries;
CREATE TRIGGER trg_drop_ship_dispatched
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'dispatched' AND OLD.status != 'dispatched')
  EXECUTE FUNCTION public.on_drop_ship_dispatched();

-- ============================================================================
-- 13. auto_bypass_tier4_payment() -- BEFORE INSERT ON orders
--     Auto-set payment_instrument_verified for Tier 4 customers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_bypass_tier4_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier customer_tier;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT tier INTO v_tier
    FROM customers
    WHERE id = NEW.customer_id;

    IF v_tier = 'tier_4_preferred' THEN
      NEW.payment_instrument_verified := TRUE;
      NEW.payment_terms := 'net_30';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_tier4_bypass ON public.orders;
CREATE TRIGGER trg_order_tier4_bypass
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_bypass_tier4_payment();

-- ============================================================================
-- 14. check_exchange_rate_variance() -- BEFORE INSERT ON supplier_pos
--     Flag POs with >5% rate drift from quote
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_exchange_rate_variance()
RETURNS TRIGGER AS $$
DECLARE
  v_quote_rate      DECIMAL(18,8);
  v_threshold       DECIMAL(5,2);
  v_variance_pct    DECIMAL(5,2);
BEGIN
  IF NEW.source_currency = 'EGP' OR NEW.exchange_rate IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT q.exchange_rate INTO v_quote_rate
  FROM orders o
  JOIN quotes q ON q.id = o.quote_id
  WHERE o.id = NEW.order_id
    AND q.source_currency = NEW.source_currency
    AND q.exchange_rate IS NOT NULL
  LIMIT 1;

  IF v_quote_rate IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT (value::TEXT)::DECIMAL(5,2) INTO v_threshold
  FROM system_settings
  WHERE tenant_id = NEW.tenant_id
    AND category = 'procurement'
    AND key = 'exchange_rate_variance_threshold';

  IF v_threshold IS NULL THEN
    v_threshold := 5.0;
  END IF;

  v_variance_pct := ABS((NEW.exchange_rate - v_quote_rate) / v_quote_rate * 100);

  IF v_variance_pct > v_threshold THEN
    NEW.status := 'draft';
    NEW.internal_notes := COALESCE(NEW.internal_notes, '') ||
      E'\n[AUTO] Exchange rate variance ' || ROUND(v_variance_pct, 2) || '% exceeds threshold ' || v_threshold || '%. '
      || 'Quote rate: ' || v_quote_rate || ', PO rate: ' || NEW.exchange_rate || '. PO held in draft for procurement review.';

    INSERT INTO notifications (tenant_id, user_id, channel, priority, title, body, entity_type, entity_id, action_url)
    SELECT NEW.tenant_id, e.user_id, 'in_app', 'high',
           'Exchange Rate Variance Alert',
           'PO ' || NEW.po_number || ' has a ' || ROUND(v_variance_pct, 2) || '% rate variance vs. the original quote. Review required.',
           'supplier_po', NEW.id,
           '/procurement/pos/' || NEW.id
    FROM employees e
    WHERE e.tenant_id = NEW.tenant_id
      AND e.department = 'procurement';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_exchange_rate_variance ON public.supplier_pos;
CREATE TRIGGER trg_check_exchange_rate_variance
  BEFORE INSERT ON public.supplier_pos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_exchange_rate_variance();

-- ============================================================================
-- 15. generate_coded_delivery_reference() -- BEFORE INSERT ON supplier_pos
--     Auto-generate HQ-YYYY-NNNN coded delivery references
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_coded_delivery_reference()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
  v_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  IF NEW.coded_delivery_reference IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE sequence_counters
  SET current_value = current_value + 1
  WHERE tenant_id = NEW.tenant_id
    AND entity_type = 'coded_delivery'
    AND year = v_year
  RETURNING current_value INTO v_seq;

  IF v_seq IS NOT NULL THEN
    NEW.coded_delivery_reference := 'HQ-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_coded_delivery_reference ON public.supplier_pos;
CREATE TRIGGER trg_generate_coded_delivery_reference
  BEFORE INSERT ON public.supplier_pos
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_coded_delivery_reference();

-- ============================================================================
-- 16. on_po_confirmed_send_delivery_note() -- AFTER UPDATE ON supplier_pos
--     Queue delivery note generation on PO confirmation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_po_confirmed_send_delivery_note()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO notifications (tenant_id, user_id, channel, priority, title, body, entity_type, entity_id, metadata)
    SELECT NEW.tenant_id, NEW.created_by, 'system', 'high',
           'Delivery Note Ready to Send',
           'PO ' || NEW.po_number || ' confirmed. Delivery note for ' || COALESCE(NEW.coded_delivery_reference, 'N/A') || ' ready for dispatch.',
           'supplier_po', NEW.id,
           jsonb_build_object('action', 'generate_delivery_note', 'po_id', NEW.id, 'coded_ref', NEW.coded_delivery_reference);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_po_confirmed_send_delivery_note ON public.supplier_pos;
CREATE TRIGGER trg_on_po_confirmed_send_delivery_note
  AFTER UPDATE ON public.supplier_pos
  FOR EACH ROW
  EXECUTE FUNCTION public.on_po_confirmed_send_delivery_note();

-- ============================================================================
-- 17. set_dispute_sla_deadline() -- BEFORE INSERT ON invoice_disputes
--     Set 48h SLA + sync invoice status to 'disputed'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_dispute_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := NOW() + INTERVAL '48 hours';
  END IF;

  UPDATE invoices
  SET status = 'disputed',
      dispute_reason = NEW.dispute_reason::TEXT,
      disputed_at = NOW(),
      updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_dispute_sla_deadline ON public.invoice_disputes;
CREATE TRIGGER trg_set_dispute_sla_deadline
  BEFORE INSERT ON public.invoice_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_dispute_sla_deadline();
