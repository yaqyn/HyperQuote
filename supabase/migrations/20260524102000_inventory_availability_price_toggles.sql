alter type public.audit_event_type
	add value if not exists 'inventory_availability_updated';

alter type public.audit_event_type
	add value if not exists 'inventory_price_marked_outdated';
