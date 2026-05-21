alter type public.audit_event_type add value if not exists 'internal_employee_created';
alter type public.audit_event_type add value if not exists 'internal_employee_role_assigned';
alter type public.audit_event_type add value if not exists 'internal_employee_role_removed';
