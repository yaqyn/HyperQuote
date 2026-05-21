alter type public.audit_event_type add value if not exists 'website_draft_saved';
alter type public.audit_event_type add value if not exists 'portal_draft_saved';
alter type public.audit_event_type add value if not exists 'customer_order_saved_as_draft';
alter type public.audit_event_type add value if not exists 'portal_order_viewed';
