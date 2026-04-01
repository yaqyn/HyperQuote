-- Migration 018: State Machine Validation + Enforcement Triggers
-- Handles 7 entity types: quote_request, quote, order, supplier_po, delivery, invoice, payment
-- Invalid state transitions are rejected by trigger before UPDATE commits

-- ============================================================================
-- Part 1: State Machine Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_state_transition(
  entity_type TEXT, old_status TEXT, new_status TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result BOOLEAN;
BEGIN
  IF old_status = new_status THEN RETURN TRUE; END IF;
  result := CASE entity_type
    WHEN 'quote_request' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('submitted', 'withdrawn', 'cancelled')
        WHEN 'submitted' THEN new_status IN ('under_review', 'withdrawn', 'cancelled')
        WHEN 'under_review' THEN new_status IN ('sourcing', 'on_hold', 'rejected', 'cancelled')
        WHEN 'sourcing' THEN new_status IN ('quote_ready', 'on_hold', 'cancelled')
        WHEN 'quote_ready' THEN FALSE
        WHEN 'on_hold' THEN new_status IN ('under_review', 'sourcing', 'cancelled')
        ELSE FALSE
      END
    WHEN 'quote' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('internal_review', 'cancelled')
        WHEN 'internal_review' THEN new_status IN ('pending_approval', 'draft', 'cancelled')
        WHEN 'pending_approval' THEN new_status IN ('approved', 'draft', 'cancelled')
        WHEN 'approved' THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent' THEN new_status IN ('viewed', 'negotiating', 'accepted', 'declined', 'expired')
        WHEN 'viewed' THEN new_status IN ('negotiating', 'accepted', 'declined', 'expired')
        WHEN 'negotiating' THEN new_status IN ('revised', 'accepted', 'declined', 'cancelled')
        WHEN 'revised' THEN new_status IN ('internal_review', 'sent', 'cancelled')
        WHEN 'declined' THEN new_status IN ('requires_re_quote')
        WHEN 'expired' THEN new_status IN ('requires_re_quote')
        WHEN 'requires_re_quote' THEN new_status IN ('draft')
        ELSE FALSE
      END
    WHEN 'order' THEN
      CASE old_status
        WHEN 'confirmed' THEN new_status IN ('processing', 'on_hold', 'cancellation_requested', 'cancelled')
        WHEN 'processing' THEN new_status IN ('partially_fulfilled', 'fulfilled', 'on_hold', 'back_ordered', 'cancellation_requested')
        WHEN 'partially_fulfilled' THEN new_status IN ('fulfilled', 'on_hold', 'back_ordered')
        WHEN 'fulfilled' THEN new_status IN ('completed')
        WHEN 'on_hold' THEN new_status IN ('confirmed', 'processing', 'cancelled')
        WHEN 'cancellation_requested' THEN new_status IN ('cancelled', 'processing')
        WHEN 'back_ordered' THEN new_status IN ('processing', 'on_hold', 'cancelled')
        ELSE FALSE
      END
    WHEN 'supplier_po' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent' THEN new_status IN ('confirmed', 'rejected', 'cancelled')
        WHEN 'confirmed' THEN new_status IN ('in_production', 'shipped', 'cancelled')
        WHEN 'in_production' THEN new_status IN ('shipped', 'cancelled')
        WHEN 'shipped' THEN new_status IN ('partially_received', 'received')
        WHEN 'partially_received' THEN new_status IN ('received')
        WHEN 'received' THEN new_status IN ('inspected')
        WHEN 'inspected' THEN new_status IN ('closed', 'received')
        ELSE FALSE
      END
    WHEN 'delivery' THEN
      CASE old_status
        WHEN 'scheduled' THEN new_status IN ('picking_loading', 'cancelled')
        WHEN 'picking_loading' THEN new_status IN ('dispatched', 'cancelled')
        WHEN 'dispatched' THEN new_status IN ('in_transit')
        WHEN 'in_transit' THEN new_status IN ('at_site', 'failed')
        WHEN 'at_site' THEN new_status IN ('delivered', 'partially_delivered', 'returned', 'failed')
        WHEN 'partially_delivered' THEN new_status IN ('rescheduled')
        WHEN 'failed' THEN new_status IN ('rescheduled')
        WHEN 'rescheduled' THEN new_status IN ('scheduled')
        ELSE FALSE
      END
    WHEN 'invoice' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent' THEN new_status IN ('viewed', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled')
        WHEN 'viewed' THEN new_status IN ('partially_paid', 'paid', 'overdue', 'disputed')
        WHEN 'partially_paid' THEN new_status IN ('paid', 'overdue', 'disputed')
        WHEN 'overdue' THEN new_status IN ('partially_paid', 'paid', 'collections', 'disputed', 'written_off')
        WHEN 'collections' THEN new_status IN ('partially_paid', 'paid', 'disputed', 'written_off')
        WHEN 'disputed' THEN new_status IN ('sent', 'adjusted', 'written_off')
        WHEN 'adjusted' THEN new_status IN ('sent', 'partially_paid', 'paid')
        ELSE FALSE
      END
    WHEN 'payment' THEN
      CASE old_status
        WHEN 'expected' THEN new_status IN ('received')
        WHEN 'received' THEN new_status IN ('matched', 'unmatched')
        WHEN 'matched' THEN new_status IN ('fully_applied', 'partially_applied', 'overpayment')
        WHEN 'unmatched' THEN new_status IN ('matched')
        WHEN 'partially_applied' THEN new_status IN ('fully_applied')
        WHEN 'overpayment' THEN new_status IN ('fully_applied', 'refunded')
        ELSE FALSE
      END
    ELSE NULL
  END CASE;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Unknown entity type: %', entity_type;
  END IF;

  RETURN result;
END;
$$;

-- ============================================================================
-- Part 2: Enforcement Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_entity_type TEXT;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'quote_requests' THEN 'quote_request'
    WHEN 'quotes' THEN 'quote'
    WHEN 'orders' THEN 'order'
    WHEN 'supplier_pos' THEN 'supplier_po'
    WHEN 'deliveries' THEN 'delivery'
    WHEN 'invoices' THEN 'invoice'
    WHEN 'payments' THEN 'payment'
    ELSE TG_TABLE_NAME
  END;
  IF NOT public.validate_state_transition(v_entity_type, OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid % status transition: % -> %', v_entity_type, OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Part 3: Apply Enforcement Triggers to All 7 State Machine Tables
-- ============================================================================

DROP TRIGGER IF EXISTS trg_quote_requests_state ON public.quote_requests;
CREATE TRIGGER trg_quote_requests_state BEFORE UPDATE OF status ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();

DROP TRIGGER IF EXISTS trg_quotes_state ON public.quotes;
CREATE TRIGGER trg_quotes_state BEFORE UPDATE OF status ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();

DROP TRIGGER IF EXISTS trg_orders_state ON public.orders;
CREATE TRIGGER trg_orders_state BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();

DROP TRIGGER IF EXISTS trg_supplier_pos_state ON public.supplier_pos;
CREATE TRIGGER trg_supplier_pos_state BEFORE UPDATE OF status ON public.supplier_pos FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();

DROP TRIGGER IF EXISTS trg_deliveries_state ON public.deliveries;
CREATE TRIGGER trg_deliveries_state BEFORE UPDATE OF status ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();

DROP TRIGGER IF EXISTS trg_invoices_state ON public.invoices;
CREATE TRIGGER trg_invoices_state BEFORE UPDATE OF status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();

DROP TRIGGER IF EXISTS trg_payments_state ON public.payments;
CREATE TRIGGER trg_payments_state BEFORE UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
