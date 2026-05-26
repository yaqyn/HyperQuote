alter type public.audit_event_type add value if not exists 'inventory_damage_recorded';
alter type public.audit_event_type add value if not exists 'inventory_damage_sold';
alter type public.audit_event_type add value if not exists 'inventory_damage_disposed';
alter type public.audit_event_type add value if not exists 'inventory_damage_reversed';

alter type public.finance_journal_source_type add value if not exists 'inventory_damage_lot';
alter type public.finance_journal_source_type add value if not exists 'inventory_damage_transaction';
